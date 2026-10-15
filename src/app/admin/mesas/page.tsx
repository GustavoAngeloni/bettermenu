import { requireStaff } from "@/lib/auth";
import { appUrl, qrSvg, tableUrl } from "@/lib/qr";
import { createClient } from "@/lib/supabase/server";
import type { Sector, Table } from "@/lib/types";
import { TablesManager } from "./tables-manager";

export const metadata = { title: "Mesas" };

export default async function TablesPage() {
  const { restaurant, features } = await requireStaff(["manager"]);
  const supabase = await createClient();
  const [{ data: tables }, { data: open }, { data: sectors }] = await Promise.all([
    supabase.from("tables").select("*").eq("restaurant_id", restaurant.id).order("number"),
    supabase.from("table_sessions").select("table_id").eq("restaurant_id", restaurant.id).eq("status", "open"),
    supabase.from("sectors").select("*").eq("restaurant_id", restaurant.id).order("sort").order("name"),
  ]);
  const base = await appUrl();
  const busy = new Set(((open ?? []) as { table_id: string }[]).map((s) => s.table_id));

  const list = await Promise.all(
    ((tables ?? []) as Table[]).map(async (t) => {
      const url = tableUrl(base, t.qr_token);
      return { ...t, url, svg: await qrSvg(url), busy: busy.has(t.id) };
    }),
  );

  return (
    <TablesManager
      restaurantId={restaurant.id}
      tables={list}
      maxTables={restaurant.max_tables}
      sectors={features.sectors ? ((sectors ?? []) as Sector[]) : null}
    />
  );
}
