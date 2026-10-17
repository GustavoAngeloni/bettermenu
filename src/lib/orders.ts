import "server-only";
import type { Features } from "./features";
import { effectivePrice, isCategoryOpen, localNow } from "./menu-rules";
import { createAdminClient } from "./supabase/server";
import type { Category, ItemOption, MenuItem } from "./types";

export interface CartLine {
  menu_item_id: string;
  qty: number;
  option_ids?: string[];
  note?: string;
  /** "me" | "all" | lista de ids dos clientes que dividem (inclui quem pediu) */
  share?: "me" | "all" | string[];
}

export interface CreateOrderInput {
  restaurantId: string;
  features: Features;
  sessionId: string;
  tableId: string;
  guestId: string;
  lines: CartLine[];
  /** Garçom que lançou (null = pedido feito pelo cliente) */
  createdBy: string | null;
}

/**
 * Cria um pedido validando tudo no servidor: item existe e está disponível,
 * categoria aberta no horário, preço de happy hour, estoque (baixa atômica),
 * combos e divisão entre pessoas. Usado pelo cliente (QR) e pelo garçom.
 */
export async function createOrder(input: CreateOrderInput): Promise<{ ok: true; orderId: string } | { ok: false; error: string }> {
  const { restaurantId, features, sessionId, tableId, guestId, createdBy } = input;
  const lines = input.lines.slice(0, 50);
  if (lines.length === 0) return { ok: false, error: "Pedido vazio" };

  const db = createAdminClient();
  const itemIds = [...new Set(lines.map((l) => l.menu_item_id))];
  const [{ data: menuItems }, { data: options }, { data: categories }, { data: guests }] = await Promise.all([
    db.from("menu_items").select("*").eq("restaurant_id", restaurantId).in("id", itemIds),
    db.from("item_options").select("*").eq("restaurant_id", restaurantId).in("menu_item_id", itemIds),
    db.from("categories").select("*").eq("restaurant_id", restaurantId),
    db.from("guests").select("id").eq("session_id", sessionId),
  ]);
  const itemsById = new Map(((menuItems ?? []) as MenuItem[]).map((i) => [i.id, i]));
  const optionsById = new Map(((options ?? []) as ItemOption[]).map((o) => [o.id, o]));
  const categoryById = new Map(((categories ?? []) as Category[]).map((c) => [c.id, c]));
  const sessionGuestIds = new Set(((guests ?? []) as { id: string }[]).map((g) => g.id));
  const now = localNow();

  const orderId = crypto.randomUUID();
  const rows = [];
  const shareRows = [];
  const stockToConsume = new Map<string, number>();

  for (const line of lines) {
    const menuItem = itemsById.get(line.menu_item_id);
    if (!menuItem) return { ok: false, error: "Item não encontrado no cardápio" };
    if (!menuItem.available) return { ok: false, error: `"${menuItem.name}" está esgotado` };
    const category = categoryById.get(menuItem.category_id);
    if (category && !isCategoryOpen(category, features.scheduled_menu, now)) {
      return { ok: false, error: `"${menuItem.name}" não está disponível neste horário` };
    }

    const qty = Math.min(Math.max(Math.trunc(Number(line.qty) || 1), 1), 50);
    const chosen = [...new Set(line.option_ids ?? [])]
      .map((id) => optionsById.get(id))
      .filter((o): o is ItemOption => !!o && o.menu_item_id === menuItem.id);
    const base = effectivePrice(menuItem, features.scheduled_menu, now).price;
    const unitPrice = base + chosen.reduce((sum, o) => sum + o.price_cents, 0);

    let shareMode: "me" | "all" | "custom" = "me";
    let shareGuests: string[] = [];
    if (features.item_sharing) {
      if (line.share === "all") {
        // Dinâmico: divide entre todos que estiverem na mesa na hora da conta,
        // inclusive quem entrar depois (ex.: pediu o vinho antes dos amigos chegarem).
        shareMode = "all";
      } else if (Array.isArray(line.share)) {
        shareGuests = [...new Set([guestId, ...line.share])].filter((id) => sessionGuestIds.has(id));
        if (shareGuests.length > 1) shareMode = "custom";
      }
    }

    const combo = features.combos ? (menuItem.combo_items ?? []) : [];
    if (features.stock) {
      stockToConsume.set(menuItem.id, (stockToConsume.get(menuItem.id) ?? 0) + qty);
      for (const c of combo) stockToConsume.set(c.menu_item_id, (stockToConsume.get(c.menu_item_id) ?? 0) + c.qty * qty);
    }

    const id = crypto.randomUUID();
    rows.push({
      id,
      restaurant_id: restaurantId,
      order_id: orderId,
      session_id: sessionId,
      table_id: tableId,
      guest_id: guestId,
      menu_item_id: menuItem.id,
      station_id: category?.station_id ?? null,
      name: menuItem.name,
      options: chosen.map((o) => ({ name: o.name, price_cents: o.price_cents })),
      unit_price_cents: unitPrice,
      qty,
      note: (line.note ?? "").trim().slice(0, 200) || null,
      share_mode: shareMode,
      created_by: createdBy,
      combo_items: combo,
      // custo da porção no momento do pedido (o lucro do passado não muda se o custo mudar)
      ...(features.finance && menuItem.cost_cents != null ? { unit_cost_cents: menuItem.cost_cents } : {}),
    });
    if (shareMode === "custom") {
      shareRows.push(...shareGuests.map((guest_id) => ({ order_item_id: id, guest_id, restaurant_id: restaurantId })));
    }
  }

  // Estoque: baixa atômica; se faltar algo, devolve o que já foi baixado.
  const consumed: [string, number][] = [];
  for (const [itemId, n] of stockToConsume) {
    const { data: ok } = await db.rpc("consume_stock", { p_item: itemId, p_qty: n });
    if (!ok) {
      await Promise.all(consumed.map(([id, q]) => db.rpc("restore_stock", { p_item: id, p_qty: q })));
      const name = itemsById.get(itemId)?.name ?? "Um item";
      return { ok: false, error: `${name}: estoque insuficiente` };
    }
    consumed.push([itemId, n]);
  }

  const { error: orderError } = await db
    .from("orders")
    .insert({ id: orderId, restaurant_id: restaurantId, session_id: sessionId, table_id: tableId, guest_id: guestId });
  let { error: itemsError } = orderError ? { error: orderError } : await db.from("order_items").insert(rows);
  // Banco sem a coluna unit_cost_cents (schema v4 pendente): grava o pedido sem o custo.
  if (!orderError && itemsError && /unit_cost_cents/.test(itemsError.message)) {
    ({ error: itemsError } = await db.from("order_items").insert(rows.map(({ unit_cost_cents: _c, ...r }: { unit_cost_cents?: number }) => r)));
  }
  if (orderError || itemsError) {
    await db.from("orders").delete().eq("id", orderId);
    await Promise.all(consumed.map(([id, q]) => db.rpc("restore_stock", { p_item: id, p_qty: q })));
    return { ok: false, error: "Não foi possível enviar o pedido" };
  }
  if (shareRows.length) await db.from("order_item_shares").insert(shareRows);
  return { ok: true, orderId };
}

/** Cancela itens devolvendo o estoque (inclusive componentes de combos). */
export async function cancelItems(restaurantId: string, itemIds: string[], reason: string, restoreStock: boolean) {
  const db = createAdminClient();
  const { data } = await db
    .from("order_items")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString(), cancel_reason: reason })
    .eq("restaurant_id", restaurantId)
    .in("id", itemIds)
    .neq("status", "cancelled")
    .select("menu_item_id, qty, combo_items");
  if (restoreStock) {
    for (const row of (data ?? []) as { menu_item_id: string | null; qty: number; combo_items: { menu_item_id: string; qty: number }[] }[]) {
      if (row.menu_item_id) await db.rpc("restore_stock", { p_item: row.menu_item_id, p_qty: row.qty });
      for (const c of row.combo_items ?? []) await db.rpc("restore_stock", { p_item: c.menu_item_id, p_qty: c.qty * row.qty });
    }
  }
  return (data ?? []).length;
}
