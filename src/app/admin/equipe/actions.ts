"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createStaffUser, setStaffPassword } from "@/lib/staff-admin";
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
  const error = await createStaffUser({
    restaurantId: restaurant.id,
    slug: restaurant.slug,
    name: String(form.get("name") ?? ""),
    username: String(form.get("username") ?? ""),
    password: String(form.get("password") ?? ""),
    role,
  });
  if (!error) revalidatePath("/admin/equipe");
  return error ?? "ok";
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
