import { BrandScope } from "@/components/brand";
import { ShiftGate } from "@/components/shift-gate";
import { StaffHeader } from "@/components/staff-header";
import { requireStaff } from "@/lib/auth";
import { loadStaffMenu } from "@/lib/staff-menu";
import { createClient } from "@/lib/supabase/server";
import type { Sector } from "@/lib/types";
import { WaiterApp } from "./waiter-app";

export const metadata = { title: "Garçom · Better Menu" };

export default async function WaiterPage() {
  const { restaurant, profile, impersonating, features } = await requireStaff(["waiter"]);
  const supabase = await createClient();
  const [menu, { data: sectors }] = await Promise.all([
    features.waiter_ordering ? loadStaffMenu(supabase, restaurant.id) : Promise.resolve({ categories: [], items: [], options: [] }),
    features.sectors
      ? supabase.from("sectors").select("*").eq("restaurant_id", restaurant.id).order("sort").order("name")
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <BrandScope branding={restaurant.branding}>
      <StaffHeader restaurant={restaurant} profile={profile} impersonating={impersonating} title="Salão" />
      <ShiftGate role="chamados e pedidos prontos">
        <WaiterApp
          restaurantId={restaurant.id}
          serviceFeePct={Number(restaurant.service_fee_pct)}
          userId={profile.id}
          role={profile.role}
          features={features}
          menu={menu}
          sectors={(sectors ?? []) as Sector[]}
          mySectorId={profile.sector_id}
        />
      </ShiftGate>
    </BrandScope>
  );
}
