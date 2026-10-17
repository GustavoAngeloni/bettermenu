// Funções que podem ser ligadas/desligadas por restaurante (configuradas no /super).
// Uma função desligada some de todas as telas e é recusada pelo servidor.
// Algumas dependem do plano contratado (lib/plans.ts).

import { planAllows } from "./plans";

export const FEATURE_GROUPS = ["Cliente", "Garçom", "Cozinha", "Dono"] as const;
export type FeatureGroup = (typeof FEATURE_GROUPS)[number];

export const FEATURES = [
  // Cliente
  { key: "customer_ordering", group: "Cliente", label: "Cliente faz pedidos pelo celular", hint: "Desligado: o QR mostra só o cardápio e os pedidos são lançados pelo garçom." },
  { key: "call_waiter", group: "Cliente", label: "Chamar garçom pelo app" },
  { key: "request_bill", group: "Cliente", label: "Pedir a conta pelo app" },
  { key: "bill_view", group: "Cliente", label: "Cliente vê a conta dividida por pessoa" },
  { key: "item_sharing", group: "Cliente", label: "Dividir itens entre pessoas" },
  { key: "reorder", group: "Cliente", label: "“Pedir de novo”" },
  { key: "cancel_pending", group: "Cliente", label: "Cliente cancela item enquanto “Recebido”" },
  { key: "suggestions", group: "Cliente", label: "Sugestões e selos (Mais pedido, Novo, Destaque)" },
  { key: "dietary", group: "Cliente", label: "Filtros e alérgenos (vegetariano, sem glúten...)" },
  { key: "languages", group: "Cliente", label: "Cardápio em inglês e espanhol" },
  { key: "ratings", group: "Cliente", label: "Avaliação ao final" },
  { key: "eta", group: "Cliente", label: "Tempo estimado de preparo" },
  // Garçom
  { key: "waiter_ordering", group: "Garçom", label: "Garçom lança pedidos" },
  { key: "table_transfer", group: "Garçom", label: "Transferir e juntar mesas" },
  { key: "move_items", group: "Garçom", label: "Mover item entre pessoas" },
  { key: "discounts", group: "Garçom", label: "Desconto e cortesia (gerente)" },
  { key: "payments", group: "Garçom", label: "Forma de pagamento + fechamento de caixa" },
  { key: "sectors", group: "Garçom", label: "Setores (mesas por garçom)" },
  { key: "push", group: "Garçom", label: "Alertas com o celular bloqueado" },
  // Cozinha
  { key: "kitchen_soldout", group: "Cozinha", label: "Cozinha marca “esgotado”" },
  { key: "kitchen_totals", group: "Cozinha", label: "Totais agrupados por prato" },
  { key: "kitchen_print", group: "Cozinha", label: "Impressão de comanda" },
  // Dono
  { key: "scheduled_menu", group: "Dono", label: "Cardápio por horário e happy hour" },
  { key: "stock", group: "Dono", label: "Controle de estoque" },
  { key: "combos", group: "Dono", label: "Combos" },
  { key: "export", group: "Dono", label: "Exportar relatórios (Excel)" },
  { key: "finance", group: "Dono", label: "Controle financeiro: ticket médio, custo e lucro por prato", hint: "O dono informa o custo de cada prato e vê margem e lucro no painel." },
  { key: "public_page", group: "Dono", label: "Página pública do cardápio (Google e IAs)", hint: "Cardápio só para consulta em /r/{código}, com dados estruturados para buscadores. Pedidos continuam só pelo QR da mesa." },
] as const satisfies readonly { key: string; group: FeatureGroup; label: string; hint?: string }[];

export type FeatureKey = (typeof FEATURES)[number]["key"];
export type Features = Record<FeatureKey, boolean>;

export const ALL_FEATURE_KEYS = FEATURES.map((f) => f.key) as FeatureKey[];

/** Liga/desliga gravado no restaurante. Funções não configuradas contam como ligadas (restaurantes antigos ganham tudo). */
export function storedFeatures(raw: unknown): Features {
  const stored = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<string, unknown>>;
  return Object.fromEntries(ALL_FEATURE_KEYS.map((k) => [k, stored[k] !== false])) as Features;
}

/**
 * Funções efetivas do restaurante: o que está ligado E o plano contratado permite
 * (ver PLAN_GATED em plans.ts). Função fora do plano some das telas e é recusada pelo servidor.
 */
export function resolveFeatures(raw: unknown, plan: string | null | undefined): Features {
  const stored = storedFeatures(raw);
  return Object.fromEntries(ALL_FEATURE_KEYS.map((k) => [k, stored[k] && planAllows(plan, k)])) as Features;
}

/** Lê os checkboxes `feature_<key>` de um formulário. */
export function featuresFromForm(form: FormData): Features {
  return Object.fromEntries(ALL_FEATURE_KEYS.map((k) => [k, form.get(`feature_${k}`) === "on"])) as Features;
}
