import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Category, ItemOption, MenuItem } from "./types";

/** Cardápio completo para as telas da equipe (lançar pedido, cozinha). */
export async function loadStaffMenu(supabase: SupabaseClient, restaurantId: string) {
  const [{ data: categories }, { data: items }, { data: options }] = await Promise.all([
    supabase.from("categories").select("*").eq("restaurant_id", restaurantId).order("sort").order("name"),
    supabase.from("menu_items").select("*").eq("restaurant_id", restaurantId).order("sort").order("name"),
    supabase.from("item_options").select("*").eq("restaurant_id", restaurantId).order("sort").order("name"),
  ]);
  return {
    categories: (categories ?? []) as Category[],
    items: (items ?? []) as MenuItem[],
    options: (options ?? []) as ItemOption[],
  };
}
