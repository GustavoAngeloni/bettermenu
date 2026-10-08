"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Guest, OrderItem, OrderItemShare, Table, TableSession, WaiterCall } from "./types";

/** Tudo o que está acontecendo no salão agora (mesas abertas). */
export interface FloorData {
  tables: Table[];
  sessions: TableSession[];
  guests: Guest[];
  items: OrderItem[];
  shares: OrderItemShare[];
  calls: WaiterCall[];
}

export async function loadFloor(supabase: SupabaseClient, restaurantId: string): Promise<FloorData> {
  const [{ data: tables }, { data: sessions }, { data: calls }] = await Promise.all([
    supabase.from("tables").select("*").eq("restaurant_id", restaurantId).eq("active", true).order("number"),
    supabase.from("table_sessions").select("*").eq("restaurant_id", restaurantId).eq("status", "open"),
    supabase.from("waiter_calls").select("*").eq("restaurant_id", restaurantId).eq("status", "open").order("created_at"),
  ]);
  const sessionIds = ((sessions ?? []) as TableSession[]).map((s) => s.id);
  if (sessionIds.length === 0) {
    return { tables: (tables ?? []) as Table[], sessions: [], guests: [], items: [], shares: [], calls: [] };
  }

  const [{ data: guests }, { data: items }] = await Promise.all([
    supabase.from("guests").select("id, session_id, name, paid_at, created_at, payment_method, paid_cents").in("session_id", sessionIds).order("created_at"),
    supabase.from("order_items").select("*").in("session_id", sessionIds).order("created_at"),
  ]);
  const customIds = ((items ?? []) as OrderItem[]).filter((i) => i.share_mode === "custom").map((i) => i.id);
  const { data: shares } = customIds.length
    ? await supabase.from("order_item_shares").select("order_item_id, guest_id").in("order_item_id", customIds)
    : { data: [] };

  return {
    tables: (tables ?? []) as Table[],
    sessions: (sessions ?? []) as TableSession[],
    guests: (guests ?? []) as Guest[],
    items: (items ?? []) as OrderItem[],
    shares: (shares ?? []) as OrderItemShare[],
    calls: ((calls ?? []) as WaiterCall[]).filter((c) => sessionIds.includes(c.session_id)),
  };
}
