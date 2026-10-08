"use server";

import { assertFeature, requireStaff } from "@/lib/auth";
import { computeBill } from "@/lib/bill";
import { cancelItems, createOrder, type CartLine } from "@/lib/orders";
import { createAdminClient } from "@/lib/supabase/server";
import type { Guest, OrderItem, OrderItemShare, PaymentMethod, TableSession } from "@/lib/types";

type Result = { ok: true } | { ok: false; error: string };

const fail = (error: unknown): Result => ({ ok: false, error: error instanceof Error ? error.message : String(error) });

/** Sessão aberta da mesa; abre uma nova se a mesa estiver livre. */
async function openSessionFor(restaurantId: string, tableId: string): Promise<TableSession> {
  const db = createAdminClient();
  const { data: table } = await db.from("tables").select("id").eq("id", tableId).eq("restaurant_id", restaurantId).eq("active", true).maybeSingle();
  if (!table) throw new Error("Mesa não encontrada");
  const find = () => db.from("table_sessions").select("*").eq("table_id", tableId).eq("status", "open").maybeSingle<TableSession>();
  const { data: open } = await find();
  if (open) return open;
  const { data, error } = await db.from("table_sessions").insert({ restaurant_id: restaurantId, table_id: tableId }).select().single<TableSession>();
  if (data) return data;
  if (error?.code === "23505") return (await find()).data!;
  throw new Error("Não foi possível abrir a mesa");
}

