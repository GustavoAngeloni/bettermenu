"use client";

import { useState } from "react";
import { FEATURE_GROUPS, FEATURES, type Features } from "@/lib/features";
import { cn } from "@/lib/cn";

/**
 * Checkboxes das funções do restaurante, agrupadas.
 * Envia `feature_<key>=on` para cada função marcada (lido por featuresFromForm).
 */
export function FeatureChecklist({ initial }: { initial?: Features }) {
  const [on, setOn] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(FEATURES.map((f) => [f.key, initial ? initial[f.key] : true])),
  );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {FEATURE_GROUPS.map((group) => {
        const list = FEATURES.filter((f) => f.group === group);
        const allOn = list.every((f) => on[f.key]);
        return (
          <fieldset key={group} className="rounded-2xl border border-line p-4">
            <legend className="flex w-full items-center justify-between px-1">
              <span className="font-semibold">{group}</span>
            </legend>
            <button
              type="button"
              onClick={() => setOn({ ...on, ...Object.fromEntries(list.map((f) => [f.key, !allOn])) })}
              className="mb-2 text-xs font-semibold text-brand-fg"
            >
              {allOn ? "Desmarcar todas" : "Marcar todas"}
            </button>
            <div className="space-y-1">
              {list.map((f) => (
                <label
                  key={f.key}
                  className={cn("flex cursor-pointer items-start gap-3 rounded-lg px-2 py-1.5 hover:bg-stone-50", !on[f.key] && "text-muted")}
                >
                  <input
                    type="checkbox"
                    name={`feature_${f.key}`}
                    checked={on[f.key]}
                    onChange={(e) => setOn({ ...on, [f.key]: e.target.checked })}
                    className="mt-0.5 size-4 shrink-0 accent-[var(--brand)]"
                  />
                  <span className="text-sm">
                    {f.label}
                    {"hint" in f && f.hint && <span className="block text-xs text-muted">{f.hint}</span>}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
