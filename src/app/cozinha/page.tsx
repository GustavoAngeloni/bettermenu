import { ShiftGate } from "@/components/shift-gate";
import { StaffHeader } from "@/components/staff-header";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Station } from "@/lib/types";
import { KitchenApp, type KitchenMenuItem } from "./kitchen-app";

export const metadata = { title: "Cozinha · Better Menu" };

export default async function KitchenPage() {
  const { restaurant, profile, impersonating, features } = await requireStaff(["kitchen"]);
  const supabase = await createClient();
  const [{ data: stations }, { data: items }] = await Promise.all([
    supabase.from("stations").select("*").eq("restaurant_id", restaurant.id).order("sort").order("name"),
    features.kitchen_soldout
      ? supabase.from("menu_items").select("id, name, available, category:categories(name, sort)").eq("restaurant_id", restaurant.id).order("name")
      : Promise.resolve({ data: [] }),
  ]);

  const menuItems: KitchenMenuItem[] = ((items ?? []) as unknown as { id: string; name: string; available: boolean; category: { name: string; sort: number } | null }[])
    .map((i) => ({ id: i.id, name: i.name, available: i.available, category: i.category?.name ?? "", sort: i.category?.sort ?? 0 }))
    .sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));

  return (
    <div className="flex flex-1 flex-col bg-stone-950 text-white">
      <StaffHeader restaurant={restaurant} profile={profile} impersonating={impersonating} title="Cozinha" dark />
      <ShiftGate role="novos pedidos">
        <KitchenApp
          restaurantId={restaurant.id}
          restaurantName={restaurant.name}
          stations={(stations ?? []) as Station[]}
          features={features}
          menuItems={menuItems}
        />
      </ShiftGate>
    </div>
  );
}
