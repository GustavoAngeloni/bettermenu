import { Download, Star } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { requireStaff } from "@/lib/auth";
import { formatBRL } from "@/lib/money";
import { loadStats, PERIODS, type Period, type Stats } from "@/lib/stats";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Estatísticas · Better Menu" };

const DOW = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function fmtMin(v: number | null) {
  if (v == null) return "—";
  if (v < 60) return `${Math.round(v)} min`;
  return `${Math.floor(v / 60)}h${String(Math.round(v % 60)).padStart(2, "0")}`;
}

export default async function DashboardPage({ searchParams }: PageProps<"/admin">) {
  const { restaurant, features } = await requireStaff(["manager"]);
  const raw = (await searchParams).periodo;
  const period: Period = typeof raw === "string" && raw in PERIODS ? (raw as Period) : "7d";
  const supabase = await createClient();
  const [stats, { data: menu }] = await Promise.all([
    loadStats(supabase, restaurant.id, period),
    supabase.from("menu_items").select("name").eq("restaurant_id", restaurant.id).eq("available", true),
  ]);

  // Pratos do cardápio que não venderam nada no período
  const soldNames = new Set(stats.ranking.filter((r) => r.qty > 0).map((r) => r.name));
  const neverSold = ((menu ?? []) as { name: string }[]).map((m) => m.name).filter((n) => !soldNames.has(n));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Estatísticas</h1>
          <p className="text-sm text-muted">Valores de vendas sem a taxa de serviço. Itens cancelados não entram.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {features.export && (
            <>
              <a href={`/admin/export?tipo=vendas&periodo=${period}`} className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-semibold shadow-sm hover:text-brand">
                <Download className="size-4" /> Vendas
              </a>
              <a href={`/admin/export?tipo=pedidos&periodo=${period}`} className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-semibold shadow-sm hover:text-brand">
                <Download className="size-4" /> Pedidos
              </a>
            </>
          )}
        <div className="flex rounded-xl bg-white p-1 shadow-sm">
          {(Object.keys(PERIODS) as Period[]).map((p) => (
            <Link
              key={p}
              href={`/admin?periodo=${p}`}
              className={cn("rounded-lg px-3 py-1.5 text-sm font-semibold", p === period ? "bg-brand text-white" : "text-muted hover:text-ink")}
            >
              {PERIODS[p].label}
            </Link>
          ))}
        </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Faturamento" value={formatBRL(stats.revenue)} hero />
        <Kpi label="Mesas atendidas" value={String(stats.tablesServed)} sub={`${stats.guests} clientes`} />
        <Kpi label="Ticket médio por mesa" value={formatBRL(stats.ticketPerTable)} />
        <Kpi label="Ticket médio por pessoa" value={formatBRL(stats.ticketPerGuest)} />
        <Kpi label="Itens vendidos" value={String(stats.itemsSold)} sub={stats.cancelledCount ? `${stats.cancelledCount} cancelados` : undefined} />
        <Kpi label="Tempo médio de preparo" value={fmtMin(stats.avgPrepMin)} sub="do pedido até ficar pronto" />
        <Kpi label="Tempo de resposta ao chamado" value={fmtMin(stats.avgCallMin)} sub="até o garçom atender" />
        <Kpi label="Permanência média" value={fmtMin(stats.avgStayMin)} sub="da chegada ao pagamento" />
        {stats.discountCents > 0 && <Kpi label="Descontos e cortesias" value={formatBRL(stats.discountCents)} sub="já descontados do faturamento" />}
        {features.ratings && (
          <Kpi
            label="Avaliação média"
            value={stats.ratings.count ? `${(((stats.ratings.food ?? 0) + (stats.ratings.service ?? 0)) / 2).toFixed(1)} ★` : "—"}
            sub={stats.ratings.count ? `comida ${stats.ratings.food?.toFixed(1)} · atendimento ${stats.ratings.service?.toFixed(1)} · ${stats.ratings.count} avaliações` : "sem avaliações no período"}
          />
        )}
      </div>

      {stats.byDay.length > 1 && <RevenueChart data={stats.byDay} />}

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Ranking ranking={stats.ranking} />
        <div className="space-y-6">
          <Heatmap heat={stats.heat} />
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <Card title="Não venderam no período">
              {neverSold.length === 0 ? (
                <p className="text-sm text-muted">Todos os pratos disponíveis venderam.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {neverSold.slice(0, 10).map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                  {neverSold.length > 10 && <li className="text-muted">e mais {neverSold.length - 10}</li>}
                </ul>
              )}
            </Card>
            {features.ratings && stats.ratings.comments.length > 0 && (
              <Card title="Comentários dos clientes">
                <ul className="space-y-3 text-sm">
                  {stats.ratings.comments.map((r, i) => (
                    <li key={i}>
                      <span className="flex items-center gap-0.5 text-amber-500">
                        {Array.from({ length: Math.round((r.food + r.service) / 2) }, (_, k) => (
                          <Star key={k} className="size-3.5 fill-current" />
                        ))}
                      </span>
                      “{r.comment}”
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            <Card title="Motivos de cancelamento">
              {stats.cancelReasons.length === 0 ? (
                <p className="text-sm text-muted">Nenhum cancelamento.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {stats.cancelReasons.map(([reason, n]) => (
                    <li key={reason} className="flex justify-between gap-3">
                      <span>{reason}</span>
                      <span className="font-semibold tabular-nums">{n}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("min-w-0 rounded-2xl bg-white p-4 shadow-sm sm:p-5", className)}>
      <h2 className="mb-4 font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Kpi({ label, value, sub, hero }: { label: string; value: string; sub?: string; hero?: boolean }) {
  return (
    <div className={cn("rounded-2xl p-4 shadow-sm", hero ? "bg-ink text-white" : "bg-white")}>
      <div className={cn("text-xs font-medium", hero ? "text-white/70" : "text-muted")}>{label}</div>
      <div className="mt-1 text-2xl font-extrabold tabular-nums">{value}</div>
      {sub && <div className={cn("mt-0.5 text-xs", hero ? "text-white/60" : "text-muted")}>{sub}</div>}
    </div>
  );
}

function RevenueChart({ data }: { data: Stats["byDay"] }) {
  const max = Math.max(...data.map((d) => d.cents), 1);
  const labelEvery = data.length > 31 ? 7 : data.length > 10 ? 3 : 1;
  return (
    <Card title="Faturamento por dia">
      <div className="flex h-48 items-end gap-[2px]">
        {data.map((d, i) => {
          const [, m, day] = d.day.split("-");
          return (
            <div key={d.day} className="group relative flex h-full flex-1 flex-col justify-end">
              <div
                className="rounded-t-[4px] bg-brand/85 transition-colors group-hover:bg-brand"
                style={{ height: `${Math.max((d.cents / max) * 100, d.cents ? 1.5 : 0)}%` }}
              />
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded-lg bg-ink px-2.5 py-1.5 text-xs whitespace-nowrap text-white shadow-lg group-hover:block">
                {day}/{m} · <strong>{formatBRL(d.cents)}</strong>
              </div>
              <div className="absolute top-full mt-1 w-full text-center text-[10px] text-muted">{i % labelEvery === 0 ? `${day}/${m}` : ""}</div>
            </div>
          );
        })}
      </div>
      <div className="h-5 border-t border-line" />
    </Card>
  );
}

function Heatmap({ heat }: { heat: number[][] }) {
  const max = Math.max(...heat.flat(), 1);
  const active = heat.flatMap((row) => row.map((v, h) => (v ? h : -1))).filter((h) => h >= 0);
  const from = active.length ? Math.min(...active) : 11;
  const to = active.length ? Math.max(...active) : 23;
  const hours = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  return (
    <Card title="Horários de pico (pedidos)">
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-[2px] text-[11px]">
          <thead>
            <tr>
              <th />
              {hours.map((h) => (
                <th key={h} className="font-normal text-muted">
                  {h}h
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {heat.map((row, dow) => (
              <tr key={dow}>
                <th className="pr-1 text-left font-medium text-muted">{DOW[dow]}</th>
                {hours.map((h) => {
                  const v = row[h];
                  return (
                    <td
                      key={h}
                      title={`${DOW[dow]} ${h}h: ${v} pedido(s)`}
                      className="h-6 min-w-6 rounded-[3px]"
                      style={{
                        background: v ? `color-mix(in oklab, var(--color-brand) ${15 + (v / max) * 85}%, white)` : "var(--color-canvas)",
                      }}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted">
        Menos
        <span className="h-2.5 w-24 rounded-full" style={{ background: "linear-gradient(to right, color-mix(in oklab, var(--color-brand) 15%, white), var(--color-brand))" }} />
        Mais
      </div>
    </Card>
  );
}

function Ranking({ ranking }: { ranking: Stats["ranking"] }) {
  const sold = ranking.filter((r) => r.qty > 0);
  const max = Math.max(...sold.map((r) => r.revenue), 1);
  return (
    <Card title="Vendas por prato">
      {sold.length === 0 ? (
        <p className="text-sm text-muted">Nenhuma venda no período.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="pb-2 font-medium">Prato</th>
                <th className="pb-2 text-right font-medium">Qtd</th>
                <th className="pb-2 pl-4 font-medium">Receita</th>
                <th className="pb-2 text-right font-medium">Preparo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {sold.map((r) => (
                <tr key={r.name}>
                  <td className="py-2 pr-3 font-medium">
                    {r.name}
                    {r.cancelled > 0 && <span className="ml-1 text-xs text-red-600">({r.cancelled} canc.)</span>}
                  </td>
                  <td className="py-2 text-right tabular-nums">{r.qty}</td>
                  <td className="w-2/5 py-2 pl-4">
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-canvas">
                        <div className="h-full rounded-full bg-brand" style={{ width: `${(r.revenue / max) * 100}%` }} />
                      </div>
                      <span className="w-24 text-right tabular-nums">{formatBRL(r.revenue)}</span>
                    </div>
                  </td>
                  <td className="py-2 pl-3 text-right text-muted tabular-nums">{fmtMin(r.prepMin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
