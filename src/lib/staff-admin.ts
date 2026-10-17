import "server-only";
import { staffEmail } from "./auth";
import { createAdminClient } from "./supabase/server";
import type { StaffRole } from "./types";

export function normalizeUsername(input: string) {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9._-]/g, "");
}

export function slugify(input: string) {
  return normalizeUsername(input.replace(/\s+/g, "-")).replace(/[._]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

/** Cria um login da equipe (Supabase Auth + profile). Retorna mensagem de erro ou null. */
export async function createStaffUser(input: {
  restaurantId: string;
  slug: string;
  name: string;
  username: string;
  password: string;
  role: StaffRole;
  /** e-mail real da pessoa (recebe convite e recuperação de senha) */
  contactEmail?: string | null;
}): Promise<string | null> {
  const username = normalizeUsername(input.username);
  if (!input.name.trim()) return "Informe o nome";
  if (username.length < 2) return "Usuário deve ter ao menos 2 letras (sem espaços)";
  if (input.password.length < 6) return "A senha deve ter ao menos 6 caracteres";

  const db = createAdminClient();
  const { data: exists } = await db.from("profiles").select("id").eq("restaurant_id", input.restaurantId).eq("username", username).maybeSingle();
  if (exists) return `O usuário "${username}" já existe`;

  const { data, error } = await db.auth.admin.createUser({
    email: staffEmail(input.slug, username),
    password: input.password,
    email_confirm: true,
  });
  if (error || !data.user) return error?.message ?? "Erro ao criar usuário";

  const { error: profileError } = await db.from("profiles").insert({
    id: data.user.id,
    restaurant_id: input.restaurantId,
    name: input.name.trim(),
    username,
    role: input.role,
  });
  if (profileError) {
    await db.auth.admin.deleteUser(data.user.id);
    return profileError.message;
  }
  const contact = input.contactEmail?.trim().toLowerCase();
  // coluna do schema v6; sem a migração, o login é criado do mesmo jeito
  if (contact && /^\S+@\S+\.\S+$/.test(contact)) await db.from("profiles").update({ contact_email: contact }).eq("id", data.user.id);
  return null;
}

export async function setStaffPassword(userId: string, password: string): Promise<string | null> {
  if (password.length < 6) return "A senha deve ter ao menos 6 caracteres";
  const { error } = await createAdminClient().auth.admin.updateUserById(userId, { password });
  return error?.message ?? null;
}
