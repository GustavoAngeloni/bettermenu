import { ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui";
import { SUBSCRIPTION_STATUS } from "@/lib/billing";
import { requireSuperadmin } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { formatBRL } from "@/lib/money";
import { planLabel } from "@/lib/plans";
import { daysAgoIso, fetchAll, localDay } from "@/lib/stats";
import { createAdminClient } from "@/lib/supabase/server";
import type { Restaurant } from "@/lib/types";
import { CreateRestaurantForm } from "./super-forms";
import { SuperHeader } from "./super-header";

export const metadata = { title: "Super Admin" };

export default async function SuperPage() {
  const { profile } = await requireSuperadmin();
  const db = createAdminClient();
  const since = daysAgoIso(30);
  const { data: subscriptions } = await db.from("subscriptions").select("*").order("created_at", { ascending: false }).limit(30);
  const [{ data: restaurants }, { data: tables }, { data: items }, { data: open }] = await Promise.all([
    db.from("restaurants").select("*").order("created_at", { ascending: false }),
    db.from("tables").select("restaurant_id").eq("active", true),
    fetchAll((a, b) =>
      db
        .from("order_items")
        .select("restaurant_id, unit_price_cents, qty, discount_cents, created_at")
        .neq("status", "cancelled")
        .gte("created_at", since)
        .order("created_at")
        .range(a, b),
    ).then((data) => ({ data })),
    db.from("table_sessions").select("restaurant_id").eq("status", "open"),
  ]);

  const count = <T extends { restaurant_id: string }>(list: T[] | null, id: string) => (list ?? []).filter((r) => r.restaurant_id === id).length;
  const today = localDay(new Date());
  const revenue = (id: string, onlyToday = false) =>
    ((items ?? []) as { restaurant_id: string; unit_price_cents: number; qty: number; discount_cents: number; created_at: string }[])
      .filter((i) => i.restaurant_id === id && (!onlyToday || localDay(new Date(i.created_at)) === today))
      .reduce((s, i) => s + i.unit_price_cents * i.qty - (i.discount_cents ?? 0), 0);

  return (
    <div className="flex-1">
      <SuperHeader name={profile.name} />

      <main className="mx-auto max-w-6xl space-y-8 p-4 md:p-8">
        <section>
          <h1 className="mb-3 text-2xl font-bold">Restaurantes ({restaurants?.length ?? 0})</h1>
          <div className="overflow-x-auto rounded-[1.4rem] border border-line bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="px-4 py-3 font-medium">Restaurante</th>
                  <th className="px-4 py-3 font-medium">Plano</th>
                  <th className="px-4 py-3 text-right font-medium">Mesas</th>
                  <th className="px-4 py-3 text-right font-medium">Abertas agora</th>
                  <th className="px-4 py-3 text-right font-medium">Vendas hoje</th>
                  <th className="px-4 py-3 text-right font-medium">Vendas 30 dias</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {(() => {
                  // Unidades logo abaixo do restaurante principal do grupo
                  const list = (restaurants ?? []) as Restaurant[];
                  const roots = list.filter((r) => !r.group_id || !list.some((x) => x.id === r.group_id));
                  return roots.flatMap((root) => [root, ...list.filter((u) => u.group_id === root.id)]);
                })().map((r) => {
                  const overdue = r.paid_until && r.paid_until < today;
                  return (
                    <tr key={r.id} className={cn("hover:bg-surface-2", !r.active && "opacity-50")}>
                      <td className="px-4 py-3">
                        <Link href={`/super/${r.id}`} className={cn("font-semibold hover:text-brand-fg", r.group_id && "pl-4 before:mr-1.5 before:text-muted before:content-['↳']")}>
                          {r.name}
                        </Link>
                        <div className={cn("text-xs text-muted", r.group_id && "pl-4")}>
                          <code>{r.slug}</code>
                          {r.group_id && " · unidade"}
                          {!r.active && " · desativado"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {planLabel(r.plan)}
                        {overdue && <Badge className="ml-2 bg-red-100 text-red-700">Vencido</Badge>}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {count(tables, r.id)}
                        {r.max_tables != null && <span className="text-muted">/{r.max_tables}</span>}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{count(open, r.id)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatBRL(revenue(r.id, true))}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatBRL(revenue(r.id))}</td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/super/${r.id}`} className="inline-flex items-center gap-1 font-semibold text-brand-fg">
                          Gerenciar <ChevronRight className="size-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-bold">Assinaturas pelo checkout ({subscriptions?.length ?? 0})</h2>
          {!subscriptions?.length ? (
            <p className="rounded-2xl border border-dashed border-line p-6 text-sm text-muted">Nenhuma assinatura pelo site ainda. O link de venda é /planos.</p>
          ) : (
            <div className="overflow-x-auto rounded-[1.4rem] border border-line bg-surface">
              <table className="w-full text-sm">
                <thead className="bg-surface-2 text-left text-xs text-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Restaurante</th>
                    <th className="px-4 py-3 font-medium">Plano</th>
                    <th className="px-4 py-3 font-medium">Valor</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Próxima cobrança</th>
                    <th className="px-4 py-3 font-medium">Contato</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {(subscriptions as { id: string; restaurant_id: string | null; restaurant_name: string | null; plan: string; cycle: string; amount_cents: number; status: string; next_payment_date: string | null; payer_email: string; phone: string | null }[]).map((s) => (
                    <tr key={s.id}>
                      <td className="px-4 py-3 font-semibold">
                        {s.restaurant_id ? <Link href={`/super/${s.restaurant_id}`} className="hover:text-brand-fg">{s.restaurant_name ?? "—"}</Link> : (s.restaurant_name ?? "—")}
                      </td>
                      <td className="px-4 py-3">
                        {planLabel(s.plan)} · {s.cycle}
                      </td>
                      <td className="px-4 py-3 tabular-nums">{formatBRL(s.amount_cents)}</td>
                      <td className="px-4 py-3">
                        <Badge className={s.status === "authorized" ? "bg-emerald-100 text-emerald-800" : s.status === "cancelled" || s.status === "failed" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}>
                          {SUBSCRIPTION_STATUS[s.status]?.label ?? s.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">{s.next_payment_date ? new Date(s.next_payment_date).toLocaleDateString("pt-BR") : "—"}</td>
                      <td className="px-4 py-3 text-muted">
                        {s.payer_email}
                        {s.phone && <div className="text-xs">{s.phone}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <details className="group">
          <summary className="flex cursor-pointer list-none items-center gap-2 font-display text-xl font-semibold">
            <Plus className="size-5 text-brand-fg transition-transform group-open:rotate-45" /> Novo restaurante
          </summary>
          <p className="mt-1 mb-4 text-sm text-muted">Cria o restaurante, o login do dono, as estações Cozinha e Bar e as mesas.</p>
          <CreateRestaurantForm />
        </details>
      </main>
    </div>
  );
}
