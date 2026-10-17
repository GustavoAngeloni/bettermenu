"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { EMAIL, firstName, sendTemplate } from "@/lib/email";
import { createPasswordToken } from "@/lib/password-tokens";
import { appUrl } from "@/lib/qr";
import { createStaffUser, normalizeUsername, setStaffPassword } from "@/lib/staff-admin";
import { ROLE_LABEL } from "@/lib/types";
import { createAdminClient } from "@/lib/supabase/server";
import type { Profile, StaffRole } from "@/lib/types";

const ROLES: StaffRole[] = ["owner", "manager", "waiter", "kitchen"];

/** Só o dono cria/edita outros donos. Gerente gerencia garçons, cozinha e gerentes. */
function canManage(actorRole: StaffRole | null, targetRole: StaffRole) {
  return actorRole === "owner" || targetRole !== "owner";
}

async function loadTarget(restaurantId: string, userId: string) {
  const { data } = await createAdminClient().from("profiles").select("*").eq("id", userId).eq("restaurant_id", restaurantId).single<Profile>();
  return data;
}

export async function createStaff(_prev: string | null, form: FormData): Promise<string | null> {
  const { restaurant, profile } = await requireStaff(["manager"]);
  const role = String(form.get("role")) as StaffRole;
  if (!ROLES.includes(role) || !canManage(profile.role, role)) return "Papel inválido";
  const name = String(form.get("name") ?? "");
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return "E-mail inválido";
  const error = await createStaffUser({
    restaurantId: restaurant.id,
    slug: restaurant.slug,
    name,
    username: String(form.get("username") ?? ""),
    password: String(form.get("password") ?? ""),
    role,
    contactEmail: email || null,
  });
  if (error) return error;

  // Convite por e-mail: código, usuário e um link para a pessoa criar a própria senha (vale 72 horas)
  if (email) {
    const username = normalizeUsername(String(form.get("username") ?? ""));
    const { data: created } = await createAdminClient().from("profiles").select("id").eq("restaurant_id", restaurant.id).eq("username", username).maybeSingle();
    const token = created ? await createPasswordToken(created.id, "invite", 72 * 60) : null;
    const base = await appUrl();
    await sendTemplate(EMAIL.conviteEquipe, email, {
      NOME: firstName(name),
      RESTAURANTE: restaurant.name,
      FUNCAO: ROLE_LABEL[role],
      CODIGO: restaurant.slug,
      USUARIO: username,
      CONVIDADO_POR: firstName(profile.name),
      LINK_DEFINIR: token ? `${base}/redefinir-senha?token=${token}` : `${base}/login?codigo=${encodeURIComponent(restaurant.slug)}&usuario=${encodeURIComponent(username)}`,
      LINK_LOGIN: `${base}/login?codigo=${encodeURIComponent(restaurant.slug)}&usuario=${encodeURIComponent(username)}`,
    });
  }
  revalidatePath("/admin/equipe");
  return "ok";
}

export async function resetPassword(userId: string, password: string): Promise<string | null> {
  const { restaurant, profile } = await requireStaff(["manager"]);
  const target = await loadTarget(restaurant.id, userId);
  if (!target?.role || !canManage(profile.role, target.role)) return "Sem permissão";
  return setStaffPassword(userId, password);
}

export async function setActive(userId: string, active: boolean): Promise<string | null> {
  const { restaurant, profile } = await requireStaff(["manager"]);
  if (userId === profile.id) return "Você não pode desativar a si mesmo";
  const target = await loadTarget(restaurant.id, userId);
  if (!target?.role || !canManage(profile.role, target.role)) return "Sem permissão";
  const db = createAdminClient();
  await db.from("profiles").update({ active }).eq("id", userId);
  // Desativado: derruba a sessão e impede novo login.
  await db.auth.admin.updateUserById(userId, { ban_duration: active ? "none" : "876000h" });
  revalidatePath("/admin/equipe");
  return null;
}

export async function setSector(userId: string, sectorId: string | null): Promise<string | null> {
  const { restaurant, features } = await requireStaff(["manager"]);
  if (!features.sectors) return "Função desativada";
  const target = await loadTarget(restaurant.id, userId);
  if (!target) return "Sem permissão";
  await createAdminClient().from("profiles").update({ sector_id: sectorId }).eq("id", userId);
  revalidatePath("/admin/equipe");
  return null;
}
