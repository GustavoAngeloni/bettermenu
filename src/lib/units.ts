import "server-only";
import { createAdminClient } from "./supabase/server";
import type { Restaurant } from "./types";

export interface Unit {
  id: string;
  name: string;
}

/** Unidades do mesmo grupo (principal + filiais ativas), para o dono trocar no painel. */
export async function listUnits(restaurant: Pick<Restaurant, "id" | "group_id">): Promise<Unit[]> {
  const root = restaurant.group_id ?? restaurant.id;
  const { data, error } = await createAdminClient()
    .from("restaurants")
    .select("id, name")
    .or(`id.eq.${root},group_id.eq.${root}`)
    .eq("active", true)
    .order("created_at");
  // Banco sem a coluna group_id (schema v4 pendente): só a própria unidade.
  if (error) return [];
  return (data ?? []) as Unit[];
}
