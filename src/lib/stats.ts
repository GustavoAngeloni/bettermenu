import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { itemTotal } from "./bill";
import { TIMEZONE } from "./time";
import type { OrderItem, TableSession, WaiterCall } from "./types";

export const PERIODS = {
  hoje: { label: "Hoje", days: 1 },
  "7d": { label: "7 dias", days: 7 },
  "30d": { label: "30 dias", days: 30 },
  "90d": { label: "90 dias", days: 90 },
} as const;
export type Period = keyof typeof PERIODS;

const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" });
const partsFmt = new Intl.DateTimeFormat("en-US", { timeZone: TIMEZONE, weekday: "short", hour: "2-digit", hourCycle: "h23" });
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "2026-09-28" no fuso do restaurante */
export const localDay = (d: Date) => dayFmt.format(d);

export const daysAgoIso = (days: number) => new Date(Date.now() - days * 86400000).toISOString();

function localDowHour(d: Date) {
  const parts = partsFmt.formatToParts(d);
  return {
    dow: WEEKDAYS.indexOf(parts.find((p) => p.type === "weekday")!.value),
    hour: Number(parts.find((p) => p.type === "hour")!.value),
  };
}

/** Início do período: meia-noite local de (hoje - dias + 1). */
function periodStart(days: number) {
  const today = localDay(new Date());
  const [y, m, d] = today.split("-").map(Number);
  // meia-noite em São Paulo (UTC-3); suficiente para agrupar por dia
  const start = new Date(Date.UTC(y, m - 1, d - days + 1, 3));
  return start;
}

/** O Supabase devolve no máximo 1000 linhas por consulta: pagina até acabar. */
export async function fetchAll<T>(query: (from: number, to: number) => PromiseLike<{ data: T[] | null }>): Promise<T[]> {
  const out: T[] = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data } = await query(from, from + page - 1);
    out.push(...(data ?? []));
    if (!data || data.length < page) break;
  }
  return out;
}

const avg = (list: number[]) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : null);

/** Custo atual de cada prato (para pedidos antigos, feitos antes de o custo ser cadastrado). */
async function currentCosts(supabase: SupabaseClient, restaurantId: string) {
  const { data, error } = await supabase.from("menu_items").select("id, cost_cents").eq("restaurant_id", restaurantId).not("cost_cents", "is", null);
  if (error) return new Map<string, number>(); // schema v4 pendente
  return new Map(((data ?? []) as { id: string; cost_cents: number }[]).map((m) => [m.id, m.cost_cents]));
}

