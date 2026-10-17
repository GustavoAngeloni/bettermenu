// Controle financeiro: margem de cada prato a partir do custo informado pelo dono.

/** Margem abaixo disso acende o alerta (referência comum em restaurantes: CMV até ~35%). */
export const LOW_MARGIN_PCT = 60;

export function margin(priceCents: number, costCents: number | null | undefined) {
  if (costCents == null || priceCents <= 0) return null;
  const profit = priceCents - costCents;
  return { profit, pct: Math.round((profit / priceCents) * 100), cmvPct: Math.round((costCents / priceCents) * 100) };
}

export type MarginLevel = "loss" | "low" | "ok";
export function marginLevel(pct: number): MarginLevel {
  return pct <= 0 ? "loss" : pct < LOW_MARGIN_PCT ? "low" : "ok";
}

export const MARGIN_CLASS: Record<MarginLevel, string> = {
  loss: "bg-red-100 text-red-700",
  low: "bg-amber-100 text-amber-800",
  ok: "bg-emerald-100 text-emerald-800",
};
