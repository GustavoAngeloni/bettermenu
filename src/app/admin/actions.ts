"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { IMPERSONATE_COOKIE, requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { listUnits } from "@/lib/units";

/** Dono com mais de um restaurante no plano: abre o painel de outra unidade do grupo. */
export async function switchUnit(unitId: string): Promise<string | void> {
  const { profile, restaurant, impersonating } = await requireStaff(["owner"]);
  if (profile.role !== "owner" || !restaurant) return "Só o dono troca de unidade";
  const units = await listUnits(restaurant);
  if (!units.some((u) => u.id === unitId)) return "Unidade não encontrada";

  if (impersonating) {
    // Suporte (super admin): troca o restaurante aberto no "Entrar como".
    (await cookies()).set(IMPERSONATE_COOKIE, unitId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 8 });
  } else {
    const { error } = await createAdminClient().from("profiles").update({ restaurant_id: unitId }).eq("id", profile.id);
    if (error) return error.code === "23505" ? "Já existe alguém com o seu usuário nessa unidade. Fale com o suporte." : "Não foi possível trocar de unidade";
  }
  redirect("/admin");
}
