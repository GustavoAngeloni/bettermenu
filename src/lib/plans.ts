export const PLANS = {
  essencial: { label: "Essencial", maxTables: 10, priceCents: 14900 },
  profissional: { label: "Profissional", maxTables: 30, priceCents: 24900 },
  premium: { label: "Premium", maxTables: null, priceCents: 39900 },
} as const;

export type PlanKey = keyof typeof PLANS;

export function planLabel(plan: string) {
  return PLANS[plan as PlanKey]?.label ?? plan;
}
