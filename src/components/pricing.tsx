"use client";

import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { formatBRL } from "@/lib/money";
import { annualSavingsCents, cycleAmountCents, PLAN_KEYS, PLAN_PITCH, PLANS, type Cycle } from "@/lib/plans";

/** Alternância mensal/anual com o selo de desconto. */
export function CycleToggle({ value, onChange, className }: { value: Cycle; onChange: (c: Cycle) => void; className?: string }) {
  return (
    <div role="radiogroup" aria-label="Forma de cobrança" className={cn("inline-flex items-center rounded-full border border-line bg-surface p-1", className)}>
      {(["mensal", "anual"] as Cycle[]).map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          onClick={() => onChange(c)}
          className={cn(
            "inline-flex h-10 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors",
            value === c ? "bg-ink text-canvas" : "text-muted hover:text-ink",
          )}
        >
          {c === "mensal" ? "Mensal" : "Anual"}
          {c === "anual" && (
            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", value === c ? "bg-[var(--bm)] text-white" : "bg-emerald-100 text-emerald-800")}>
              −5%
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/** Vitrine de planos (home e /planos). */
export function Pricing({ initialCycle = "mensal" }: { initialCycle?: Cycle }) {
  const [cycle, setCycle] = useState<Cycle>(initialCycle);
  return (
    <div>
      <div className="flex justify-center">
        <CycleToggle value={cycle} onChange={setCycle} />
      </div>
      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        {PLAN_KEYS.map((p) => {
          const featured = p === "profissional";
          const amount = cycleAmountCents(p, cycle);
          return (
            <article
              key={p}
              className={cn(
                "relative flex flex-col rounded-[1.8rem] border p-7",
                featured ? "border-transparent bg-[#16120f] text-white shadow-[0_30px_60px_-30px_rgb(224_87_43/0.6)]" : "border-line bg-surface",
              )}
            >
              {featured && (
                <span className="absolute -top-3 left-7 rounded-full bg-[var(--bm)] px-3 py-1 text-xs font-bold text-white">Mais escolhido</span>
              )}
              <h3 className="font-serif text-2xl font-semibold">{PLANS[p].label}</h3>
              <p className={cn("mt-1 text-sm", featured ? "text-white/65" : "text-muted")}>{PLAN_PITCH[p].tagline}</p>
              <div className="mt-6 flex items-baseline gap-1.5">
                <span className="font-serif text-5xl font-semibold tracking-tight tabular-nums">{formatBRL(cycle === "mensal" ? amount : Math.round(amount / 12))}</span>
                <span className={cn("text-sm", featured ? "text-white/60" : "text-muted")}>/mês</span>
              </div>
              <p className={cn("mt-1 min-h-10 text-sm", featured ? "text-white/65" : "text-muted")}>
                {cycle === "anual" ? (
                  <>
                    {formatBRL(amount)} por ano · <strong className={featured ? "text-[#ffb79c]" : "text-emerald-700"}>economize {formatBRL(annualSavingsCents(p))}</strong>
                  </>
                ) : (
                  "Cobrança mensal no cartão de crédito"
                )}
              </p>
              <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                {PLAN_PITCH[p].bullets.map((b) => (
                  <li key={b} className="flex gap-2.5">
                    <Check className={cn("mt-0.5 size-4 shrink-0", featured ? "text-[#ffb79c]" : "text-[var(--bm)]")} aria-hidden />
                    {b}
                  </li>
                ))}
              </ul>
              <Link
                href={`/assinar?plano=${p}&ciclo=${cycle}`}
                className={cn(
                  "group mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-2xl font-semibold transition",
                  featured ? "bg-[var(--bm)] text-white hover:brightness-110" : "bg-ink text-canvas hover:opacity-90",
                )}
              >
                Assinar o {PLANS[p].label} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </Link>
            </article>
          );
        })}
      </div>
    </div>
  );
}
