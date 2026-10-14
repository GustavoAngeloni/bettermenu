import { Download } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { isValidDay, loadCashClosing, todayLocal } from "@/lib/cash";
import { formatBRL } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { formatTime } from "@/lib/time";
import { DayPicker } from "./day-picker";

export const metadata = { title: "Caixa · Better Menu" };

export default async function CashPage({ searchParams }: PageProps<"/admin/caixa">) {
  const { restaurant, features } = await requireStaff(["manager"]);
  if (!features.payments) redirect("/admin");
  const raw = (await searchParams).dia;
  const day = isValidDay(raw) ? raw : todayLocal();
  const supabase = await createClient();
  const c = await loadCashClosing(supabase, restaurant, day);
  const [y, m, d] = day.split("-");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight md:text-[2.15rem]">Fechamento de caixa</h1>
          <p className="text-sm text-muted">Mesas encerradas em {`${d}/${m}/${y}`}, com a forma de pagamento marcada pelo garçom.</p>
        </div>
        <div className="flex items-center gap-2">
          <DayPicker day={day} />
          {features.export && (
            <a
              href={`/admin/export?tipo=caixa&dia=${day}`}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-semibold hover:bg-surface-2"
            >
              <Download className="size-4" /> Excel
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Total recebido" value={formatBRL(c.totalCents)} hero />
        <Tile label="Vendas (sem serviço)" value={formatBRL(c.subtotalCents)} />
        <Tile label="Taxa de serviço" value={formatBRL(c.serviceCents)} />
        <Tile label="Mesas / pessoas" value={`${c.tables} / ${c.guests}`} />
        {c.discountCents > 0 && <Tile label="Descontos e cortesias" value={formatBRL(c.discountCents)} />}
        {c.cancelledCount > 0 && <Tile label="Itens cancelados" value={String(c.cancelledCount)} />}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Por forma de pagamento">
          {c.byMethod.length === 0 ? (
            <p className="text-sm text-muted">Nenhuma mesa encerrada neste dia.</p>
          ) : (
            <Rows rows={c.byMethod.map((r) => ({ label: r.label, sub: `${r.count} pessoa(s)`, cents: r.cents, warn: r.method === "nao_informado" }))} />
          )}
        </Card>
        <Card title="Por garçom (quem marcou o pagamento)">
          {c.byWaiter.length === 0 ? <p className="text-sm text-muted">—</p> : <Rows rows={c.byWaiter.map((r) => ({ label: r.name, sub: `${r.count} pessoa(s)`, cents: r.cents }))} />}
        </Card>
      </div>

      <Card title="Mesas encerradas">
        {c.sessions.length === 0 ? (
          <p className="text-sm text-muted">Nenhuma.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="pb-2 font-medium">Mesa</th>
                <th className="pb-2 font-medium">Horário</th>
                <th className="pb-2 text-right font-medium">Pessoas</th>
                <th className="pb-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {c.sessions.map((s, i) => (
                <tr key={i}>
                  <td className="py-2 font-semibold">
                    {s.table}
                    {s.unpaid > 0 && <span className="ml-2 text-xs font-normal text-amber-700">{s.unpaid} sem pagamento marcado</span>}
                  </td>
                  <td className="py-2 text-muted">
                    {formatTime(s.openedAt)} – {formatTime(s.closedAt)}
                  </td>
                  <td className="py-2 text-right tabular-nums">{s.guests}</td>
                  <td className="py-2 text-right font-semibold tabular-nums">{formatBRL(s.totalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <p className="text-xs text-muted">
        Dica: peça aos garçons para marcar a forma de pagamento de cada pessoa antes de liberar a mesa. <Link href="/garcom" className="text-brand-fg">Abrir tela do garçom</Link>
      </p>
    </div>
  );
}

function Tile({ label, value, hero }: { label: string; value: string; hero?: boolean }) {
  return (
    <div className={hero ? "rounded-[1.4rem] bg-ink p-5 text-canvas" : "rounded-[1.4rem] border border-line bg-surface p-5"}>
      <div className={hero ? "text-xs font-semibold text-canvas/70" : "text-xs font-semibold text-muted"}>{label}</div>
      <div className="mt-1 font-display text-3xl font-semibold tracking-tight tabular-nums">{value}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[1.4rem] border border-line bg-surface p-5">
      <h2 className="mb-4 font-display text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Rows({ rows }: { rows: { label: string; sub: string; cents: number; warn?: boolean }[] }) {
  const max = Math.max(...rows.map((r) => r.cents), 1);
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="flex justify-between text-sm">
            <span className={r.warn ? "font-medium text-amber-700" : "font-medium"}>
              {r.label} <span className="font-normal text-muted">· {r.sub}</span>
            </span>
            <span className="font-semibold tabular-nums">{formatBRL(r.cents)}</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-canvas">
            <div className={r.warn ? "h-full rounded-full bg-amber-400" : "h-full rounded-full bg-brand"} style={{ width: `${(r.cents / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
