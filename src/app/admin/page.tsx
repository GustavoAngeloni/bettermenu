import { BadgeDollarSign, Download, Lock, Star, TrendingUp } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { cn } from "@/lib/cn";
import { requireStaff } from "@/lib/auth";
import { MARGIN_CLASS, marginLevel } from "@/lib/finance";
import { formatBRL } from "@/lib/money";
import { loadStats, PERIODS, type Period, type Stats } from "@/lib/stats";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Estatísticas" };

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
    loadStats(supabase, restaurant.id, period, { finance: features.finance }),
    supabase.from("menu_items").select("*").eq("restaurant_id", restaurant.id).eq("available", true),
  ]);
  const withoutCost = ((menu ?? []) as { name: string; cost_cents?: number | null }[]).filter((m) => m.cost_cents == null).map((m) => m.name);

  // Pratos do cardápio que não venderam nada no período
  const soldNames = new Set(stats.ranking.filter((r) => r.qty > 0).map((r) => r.name));
  const neverSold = ((menu ?? []) as { name: string }[]).map((m) => m.name).filter((n) => !soldNames.has(n));

  const periodLabel = PERIODS[period].label.toLowerCase();
  const hour = Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hour12: false, timeZone: "America/Sao_Paulo" }).format(new Date()));
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const metrics = [
    // Ticket médio faz parte do controle financeiro (plano Profissional ou Premium)
    ...(features.finance
      ? [
          { label: "Ticket médio por mesa", value: formatBRL(stats.ticketPerTable), sub: "quanto cada mesa gasta" },
          { label: "Ticket médio por pessoa", value: formatBRL(stats.ticketPerGuest) },
        ]
      : []),
    { label: "Itens vendidos", value: String(stats.itemsSold), sub: stats.cancelledCount ? `${stats.cancelledCount} cancelados` : undefined },
    { label: "Tempo de preparo", value: fmtMin(stats.avgPrepMin), sub: "do pedido até ficar pronto" },
    { label: "Resposta ao chamado", value: fmtMin(stats.avgCallMin), sub: "até o garçom atender" },
    { label: "Permanência média", value: fmtMin(stats.avgStayMin), sub: "da chegada ao pagamento" },
    ...(features.ratings
      ? [
          {
            label: "Avaliação média",
            value: stats.ratings.count ? `${(((stats.ratings.food ?? 0) + (stats.ratings.service ?? 0)) / 2).toFixed(1)} ★` : "—",
            sub: stats.ratings.count ? `${stats.ratings.count} avaliações` : "sem avaliações no período",
          },
        ]
      : []),
    ...(stats.discountCents > 0 ? [{ label: "Descontos e cortesias", value: formatBRL(stats.discountCents), sub: "já descontados" }] : []),
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title={
          <>
            {greeting}, <span className="italic">{restaurant.name}</span>
          </>
        }
        description="Valores de vendas sem a taxa de serviço. Itens cancelados não entram."
        actions={
          <>
            {features.export && (
              <>
                <a href={`/admin/export?tipo=vendas&periodo=${period}`} className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line bg-surface px-4 text-sm font-semibold transition hover:border-line-strong">
                  <Download className="size-4" /> Vendas
                </a>
                <a href={`/admin/export?tipo=pedidos&periodo=${period}`} className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line bg-surface px-4 text-sm font-semibold transition hover:border-line-strong">
                  <Download className="size-4" /> Pedidos
                </a>
              </>
            )}
            <div className="flex rounded-full border border-line bg-surface p-1">
              {(Object.keys(PERIODS) as Period[]).map((p) => (
                <Link
                  key={p}
                  href={`/admin?periodo=${p}`}
                  className={cn("rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors", p === period ? "bg-ink text-canvas" : "text-muted hover:text-ink")}
                >
                  {PERIODS[p].label}
                </Link>
              ))}
            </div>
          </>
        }
      />

      <section className="overflow-hidden rounded-[1.6rem] border border-line bg-surface">
        <div className="grid lg:grid-cols-[18rem_1fr]">
          <div className="flex flex-col justify-between gap-6 border-b border-line p-6 lg:border-r lg:border-b-0">
            <div>
              <div className="text-sm font-semibold text-muted">Faturamento · {periodLabel}</div>
              <div className="mt-2 font-display text-5xl font-semibold tracking-tight tabular-nums">{formatBRL(stats.revenue)}</div>
            </div>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted">Mesas atendidas</dt>
                <dd className="mt-0.5 text-xl font-bold tabular-nums">{stats.tablesServed}</dd>
              </div>
              <div>
                <dt className="text-muted">Clientes</dt>
                <dd className="mt-0.5 text-xl font-bold tabular-nums">{stats.guests}</dd>
              </div>
            </dl>
          </div>
          <div className="p-6">
            {stats.byDay.length > 1 ? (
              <RevenueChart data={stats.byDay} />
            ) : (
              <div className="flex h-full min-h-40 items-center justify-center text-sm text-muted">O gráfico aparece quando houver vendas em mais de um dia.</div>
            )}
          </div>
        </div>
        <dl className="-mb-px grid grid-cols-2 overflow-hidden border-t border-line sm:grid-cols-3 xl:grid-cols-4">
          {metrics.map((m) => (
            <div key={m.label} className="-mr-px border-r border-b border-line p-5">
              <dt className="text-xs font-semibold text-muted">{m.label}</dt>
              <dd className="mt-1 text-2xl font-bold tracking-tight tabular-nums">{m.value}</dd>
              {m.sub && <dd className="mt-0.5 text-xs text-muted">{m.sub}</dd>}
            </div>
          ))}
        </dl>
      </section>

      {features.finance ? <FinancePanel stats={stats} withoutCost={withoutCost} periodLabel={periodLabel} /> : <FinanceLocked />}

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Ranking ranking={stats.ranking} finance={features.finance} />
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
    <section className={cn("min-w-0 rounded-[1.4rem] border border-line bg-surface p-4 sm:p-5 md:p-6", className)}>
      <h2 className="mb-4 font-display text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function RevenueChart({ data }: { data: Stats["byDay"] }) {
  const max = Math.max(...data.map((d) => d.cents), 1);
  const labelEvery = data.length > 31 ? 7 : data.length > 10 ? 3 : 1;
  return (
    <div>
      <div className="mb-4 text-sm font-semibold text-muted">Faturamento por dia</div>
      <div className="flex h-48 items-end gap-[3px]">
        {data.map((d, i) => {
          const [, m, day] = d.day.split("-");
          return (
            <div key={d.day} className="group relative flex h-full flex-1 flex-col justify-end">
              <div
                className="origin-bottom rounded-t-md bg-brand/80 transition-colors group-hover:bg-brand [animation:grow_0.8s_var(--ease-out-expo)_both]"
                style={{ height: `${Math.max((d.cents / max) * 100, d.cents ? 1.5 : 0)}%`, animationDelay: `${i * 18}ms` }}
              />
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded-lg bg-ink px-2.5 py-1.5 text-xs whitespace-nowrap text-canvas shadow-lg group-hover:block">
                {day}/{m} · <strong>{formatBRL(d.cents)}</strong>
              </div>
              <div className="absolute top-full mt-1 w-full text-center text-[10px] text-muted">{i % labelEvery === 0 ? `${day}/${m}` : ""}</div>
            </div>
          );
        })}
      </div>
      <div className="h-5 border-t border-line" />
      <style>{`@keyframes grow{from{transform:scaleY(0)}to{transform:scaleY(1)}}`}</style>
    </div>
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
                        background: v ? `color-mix(in oklab, var(--brand) ${15 + (v / max) * 85}%, var(--surface))` : "var(--color-canvas)",
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
        <span className="h-2.5 w-24 rounded-full" style={{ background: "linear-gradient(to right, color-mix(in oklab, var(--brand) 15%, var(--surface)), var(--brand))" }} />
        Mais
      </div>
    </Card>
  );
}

