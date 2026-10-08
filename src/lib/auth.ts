import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { resolveFeatures, type FeatureKey, type Features } from "./features";
import { createClient } from "./supabase/server";
import type { Profile, Restaurant, StaffRole } from "./types";

/** Cookie com o restaurante que o super admin está acessando ("Entrar como"). */
export const IMPERSONATE_COOKIE = "bm_as";

/** Equipe não tem email: geramos um email interno a partir do restaurante + usuário. */
export function staffEmail(slug: string, username: string) {
  return `${username.trim().toLowerCase()}@${slug.trim().toLowerCase()}.staff.bettermenu.app`;
}

export function homeFor(profile: Pick<Profile, "is_superadmin" | "role">): string {
  if (profile.is_superadmin) return "/super";
  switch (profile.role) {
    case "owner":
    case "manager":
      return "/admin";
    case "waiter":
      return "/garcom";
    case "kitchen":
      return "/cozinha";
    default:
      return "/login";
  }
}

export interface StaffContext {
  userId: string;
  profile: Profile;
  restaurant: Restaurant | null;
  features: Features;
  /** Super admin acessando um restaurante pelo "Entrar como". */
  impersonating: boolean;
}

/**
 * Usuário logado + perfil + restaurante, em uma única consulta.
 * `cache` reaproveita o resultado dentro da mesma requisição (layout + página).
 */
export const getStaff = cache(async (): Promise<StaffContext | null> => {
  const supabase = await createClient();
  // Valida o JWT localmente; o bloqueio de usuários desativados vem de profile.active.
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*, restaurant:restaurants(*)")
    .eq("id", userId)
    .single<Profile & { restaurant: Restaurant | null }>();
  if (!data || !data.active) return null;

  let { restaurant, ...profile } = data;
  let impersonating = false;

  // Super admin com "Entrar como": age como dono daquele restaurante.
  if (profile.is_superadmin) {
    const asId = (await cookies()).get(IMPERSONATE_COOKIE)?.value;
    if (asId) {
      const { data: target } = await supabase.from("restaurants").select("*").eq("id", asId).maybeSingle<Restaurant>();
      if (target) {
        restaurant = target;
        profile = { ...profile, role: "owner", restaurant_id: target.id };
        impersonating = true;
      }
    }
  }

  return { userId, profile, restaurant, features: resolveFeatures(restaurant?.features), impersonating };
});

/**
 * Garante que o usuário logado tem um dos papéis exigidos.
 * Dono e gerente podem abrir todas as telas do restaurante.
 */
export async function requireStaff(roles: StaffRole[]): Promise<StaffContext & { restaurant: Restaurant }> {
  const ctx = await getStaff();
  if (!ctx) redirect("/login");
  const { profile, restaurant } = ctx;
  const allowed = profile.role && (roles.includes(profile.role) || profile.role === "owner" || profile.role === "manager");
  if (!restaurant || !allowed) redirect(homeFor(profile));
  if (!restaurant.active && !ctx.impersonating) redirect("/login?erro=inativo");
  return { ...ctx, restaurant };
}

/** Para server actions: recusa se a função estiver desligada no restaurante. */
export function assertFeature(features: Features, key: FeatureKey) {
  if (!features[key]) throw new Error("Função desativada para este restaurante");
}

export async function requireSuperadmin(): Promise<StaffContext> {
  const ctx = await getStaff();
  if (!ctx) redirect("/login");
  if (!ctx.profile.is_superadmin) redirect(homeFor(ctx.profile));
  return ctx;
}
