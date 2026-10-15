import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Category, ItemOption, MenuItem, Station } from "@/lib/types";
import { MenuEditor } from "./menu-editor";

export const metadata = { title: "Cardápio" };

export default async function MenuPage() {
  const { restaurant, features } = await requireStaff(["manager"]);
  const supabase = await createClient();
  const [{ data: stations }, { data: categories }, { data: items }, { data: options }] = await Promise.all([
    supabase.from("stations").select("*").eq("restaurant_id", restaurant.id).order("sort").order("name"),
    supabase.from("categories").select("*").eq("restaurant_id", restaurant.id).order("sort").order("name"),
    supabase.from("menu_items").select("*").eq("restaurant_id", restaurant.id).order("sort").order("name"),
    supabase.from("item_options").select("*").eq("restaurant_id", restaurant.id).order("sort").order("name"),
  ]);

  return (
    <MenuEditor
      restaurantId={restaurant.id}
      stations={(stations ?? []) as Station[]}
      categories={(categories ?? []) as Category[]}
      items={(items ?? []) as MenuItem[]}
      options={(options ?? []) as ItemOption[]}
      features={features}
    />
  );
}
