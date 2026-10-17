import { Check, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { PLAN_HIGHLIGHTS, PLAN_KEYS, PLANS, planOf } from "@/lib/plans";

/** Cartela de funcionalidades por plano, com o plano contratado em destaque. */
export function PlanCard({ plan, units }: { plan: string; units?: number }) {
  const current = planOf(plan);
  return (
    <section className="overflow-hidden rounded-[1.4rem] border border-line bg-surface">
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-5 pb-3">
        <h2 className="font-display text-xl font-semibold">
          Seu plano: <span className="text-brand-fg">{PLANS[current].label}</span>
        </h2>
        {units != null && (
          <span className="text-sm text-muted">
            {units} de {PLANS[current].maxRestaurants} restaurante(s)
          </span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs sm:text-sm">
          <thead>
            <tr className="border-y border-line bg-surface-2 text-xs text-muted">
              <th className="px-3 py-2 text-left font-semibold sm:px-5">Funcionalidade</th>
              {PLAN_KEYS.map((p) => (
                <th key={p} className={cn("px-1.5 py-2 text-center font-semibold sm:px-3", p === current && "bg-brand-soft text-brand-fg")}>
                  {PLANS[p].label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {PLAN_HIGHLIGHTS.map((row) => (
              <tr key={row.label}>
                <td className="px-3 py-2.5 sm:px-5">{row.label}</td>
                {PLAN_KEYS.map((p) => {
                  const v = row.values[p];
                  return (
                    <td key={p} className={cn("px-1.5 py-2.5 text-center font-semibold sm:px-3", p === current && "bg-brand-soft/60")}>
                      {v === true ? (
                        <Check className="mx-auto size-4 text-emerald-600" aria-label="Incluso" />
                      ) : v === false ? (
                        <X className="mx-auto size-4 text-red-500" aria-label="Não incluso" />
                      ) : (
                        v
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-5 py-3 text-xs text-muted">Para mudar de plano ou abrir outra unidade, fale com a equipe insight.</p>
    </section>
  );
}
