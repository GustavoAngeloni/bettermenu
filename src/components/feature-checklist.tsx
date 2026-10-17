"use client";

import { useState } from "react";
import { FEATURE_GROUPS, FEATURES, type Features } from "@/lib/features";
import { cn } from "@/lib/cn";
import { PLAN_GATED, planAllows, PLANS, type PlanKey } from "@/lib/plans";

/**
 * Checkboxes das funções do restaurante, agrupadas.
 * Envia `feature_<key>=on` para cada função marcada (lido por featuresFromForm).
 */
export function FeatureChecklist({ initial, plan }: { initial?: Features; plan?: PlanKey }) {
  const [on, setOn] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(FEATURES.map((f) => [f.key, initial ? initial[f.key] : true])),
  );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {FEATURE_GROUPS.map((group) => {
        const list = FEATURES.filter((f) => f.group === group);
        const allowed = (k: string) => !plan || planAllows(plan, k as keyof Features);
        const allOn = list.filter((f) => allowed(f.key)).every((f) => on[f.key]);
        return (
          <fieldset key={group} className="rounded-2xl border border-line p-4">
            <legend className="flex w-full items-center justify-between px-1">
              <span className="font-semibold">{group}</span>
            </legend>
            <button
              type="button"
              onClick={() => setOn({ ...on, ...Object.fromEntries(list.filter((f) => allowed(f.key)).map((f) => [f.key, !allOn])) })}
              className="mb-2 text-xs font-semibold text-brand-fg"
            >
              {allOn ? "Desmarcar todas" : "Marcar todas"}
            </button>
            <div className="space-y-1">
              {list.map((f) => {
                const ok = allowed(f.key);
                const min = PLAN_GATED[f.key];
                return (
                  <label
                    key={f.key}
                    className={cn(
                      "flex items-start gap-3 rounded-lg px-2 py-1.5",
                      ok ? "cursor-pointer hover:bg-stone-50" : "cursor-not-allowed opacity-60",
                      (!on[f.key] || !ok) && "text-muted",
                    )}
                  >
                    <input
                      type="checkbox"
                      name={ok ? `feature_${f.key}` : undefined}
                      checked={ok && on[f.key]}
                      disabled={!ok}
                      onChange={(e) => setOn({ ...on, [f.key]: e.target.checked })}
                      className="mt-0.5 size-4 shrink-0 accent-[var(--brand)]"
                    />
                    {/* fora do plano: guarda a escolha para quando o plano mudar */}
                    {!ok && on[f.key] && <input type="hidden" name={`feature_${f.key}`} value="on" />}
                    <span className="text-sm">
                      {f.label}
                      {min && (
                        <span
                          className={cn(
                            "ml-1.5 inline-block rounded-full px-1.5 py-px align-middle text-[10px] font-bold uppercase",
                            min === "premium" ? "bg-violet-100 text-violet-800" : "bg-sky-100 text-sky-800",
                          )}
                        >
                          {PLANS[min].label}
                        </span>
                      )}
                      {"hint" in f && f.hint && <span className="block text-xs text-muted">{f.hint}</span>}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
