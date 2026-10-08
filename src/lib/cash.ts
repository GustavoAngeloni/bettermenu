import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { computeBill } from "./bill";
import { fetchAll, localDay } from "./stats";
import { PAYMENT_LABEL, type Guest, type OrderItem, type OrderItemShare, type PaymentMethod, type Restaurant, type TableSession } from "./types";

/** Meia-noite (UTC-3, horário de Brasília) do dia "YYYY-MM-DD" e da meia-noite seguinte. */
export function dayRange(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, d, 3));
  return { start: start.toISOString(), end: new Date(start.getTime() + 86400000).toISOString() };
}

export function isValidDay(day: unknown): day is string {
  return typeof day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day);
}

export interface CashClosing {
  day: string;
  tables: number;
  guests: number;
  subtotalCents: number;
  serviceCents: number;
  totalCents: number;
  discountCents: number;
  cancelledCount: number;
  byMethod: { method: string; label: string; cents: number; count: number }[];
  byWaiter: { name: string; cents: number; count: number }[];
  sessions: { table: number; openedAt: string; closedAt: string; guests: number; totalCents: number; unpaid: number }[];
}

/** Fechamento de caixa: mesas encerradas no dia, com o valor de cada pessoa e a forma de pagamento. */
export async function loadCashClosing(supabase: SupabaseClient, restaurant: Restaurant, day: string): Promise<CashClosing> {
  const { start, end } = dayRange(day);
  const { data: sessionsData } = await supabase
    .from("table_sessions")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .eq("status", "closed")
    .gte("closed_at", start)
    .lt("closed_at", end)
    .order("closed_at");
  const sessions = (sessionsData ?? []) as TableSession[];
  const ids = sessions.map((s) => s.id);

  const empty: CashClosing = {
    day,
    tables: 0,
    guests: 0,
    subtotalCents: 0,
    serviceCents: 0,
    totalCents: 0,
    discountCents: 0,
    cancelledCount: 0,
    byMethod: [],
    byWaiter: [],
    sessions: [],
  };
  if (!ids.length) return empty;

  const chunks = <T,>(list: T[], n = 150) => Array.from({ length: Math.ceil(list.length / n) }, (_, i) => list.slice(i * n, i * n + n));
  const guests: Guest[] = [];
  const items: OrderItem[] = [];
  for (const part of chunks(ids)) {
    const [g, it] = await Promise.all([
      supabase.from("guests").select("id, session_id, name, paid_at, created_at, payment_method, paid_cents, paid_by").in("session_id", part),
      fetchAll<OrderItem>((a, b) => supabase.from("order_items").select("*").in("session_id", part).order("created_at").range(a, b)),
    ]);
    guests.push(...((g.data ?? []) as Guest[]));
    items.push(...it);
  }
  const customIds = items.filter((i) => i.share_mode === "custom").map((i) => i.id);
  const shares: OrderItemShare[] = [];
  for (const part of chunks(customIds)) {
    const { data } = await supabase.from("order_item_shares").select("order_item_id, guest_id").in("order_item_id", part);
    shares.push(...((data ?? []) as OrderItemShare[]));
  }
  const waiterIds = [...new Set(guests.map((g) => g.paid_by).filter(Boolean))] as string[];
  const { data: waiters } = waiterIds.length ? await supabase.from("profiles").select("id, name").in("id", waiterIds) : { data: [] };
  const waiterName = new Map(((waiters ?? []) as { id: string; name: string }[]).map((w) => [w.id, w.name]));
  const { data: tables } = await supabase.from("tables").select("id, number").eq("restaurant_id", restaurant.id);
  const tableNumber = new Map(((tables ?? []) as { id: string; number: number }[]).map((t) => [t.id, t.number]));

  const byMethod = new Map<string, { cents: number; count: number }>();
  const byWaiter = new Map<string, { cents: number; count: number }>();
  const out = { ...empty, tables: sessions.length };

  for (const s of sessions) {
    const sGuests = guests.filter((g) => g.session_id === s.id);
    const sItems = items.filter((i) => i.session_id === s.id);
    const bill = computeBill(sGuests, sItems, shares, Number(restaurant.service_fee_pct));
    if (bill.totalCents === 0) continue;
    let unpaid = 0;
    for (const gb of bill.guests) {
      if (gb.totalCents === 0) continue;
      const g = sGuests.find((x) => x.id === gb.guest.id);
      const method = g?.paid_at ? (g.payment_method ?? "outro") : "nao_informado";
      if (!g?.paid_at) unpaid++;
      const m = byMethod.get(method) ?? { cents: 0, count: 0 };
      byMethod.set(method, { cents: m.cents + gb.totalCents, count: m.count + 1 });
      const w = waiterName.get(g?.paid_by ?? "") ?? "Não informado";
      const ww = byWaiter.get(w) ?? { cents: 0, count: 0 };
      byWaiter.set(w, { cents: ww.cents + gb.totalCents, count: ww.count + 1 });
      out.guests++;
    }
    out.subtotalCents += bill.subtotalCents;
    out.serviceCents += bill.serviceCents;
    out.totalCents += bill.totalCents;
    out.discountCents += sItems.filter((i) => i.status !== "cancelled").reduce((sum, i) => sum + (i.discount_cents ?? 0), 0);
    out.cancelledCount += sItems.filter((i) => i.status === "cancelled").reduce((sum, i) => sum + i.qty, 0);
    out.sessions.push({
      table: tableNumber.get(s.table_id) ?? 0,
      openedAt: s.opened_at,
      closedAt: s.closed_at!,
      guests: sGuests.length,
      totalCents: bill.totalCents,
      unpaid,
    });
  }

  // Mesas juntadas a outra ficam sem consumo próprio e não entram na contagem.
  out.tables = out.sessions.length;
  out.byMethod = [...byMethod.entries()]
    .map(([method, v]) => ({ method, label: method === "nao_informado" ? "Não marcado como pago" : PAYMENT_LABEL[method as PaymentMethod], ...v }))
    .sort((a, b) => b.cents - a.cents);
  out.byWaiter = [...byWaiter.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.cents - a.cents);
  return out;
}

export const todayLocal = () => localDay(new Date());