async function sessionOf(restaurantId: string, sessionId: string) {
  const { data } = await createAdminClient()
    .from("table_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("restaurant_id", restaurantId)
    .eq("status", "open")
    .maybeSingle<TableSession>();
  if (!data) throw new Error("Mesa já foi fechada");
  return data;
}

/** Garçom lança pedido para alguém da mesa (ou para um novo cliente). */
export async function waiterOrder(input: { tableId: string; guestId?: string; newGuestName?: string; lines: CartLine[] }): Promise<Result> {
  try {
    const { restaurant, profile, features } = await requireStaff(["waiter"]);
    assertFeature(features, "waiter_ordering");
    const db = createAdminClient();
    const session = await openSessionFor(restaurant.id, input.tableId);

    let guestId = input.guestId;
    if (guestId) {
      const { data } = await db.from("guests").select("id").eq("id", guestId).eq("session_id", session.id).maybeSingle();
      if (!data) throw new Error("Cliente não está nesta mesa");
    } else {
      const { count } = await db.from("guests").select("id", { count: "exact", head: true }).eq("session_id", session.id);
      const name = (input.newGuestName ?? "").trim().replace(/\s+/g, " ").slice(0, 30) || `Cliente ${(count ?? 0) + 1}`;
      const { data, error } = await db
        .from("guests")
        .insert({ restaurant_id: restaurant.id, session_id: session.id, name })
        .select("id")
        .single();
      if (error || !data) throw new Error("Não foi possível adicionar o cliente");
      guestId = data.id as string;
    }

    const result = await createOrder({
      restaurantId: restaurant.id,
      features,
      sessionId: session.id,
      tableId: input.tableId,
      guestId: guestId!,
      lines: input.lines,
      createdBy: profile.id,
    });
    return result.ok ? { ok: true } : result;
  } catch (e) {
    return fail(e);
  }
}

/**
 * Transfere a mesa. Se a mesa de destino estiver livre, só muda o número.
 * Se estiver ocupada, junta as duas contas na mesa de destino.
 */
export async function transferTable(sessionId: string, toTableId: string): Promise<Result & { merged?: boolean }> {
  try {
    const { restaurant, profile, features } = await requireStaff(["waiter"]);
    assertFeature(features, "table_transfer");
    const db = createAdminClient();
    const from = await sessionOf(restaurant.id, sessionId);
    if (from.table_id === toTableId) return { ok: true };
    const { data: target } = await db.from("tables").select("id").eq("id", toTableId).eq("restaurant_id", restaurant.id).eq("active", true).maybeSingle();
    if (!target) throw new Error("Mesa de destino não encontrada");

    const { data: toSession } = await db.from("table_sessions").select("*").eq("table_id", toTableId).eq("status", "open").maybeSingle<TableSession>();
    const moved = { table_id: toTableId, ...(toSession ? { session_id: toSession.id } : {}) };

    await Promise.all([
      db.from("orders").update(moved).eq("session_id", from.id),
      db.from("order_items").update(moved).eq("session_id", from.id),
      db.from("waiter_calls").update(moved).eq("session_id", from.id),
    ]);

    if (toSession) {
      await db.from("guests").update({ session_id: toSession.id }).eq("session_id", from.id);
      await db
        .from("table_sessions")
        .update({ status: "closed", closed_at: new Date().toISOString(), closed_by: profile.id })
        .eq("id", from.id);
      return { ok: true, merged: true };
    }
    await db.from("table_sessions").update({ table_id: toTableId }).eq("id", from.id);
    return { ok: true, merged: false };
  } catch (e) {
    return fail(e);
  }
}

/** Passa um item de uma pessoa para outra na mesma mesa. */
export async function moveItem(itemId: string, toGuestId: string): Promise<Result> {
  try {
    const { restaurant, features } = await requireStaff(["waiter"]);
    assertFeature(features, "move_items");
    const db = createAdminClient();
    const { data: item } = await db.from("order_items").select("session_id").eq("id", itemId).eq("restaurant_id", restaurant.id).single();
    const { data: guest } = await db.from("guests").select("id").eq("id", toGuestId).eq("session_id", item?.session_id ?? "").maybeSingle();
    if (!item || !guest) throw new Error("Pessoa não está nesta mesa");
    await db.from("order_items").update({ guest_id: toGuestId, share_mode: "me" }).eq("id", itemId);
    await db.from("order_item_shares").delete().eq("order_item_id", itemId);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Desconto em centavos (0 = remove). Cortesia = desconto do valor inteiro. Só dono/gerente. */
export async function setDiscount(itemId: string, discountCents: number, reason: string): Promise<Result> {
  try {
    const { restaurant, profile, features } = await requireStaff(["manager"]);
    assertFeature(features, "discounts");
    if (profile.role !== "owner" && profile.role !== "manager") throw new Error("Apenas gerente ou dono");
    const db = createAdminClient();
    const { data: item } = await db
      .from("order_items")
      .select("unit_price_cents, qty")
      .eq("id", itemId)
      .eq("restaurant_id", restaurant.id)
      .single<Pick<OrderItem, "unit_price_cents" | "qty">>();
    if (!item) throw new Error("Item não encontrado");
    const cents = Math.min(Math.max(Math.round(discountCents), 0), item.unit_price_cents * item.qty);
    await db
      .from("order_items")
      .update({ discount_cents: cents, discount_reason: cents ? reason.trim().slice(0, 100) || "Desconto" : null })
      .eq("id", itemId);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Marca (ou desmarca, com method = null) o pagamento de uma pessoa, guardando o valor pago. */
export async function markPaid(guestId: string, method: PaymentMethod | null): Promise<Result> {
  try {
    const { restaurant, profile } = await requireStaff(["waiter"]);
    const db = createAdminClient();
    const { data: guest } = await db.from("guests").select("session_id").eq("id", guestId).eq("restaurant_id", restaurant.id).single();
    if (!guest) throw new Error("Cliente não encontrado");
    if (!method) {
      await db.from("guests").update({ paid_at: null, payment_method: null, paid_cents: null, paid_by: null }).eq("id", guestId);
      return { ok: true };
    }
    const [{ data: guests }, { data: items }] = await Promise.all([
      db.from("guests").select("id, session_id, name, paid_at, created_at").eq("session_id", guest.session_id),
      db.from("order_items").select("*").eq("session_id", guest.session_id),
    ]);
    const customIds = ((items ?? []) as OrderItem[]).filter((i) => i.share_mode === "custom").map((i) => i.id);
    const { data: shares } = customIds.length
      ? await db.from("order_item_shares").select("order_item_id, guest_id").in("order_item_id", customIds)
      : { data: [] };
    const bill = computeBill((guests ?? []) as Guest[], (items ?? []) as OrderItem[], (shares ?? []) as OrderItemShare[], Number(restaurant.service_fee_pct));
    const total = bill.guests.find((g) => g.guest.id === guestId)?.totalCents ?? 0;
    await db
      .from("guests")
      .update({ paid_at: new Date().toISOString(), payment_method: method, paid_cents: total, paid_by: profile.id })
      .eq("id", guestId);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function cancelItem(itemId: string, reason: string): Promise<Result> {
  try {
    const { restaurant, features } = await requireStaff(["waiter"]);
    await cancelItems(restaurant.id, [itemId], reason.trim().slice(0, 100) || "Sem motivo", features.stock);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Registra este aparelho para receber alertas com a tela bloqueada (Web Push). */
export async function savePushSubscription(sub: { endpoint: string; keys: { p256dh: string; auth: string } }): Promise<Result> {
  try {
    const { restaurant, profile, features } = await requireStaff(["waiter"]);
    assertFeature(features, "push");
    if (!sub?.endpoint?.startsWith("https://") || !sub.keys?.p256dh || !sub.keys?.auth) throw new Error("Assinatura inválida");
    const { error } = await createAdminClient()
      .from("push_subscriptions")
      .upsert(
        { restaurant_id: restaurant.id, profile_id: profile.id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
        { onConflict: "endpoint" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
