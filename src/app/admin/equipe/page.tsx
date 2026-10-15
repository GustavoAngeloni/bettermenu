import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Sector } from "@/lib/types";
import { StaffManager } from "./staff-manager";

export const metadata = { title: "Equipe" };

export default async function StaffPage() {
  const { restaurant, profile, features } = await requireStaff(["manager"]);
  const supabase = await createClient();
  const [{ data }, { data: sectors }] = await Promise.all([
    supabase.from("profiles").select("*").eq("restaurant_id", restaurant.id).order("role").order("name"),
    features.sectors ? supabase.from("sectors").select("*").eq("restaurant_id", restaurant.id).order("sort") : Promise.resolve({ data: [] }),
  ]);

  return <StaffManager staff={(data ?? []) as Profile[]} me={profile} slug={restaurant.slug} sectors={(sectors ?? []) as Sector[]} />;
}
