"use server";

import { assertFeature, requireStaff } from "@/lib/auth";
import { notifyFloor } from "@/lib/push";
import { createAdminClient } from "@/lib/supabase/server";

/** Cozinha marca um prato como esgotado (ou de volta ao cardápio). */
export async function setAvailability(itemId: string, available: boolean): Promise<{ ok: boolean; error?: string }> {
  try {
    const { restaurant, features } = await requireStaff(["kitchen"]);
    assertFeature(features, "kitchen_soldout");
    const { error } = await createAdminClient().from("menu_items").update({ available }).eq("id", itemId).eq("restaurant_id", restaurant.id);
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Avisa o salão (Web Push) que pratos ficaram prontos. */
export async function notifyReady(itemIds: string[]): Promise<void> {
  const { restaurant, features } = await requireStaff(["kitchen"]);
  if (!features.push || !itemIds.length) return;
  const db = createAdminClient();
  const { data } = await db
    .from("order_items")
    .select("name, qty, table_id, table:tables(number), guest:guests(name)")
    .eq("restaurant_id", restaurant.id)
    .in("id", itemIds.slice(0, 50));
  const rows = (data ?? []) as unknown as { name: string; qty: number; table_id: string; table: { number: number } | null; guest: { name: string } | null }[];
  const byTable = new Map<string, typeof rows>();
  for (const r of rows) byTable.set(r.table_id, [...(byTable.get(r.table_id) ?? []), r]);
  await Promise.all(
    [...byTable.entries()].map(([tableId, list]) =>
      notifyFloor(restaurant.id, tableId, {
        title: `Mesa ${list[0].table?.number ?? "?"} · pronto para servir`,
        body: list.map((r) => `${r.qty}× ${r.name}${r.guest ? ` (${r.guest.name})` : ""}`).join(", "),
        tag: `ready-${tableId}`,
      }),
    ),
  );
}
