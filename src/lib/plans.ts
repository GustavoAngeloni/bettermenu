import type { FeatureKey } from "./features";

// Planos contratados (cartela de funcionalidades por perfil, out/2026).
// Limites: null = ilimitado. `includes`: funções que dependem do plano;
// as demais funções valem para todos os planos e seguem o liga/desliga do /super.

export const PLAN_KEYS = ["essencial", "profissional", "premium"] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

/** Funções que só existem a partir de um plano. */
export const PLAN_GATED: Partial<Record<FeatureKey, PlanKey>> = {
  customer_ordering: "profissional", // cliente lança o pedido
  finance: "profissional", // controle financeiro: ticket médio, custo e lucro
  payments: "profissional", // forma de pagamento + fechamento de caixa
  export: "profissional", // relatórios em Excel
  scheduled_menu: "premium", // happy hour e cardápio por horário
  languages: "premium", // tradução para inglês e espanhol
};

export const PLANS = {
  essencial: { label: "Essencial", maxTables: 10, maxRestaurants: 1, maxStations: 1, priceCents: 14900 },
  profissional: { label: "Profissional", maxTables: 30, maxRestaurants: 3, maxStations: 2, priceCents: 24900 },
  premium: { label: "Premium", maxTables: null, maxRestaurants: 5, maxStations: null, priceCents: 39900 },
} as const satisfies Record<PlanKey, { label: string; maxTables: number | null; maxRestaurants: number; maxStations: number | null; priceCents: number }>;

const RANK: Record<PlanKey, number> = { essencial: 0, profissional: 1, premium: 2 };

/** Plano válido (restaurantes antigos sem plano reconhecido contam como Profissional, o padrão do banco). */
export function planOf(plan: string | null | undefined): PlanKey {
  return plan && plan in PLANS ? (plan as PlanKey) : "profissional";
}

export function planLabel(plan: string) {
  return PLANS[plan as PlanKey]?.label ?? plan;
}

/** A função está disponível neste plano? */
export function planAllows(plan: string | null | undefined, key: FeatureKey) {
  const min = PLAN_GATED[key];
  return !min || RANK[planOf(plan)] >= RANK[min];
}

/** Resumo para a cartela (Configurações e site). */
export const PLAN_HIGHLIGHTS: { label: string; values: Record<PlanKey, string | boolean> }[] = [
  { label: "Mesas", values: { essencial: "10", profissional: "30", premium: "Ilimitadas" } },
  { label: "Restaurantes (unidades)", values: { essencial: "1", profissional: "3", premium: "5" } },
  { label: "Estações de preparo", values: { essencial: "1", profissional: "2", premium: "Ilimitadas" } },
  { label: "Cardápio digital", values: { essencial: true, profissional: true, premium: true } },
  { label: "Avaliações dos clientes", values: { essencial: true, profissional: true, premium: true } },
  { label: "Controle financeiro (ticket médio, custo e lucro, caixa)", values: { essencial: false, profissional: true, premium: true } },
  { label: "Cliente lança o pedido", values: { essencial: false, profissional: true, premium: true } },
  { label: "Happy hour e cardápio por horário", values: { essencial: false, profissional: false, premium: true } },
  { label: "Tradução para inglês e espanhol", values: { essencial: false, profissional: false, premium: true } },
];