function Ranking({ ranking, finance }: { ranking: Stats["ranking"]; finance: boolean }) {
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
                {finance && <th className="pb-2 pl-3 text-right font-medium">Lucro</th>}
                <th className="pb-2 text-right font-medium">Preparo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {sold.map((r) => (
                <tr key={r.name}>
                  <td className="py-2 pr-3 font-medium">
                    {r.name}
                    {r.cancelled > 0 && <span className="ml-1 text-xs text-red-600 dark:text-red-400">({r.cancelled} canc.)</span>}
                  </td>
                  <td className="py-2 text-right tabular-nums">{r.qty}</td>
                  <td className="py-2 pl-4 sm:w-2/5">
                    <div className="flex items-center gap-2">
                      <div className="hidden h-2 flex-1 overflow-hidden rounded-full bg-canvas sm:block">
                        <div className="h-full rounded-full bg-brand" style={{ width: `${(r.revenue / max) * 100}%` }} />
                      </div>
                      <span className="w-full text-right whitespace-nowrap tabular-nums sm:w-24">{formatBRL(r.revenue)}</span>
                    </div>
                  </td>
                  {finance && (
                    <td className="py-2 pl-3 text-right whitespace-nowrap tabular-nums">
                      {r.profit != null && r.marginPct != null ? (
                        <>
                          {formatBRL(r.profit)}
                          <span className={cn("ml-1.5 rounded-full px-1.5 py-px text-[11px] font-bold", MARGIN_CLASS[marginLevel(r.marginPct)])}>{r.marginPct}%</span>
                        </>
                      ) : (
                        <span className="text-xs text-muted">sem custo</span>
                      )}
                    </td>
                  )}
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

/** Lucro e margem: o que sobra das vendas depois do custo dos produtos. */
function FinancePanel({ stats, withoutCost, periodLabel }: { stats: Stats; withoutCost: string[]; periodLabel: string }) {
  const f = stats.finance;
  const costed = stats.ranking.filter((r) => r.qty > 0 && r.marginPct != null);
  const attention = [...costed].sort((a, b) => a.marginPct! - b.marginPct!).filter((r) => marginLevel(r.marginPct!) !== "ok").slice(0, 5);
  const champions = [...costed].sort((a, b) => b.profit! - a.profit!).slice(0, 3);
  if (f.costedRevenue === 0) {
    return (
      <section className="flex flex-col gap-4 rounded-[1.6rem] border border-dashed border-line-strong bg-surface p-6 md:flex-row md:items-center">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-fg">
          <BadgeDollarSign className="size-6" />
        </span>
        <div className="flex-1">
          <h2 className="font-display text-xl font-semibold">Descubra quanto você lucra em cada prato</h2>
          <p className="mt-1 text-sm text-muted">Informe o custo médio de cada prato no Cardápio. O painel passa a mostrar lucro, margem e os pratos que precisam de atenção.</p>
        </div>
        <Link href="/admin/cardapio" className="inline-flex h-11 items-center rounded-xl bg-brand px-5 text-sm font-semibold text-on-brand">
          Cadastrar custos
        </Link>
      </section>
    );
  }
  const cards = [
    { label: "Vendas com custo", value: formatBRL(f.costedRevenue), sub: `${f.coveragePct}% do faturamento` },
    { label: "Custo dos produtos (CMV)", value: formatBRL(f.cost), sub: f.costedRevenue ? `${Math.round((f.cost / f.costedRevenue) * 100)}% das vendas` : undefined },
    { label: "Lucro bruto", value: formatBRL(f.profit), sub: f.marginPct != null ? `margem de ${f.marginPct}%` : undefined, strong: true },
    { label: "Lucro médio por mesa", value: f.profitPerTable != null ? formatBRL(f.profitPerTable) : "—", sub: "antes de despesas fixas" },
  ];
  return (
    <section className="overflow-hidden rounded-[1.6rem] border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
          <TrendingUp className="size-5 text-brand-fg" /> Lucro e margem · {periodLabel}
        </h2>
        <span className="text-xs text-muted">Lucro bruto = vendas − custo dos produtos (sem aluguel, salários e taxas)</span>
      </div>
      <dl className="grid grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className={cn("border-b border-line p-5 lg:border-r lg:last:border-r-0", c.strong && "bg-emerald-50")}>
            <dt className="text-xs font-semibold text-muted">{c.label}</dt>
            <dd className={cn("mt-1 text-2xl font-bold tracking-tight tabular-nums", c.strong && "text-emerald-800")}>{c.value}</dd>
            {c.sub && <dd className="mt-0.5 text-xs text-muted">{c.sub}</dd>}
          </div>
        ))}
      </dl>
      <div className="grid gap-6 p-6 md:grid-cols-3">
        <div>
          <h3 className="mb-2 text-sm font-bold">Mais lucrativos</h3>
          <ul className="space-y-1.5 text-sm">
            {champions.map((r) => (
              <li key={r.name} className="flex justify-between gap-3">
                <span className="truncate">{r.name}</span>
                <span className="font-semibold tabular-nums">{formatBRL(r.profit!)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-bold">Precisam de atenção</h3>
          {attention.length === 0 ? (
            <p className="text-sm text-muted">Todos os pratos com custo têm margem saudável.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {attention.map((r) => (
                <li key={r.name} className="flex justify-between gap-3">
                  <span className="truncate">{r.name}</span>
                  <span className={cn("rounded-full px-2 py-px text-xs font-bold", MARGIN_CLASS[marginLevel(r.marginPct!)])}>{r.marginPct}%</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-muted">Margem abaixo de 60% (custo acima de 40% do preço) acende o alerta.</p>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-bold">Sem custo cadastrado</h3>
          {withoutCost.length === 0 ? (
            <p className="text-sm text-muted">Todos os pratos têm custo. Ótimo!</p>
          ) : (
            <>
              <p className="text-sm text-muted">
                {withoutCost.slice(0, 4).join(", ")}
                {withoutCost.length > 4 && ` e mais ${withoutCost.length - 4}`}
              </p>
              <Link href="/admin/cardapio" className="mt-2 inline-block text-sm font-semibold text-brand-fg">
                Completar no Cardápio →
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

/** Plano sem controle financeiro: mostra o que existe no Profissional. */
function FinanceLocked() {
  return (
    <section className="flex flex-col gap-4 rounded-[1.6rem] border border-line bg-surface p-6 md:flex-row md:items-center">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-surface-2 text-muted">
        <Lock className="size-5" />
      </span>
      <div className="flex-1">
        <h2 className="font-display text-xl font-semibold">Controle financeiro</h2>
        <p className="mt-1 text-sm text-muted">
          Ticket médio por mesa e por pessoa, custo de cada prato, lucro e margem, fechamento de caixa e relatórios em Excel. Disponível nos planos Profissional e
          Premium: fale com a insight para ativar.
        </p>
      </div>
    </section>
  );
}
