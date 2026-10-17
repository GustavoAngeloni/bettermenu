import "server-only";
import { PLANS, type PlanKey } from "./plans";
import { createStaffUser, slugify } from "./staff-admin";
import { createAdminClient } from "./supabase/server";

/** Código livre a partir do nome ("cantina-da-nonna", "cantina-da-nonna-2"...). */
export async function freeSlug(base: string) {
  const db = createAdminClient();
  const root = slugify(base).slice(0, 40) || "restaurante";
  for (let i = 1; i < 50; i++) {
    const slug = i === 1 ? root : `${root}-${i}`;
    const { data } = await db.from("restaurants").select("id").eq("slug", slug).maybeSingle();
    if (!data) return slug;
  }
  return `${root}-${Date.now().toString(36)}`;
}

/**
 * Cria um restaurante pronto para uso: plano e limites, login do dono, estações e mesas.
 * Usado pelo super admin e pela assinatura paga no checkout. Em caso de erro, desfaz tudo.
 */
export async function provisionRestaurant(input: {
  name: string;
  slug: string;
  plan: PlanKey;
  ownerName: string;
  ownerUsername: string;
  ownerPassword: string;
  tables?: number;
  serviceFeePct?: number;
  features?: Record<string, boolean>;
  maxTables?: number | null;
  maxStations?: number | null;
  paidUntil?: string | null;
}): Promise<{ ok: true; restaurantId: string; slug: string } | { ok: false; error: string }> {
  const db = createAdminClient();
  const limits = PLANS[input.plan];
  const maxTables = input.maxTables === undefined ? limits.maxTables : input.maxTables;
  const maxStations = input.maxStations === undefined ? limits.maxStations : input.maxStations;

  const { data: restaurant, error } = await db
    .from("restaurants")
    .insert({
      name: input.name,
      slug: input.slug,
      service_fee_pct: input.serviceFeePct ?? 10,
      features: input.features ?? {},
      plan: input.plan,
      max_tables: maxTables,
      max_stations: maxStations,
      paid_until: input.paidUntil ?? null,
    })
    .select("id")
    .single();
  if (error || !restaurant) return { ok: false, error: error?.message ?? "Erro ao criar restaurante" };

  const ownerError = await createStaffUser({
    restaurantId: restaurant.id,
    slug: input.slug,
    name: input.ownerName,
    username: input.ownerUsername,
    password: input.ownerPassword,
    role: "owner",
  });
  if (ownerError) {
    await db.from("restaurants").delete().eq("id", restaurant.id);
    return { ok: false, error: `Dono: ${ownerError}` };
  }

  const stations = maxStations === 1 ? [{ name: "Cozinha", sort: 0 }] : [{ name: "Cozinha", sort: 0 }, { name: "Bar", sort: 1 }];
  await db.from("stations").insert(stations.map((s) => ({ ...s, restaurant_id: restaurant.id })));
  let tables = Math.min(Math.max(input.tables ?? 0, 0), 200);
  if (maxTables != null) tables = Math.min(tables, maxTables);
  if (tables > 0) await db.from("tables").insert(Array.from({ length: tables }, (_, i) => ({ restaurant_id: restaurant.id, number: i + 1 })));
  return { ok: true, restaurantId: restaurant.id, slug: input.slug };
}
