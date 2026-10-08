import { requireStaff } from "@/lib/auth";
import { isValidDay, loadCashClosing, todayLocal } from "@/lib/cash";
import { csvResponse, reais, toCsv } from "@/lib/csv";
import { fetchAll, loadStats, PERIODS, type Period } from "@/lib/stats";
import { createClient } from "@/lib/supabase/server";
import { TIMEZONE } from "@/lib/time";
import type { OrderItem } from "@/lib/types";

const dateTime = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: TIMEZONE });

/** Exportações em CSV (abre no Excel): ?tipo=vendas|pedidos&periodo=7d  ou  ?tipo=caixa&dia=AAAA-MM-DD */
export async function GET(req: Request) {
  const { restaurant, features } = await requireStaff(["manager"]);
  if (!features.export) return new Response("Função desativada", { status: 403 });
  const url = new URL(req.url);
  const tipo = url.searchParams.get("tipo");
  const rawPeriod = url.searchParams.get("periodo") ?? "30d";
  const period: Period = rawPeriod in PERIODS ? (rawPeriod as Period) : "30d";
  const supabase = await createClient();
  const slug = restaurant.slug;

  if (tipo === "caixa") {
    const raw = url.searchParams.get("dia");
    const day = isValidDay(raw) ? raw : todayLocal();
    const c = await loadCashClosing(supabase, restaurant, day);
    const rows: (string | number)[][] = [
      ["Total recebido", reais(c.totalCents)],
      ["Vendas (sem serviço)", reais(c.subtotalCents)],
      ["Taxa de serviço", reais(c.serviceCents)],
      ["Descontos e cortesias", reais(c.discountCents)],
      ["Mesas", c.tables],
      ["Pessoas", c.guests],
      [],
      ["Forma de pagamento", "Valor (R$)", "Pessoas"],
      ...c.byMethod.map((r) => [r.label, reais(r.cents), r.count]),
      [],
      ["Garçom", "Valor (R$)", "Pessoas"],
      ...c.byWaiter.map((r) => [r.name, reais(r.cents), r.count]),
      [],
      ["Mesa", "Abertura", "Fechamento", "Pessoas", "Total (R$)"],
      ...c.sessions.map((s) => [s.table, dateTime(s.openedAt), dateTime(s.closedAt), s.guests, reais(s.totalCents)]),
    ];
    return csvResponse(`caixa-${slug}-${day}.csv`, toCsv([`Fechamento de caixa ${day}`, ""], rows));
  }

  if (tipo === "pedidos") {
    const since = new Date(Date.now() - PERIODS[period].days * 86400000).toISOString();
    const [items, { data: tables }, { data: staff }] = await Promise.all([
      fetchAll<OrderItem>((a, b) =>
        supabase.from("order_items").select("*").eq("restaurant_id", restaurant.id).gte("created_at", since).order("created_at").range(a, b),
      ),
      supabase.from("tables").select("id, number").eq("restaurant_id", restaurant.id),
      supabase.from("profiles").select("id, name").eq("restaurant_id", restaurant.id),
    ]);
    const tableNumber = new Map(((tables ?? []) as { id: string; number: number }[]).map((t) => [t.id, t.number]));
    const staffName = new Map(((staff ?? []) as { id: string; name: string }[]).map((p) => [p.id, p.name]));
    const guestIds = [...new Set(items.map((i) => i.guest_id))];
    const guestName = new Map<string, string>();
    for (let i = 0; i < guestIds.length; i += 150) {
      const { data } = await supabase.from("guests").select("id, name").in("id", guestIds.slice(i, i + 150));
      for (const g of (data ?? []) as { id: string; name: string }[]) guestName.set(g.id, g.name);
    }
    const csv = toCsv(
      ["Data", "Mesa", "Cliente", "Prato", "Adicionais", "Qtd", "Preço unit. (R$)", "Desconto (R$)", "Total (R$)", "Status", "Lançado por", "Motivo cancel."],
      items.map((i) => [
        dateTime(i.created_at),
        tableNumber.get(i.table_id) ?? "",
        guestName.get(i.guest_id) ?? "",
        i.name,
        i.options.map((o) => o.name).join(", "),
        i.qty,
        reais(i.unit_price_cents),
        reais(i.discount_cents ?? 0),
        reais(i.status === "cancelled" ? 0 : i.unit_price_cents * i.qty - (i.discount_cents ?? 0)),
        i.status,
        i.created_by ? (staffName.get(i.created_by) ?? "Garçom") : "Cliente (QR)",
        i.cancel_reason ?? "",
      ]),
    );
    return csvResponse(`pedidos-${slug}-${period}.csv`, csv);
  }

  // Padrão: vendas por prato no período
  const stats = await loadStats(supabase, restaurant.id, period);
  const csv = toCsv(
    ["Prato", "Quantidade", "Receita (R$)", "Cancelados", "Preparo médio (min)"],
    stats.ranking.map((r) => [r.name, r.qty, reais(r.revenue), r.cancelled, r.prepMin == null ? "" : Math.round(r.prepMin)]),
  );
  return csvResponse(`vendas-${slug}-${period}.csv`, csv);
}