export async function loadStats(supabase: SupabaseClient, restaurantId: string, period: Period, { finance = false } = {}) {
  const days = PERIODS[period].days;
  const since = periodStart(days).toISOString();

  const [items, sessions, calls, ratings, costs] = await Promise.all([
    fetchAll<OrderItem>((a, b) =>
      supabase.from("order_items").select("*").eq("restaurant_id", restaurantId).gte("created_at", since).order("created_at").range(a, b),
    ),
    fetchAll<TableSession>((a, b) =>
      supabase.from("table_sessions").select("*").eq("restaurant_id", restaurantId).gte("opened_at", since).order("opened_at").range(a, b),
    ),
    fetchAll<WaiterCall>((a, b) =>
      supabase.from("waiter_calls").select("*").eq("restaurant_id", restaurantId).gte("created_at", since).order("created_at").range(a, b),
    ),
    fetchAll<{ food: number; service: number; comment: string | null; created_at: string }>((a, b) =>
      supabase.from("ratings").select("food, service, comment, created_at").eq("restaurant_id", restaurantId).gte("created_at", since).order("created_at", { ascending: false }).range(a, b),
    ),
    finance ? currentCosts(supabase, restaurantId) : Promise.resolve(new Map<string, number>()),
  ]);
  /** Custo por unidade: o gravado no pedido; senão, o custo atual do prato. */
  const unitCost = (i: OrderItem) => i.unit_cost_cents ?? (i.menu_item_id ? costs.get(i.menu_item_id) : undefined) ?? null;

  const sessionIds = sessions.map((s) => s.id);
  let guestCount = 0;
  for (let i = 0; i < sessionIds.length; i += 200) {
    const { count } = await supabase
      .from("guests")
      .select("id", { count: "exact", head: true })
      .in("session_id", sessionIds.slice(i, i + 200));
    guestCount += count ?? 0;
  }

  const sold = items.filter((i) => i.status !== "cancelled");
  const cancelled = items.filter((i) => i.status === "cancelled");
  const revenue = sold.reduce((s, i) => s + itemTotal(i), 0);
  const sessionsWithOrders = new Set(sold.map((i) => i.session_id)).size;

  // Faturamento por dia (inclui dias sem venda, para o gráfico não mentir)
  const byDay = new Map<string, number>();
  for (let d = 0; d < days; d++) byDay.set(localDay(new Date(periodStart(days).getTime() + d * 86400000 + 3600000)), 0);
  for (const i of sold) {
    const key = localDay(new Date(i.created_at));
    byDay.set(key, (byDay.get(key) ?? 0) + itemTotal(i));
  }

  // Mapa de calor: pedidos por dia da semana × hora
  const heat = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  const orderIds = new Set<string>();
  for (const i of sold) {
    if (orderIds.has(i.order_id)) continue;
    orderIds.add(i.order_id);
    const { dow, hour } = localDowHour(new Date(i.created_at));
    heat[dow][hour]++;
  }

  // Ranking de pratos
  const byItem = new Map<string, { name: string; qty: number; revenue: number; prep: number[]; cancelled: number; cost: number; costedRevenue: number }>();
  for (const i of items) {
    const key = i.menu_item_id ?? i.name;
    const row = byItem.get(key) ?? { name: i.name, qty: 0, revenue: 0, prep: [], cancelled: 0, cost: 0, costedRevenue: 0 };
    if (i.status === "cancelled") row.cancelled += i.qty;
    else {
      row.qty += i.qty;
      row.revenue += itemTotal(i);
      const c = unitCost(i);
      if (c != null) {
        row.cost += c * i.qty;
        row.costedRevenue += itemTotal(i);
      }
      if (i.ready_at) row.prep.push((new Date(i.ready_at).getTime() - new Date(i.created_at).getTime()) / 60000);
    }
    byItem.set(key, row);
  }
  const ranking = [...byItem.values()]
    .map((r) => ({
      name: r.name,
      qty: r.qty,
      revenue: r.revenue,
      cancelled: r.cancelled,
      prepMin: avg(r.prep),
      // lucro e margem só quando o custo é conhecido
      profit: r.costedRevenue ? r.costedRevenue - r.cost : null,
      marginPct: r.costedRevenue ? Math.round(((r.costedRevenue - r.cost) / r.costedRevenue) * 100) : null,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const prepTimes = sold.filter((i) => i.ready_at).map((i) => (new Date(i.ready_at!).getTime() - new Date(i.created_at).getTime()) / 60000);
  const callTimes = calls
    .filter((c) => c.resolved_at && c.type === "waiter")
    .map((c) => (new Date(c.resolved_at!).getTime() - new Date(c.created_at).getTime()) / 60000);
  const stayTimes = sessions
    .filter((s) => s.closed_at)
    .map((s) => (new Date(s.closed_at!).getTime() - new Date(s.opened_at).getTime()) / 60000);

  const reasons = new Map<string, number>();
  for (const c of cancelled) reasons.set(c.cancel_reason || "Sem motivo", (reasons.get(c.cancel_reason || "Sem motivo") ?? 0) + c.qty);

  // Controle financeiro: lucro bruto sobre as vendas que têm custo cadastrado.
  let cost = 0;
  let costedRevenue = 0;
  for (const i of sold) {
    const c = unitCost(i);
    if (c == null) continue;
    cost += c * i.qty;
    costedRevenue += itemTotal(i);
  }
  const profitByDay = new Map<string, number>();
  for (const i of sold) {
    const c = unitCost(i);
    if (c == null) continue;
    const key = localDay(new Date(i.created_at));
    profitByDay.set(key, (profitByDay.get(key) ?? 0) + itemTotal(i) - c * i.qty);
  }

  return {
    period,
    revenue,
    finance: {
      cost,
      costedRevenue,
      profit: costedRevenue - cost,
      marginPct: costedRevenue ? Math.round(((costedRevenue - cost) / costedRevenue) * 100) : null,
      /** parte do faturamento que tem custo cadastrado (0 a 100) */
      coveragePct: revenue ? Math.round((costedRevenue / revenue) * 100) : 0,
      profitPerTable: sessionsWithOrders && costedRevenue ? Math.round((costedRevenue - cost) / sessionsWithOrders) : null,
      bestDay: [...profitByDay.entries()].sort((a, b) => b[1] - a[1])[0] ?? null,
    },
    itemsSold: sold.reduce((s, i) => s + i.qty, 0),
    tablesServed: sessionsWithOrders,
    guests: guestCount,
    ticketPerTable: sessionsWithOrders ? Math.round(revenue / sessionsWithOrders) : 0,
    ticketPerGuest: guestCount ? Math.round(revenue / guestCount) : 0,
    avgPrepMin: avg(prepTimes),
    avgCallMin: avg(callTimes),
    avgStayMin: avg(stayTimes),
    cancelledCount: cancelled.reduce((s, i) => s + i.qty, 0),
    discountCents: sold.reduce((s, i) => s + (i.discount_cents ?? 0), 0),
    ratings: {
      count: ratings.length,
      food: avg(ratings.map((r) => r.food)),
      service: avg(ratings.map((r) => r.service)),
      comments: ratings.filter((r) => r.comment).slice(0, 8),
    },
    cancelReasons: [...reasons.entries()].sort((a, b) => b[1] - a[1]),
    byDay: [...byDay.entries()].map(([day, cents]) => ({ day, cents })),
    heat,
    ranking,
  };
}

export type Stats = Awaited<ReturnType<typeof loadStats>>;
