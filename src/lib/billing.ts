import "server-only";
import crypto from "node:crypto";
import { createAdminClient } from "./supabase/server";
import { cycleAmountCents, PLANS, type Cycle, type PlanKey } from "./plans";

// Integração com o Mercado Pago (Assinaturas).
// - Cada plano × ciclo vira um "plano de assinatura" no Mercado Pago (criado sob demanda e guardado em billing_plans).
// - O cartão é digitado no formulário seguro do Mercado Pago (Card Payment Brick) dentro do nosso checkout;
//   com o token, criamos a assinatura (preapproval) já autorizada.
// - O webhook mantém status, próxima cobrança e "pago até" do restaurante.

const API = (process.env.MERCADOPAGO_API_URL || "https://api.mercadopago.com").replace(/\/$/, "");

export const billingConfigured = () => !!process.env.MERCADOPAGO_ACCESS_TOKEN && !!process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY;

async function mp<T>(path: string, init: { method?: string; body?: unknown; idempotencyKey?: string } = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: init.method ?? "GET",
    headers: {
      authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
      "content-type": "application/json",
      ...(init.idempotencyKey ? { "x-idempotency-key": init.idempotencyKey } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as T & { message?: string; cause?: { description?: string }[] };
  if (!res.ok) {
    const detail = data?.cause?.[0]?.description || data?.message || `HTTP ${res.status}`;
    throw new MercadoPagoError(detail, res.status);
  }
  return data;
}

export class MercadoPagoError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

const reais = (cents: number) => Math.round(cents) / 100;
const frequency = (cycle: Cycle) => ({ frequency: cycle === "mensal" ? 1 : 12, frequency_type: "months" as const });
const planReason = (plan: PlanKey, cycle: Cycle) => `Better Menu ${PLANS[plan].label} · ${cycle === "mensal" ? "Mensal" : "Anual (5% off)"}`;

/** Id do plano no Mercado Pago (cria na primeira vez; se o preço mudar, cria um novo). */
export async function ensureMpPlan(plan: PlanKey, cycle: Cycle, appUrl: string): Promise<string> {
  const amount = cycleAmountCents(plan, cycle);
  const db = createAdminClient();
  const { data: cached } = await db.from("billing_plans").select("mp_plan_id").eq("plan", plan).eq("cycle", cycle).eq("amount_cents", amount).maybeSingle();
  if (cached?.mp_plan_id) return cached.mp_plan_id;

  const created = await mp<{ id: string }>("/preapproval_plan", {
    method: "POST",
    idempotencyKey: `bm-plan-${plan}-${cycle}-${amount}`,
    body: {
      reason: planReason(plan, cycle),
      auto_recurring: { ...frequency(cycle), transaction_amount: reais(amount), currency_id: "BRL" },
      payment_methods_allowed: { payment_types: [{ id: "credit_card" }] },
      back_url: `${appUrl}/assinar/sucesso`,
    },
  });
  await db.from("billing_plans").upsert({ plan, cycle, amount_cents: amount, mp_plan_id: created.id }, { onConflict: "plan,cycle,amount_cents" });
  return created.id;
}

export interface Preapproval {
  id: string;
  status: string; // pending, authorized, paused, cancelled
  external_reference?: string;
  preapproval_plan_id?: string;
  payer_email?: string;
  next_payment_date?: string;
  date_created?: string;
  last_modified?: string;
  auto_recurring?: { transaction_amount?: number };
}

/** Cria a assinatura com o cartão tokenizado pelo formulário do Mercado Pago. */
export async function createPreapproval(input: {
  plan: PlanKey;
  cycle: Cycle;
  mpPlanId: string;
  subscriptionId: string;
  payerEmail: string;
  cardTokenId: string;
  appUrl: string;
}) {
  return mp<Preapproval>("/preapproval", {
    method: "POST",
    idempotencyKey: `bm-sub-${input.subscriptionId}`,
    body: {
      preapproval_plan_id: input.mpPlanId,
      reason: planReason(input.plan, input.cycle),
      external_reference: input.subscriptionId,
      payer_email: input.payerEmail,
      card_token_id: input.cardTokenId,
      auto_recurring: { ...frequency(input.cycle), transaction_amount: reais(cycleAmountCents(input.plan, input.cycle)), currency_id: "BRL" },
      status: "authorized",
      back_url: `${input.appUrl}/assinar/sucesso`,
    },
  });
}

export const getPreapproval = (id: string) => mp<Preapproval>(`/preapproval/${encodeURIComponent(id)}`);
export const getAuthorizedPayment = (id: string) =>
  mp<{ id: number; preapproval_id: string; status: string; date_created?: string; last_modified?: string; payment?: { status?: string } }>(
    `/authorized_payments/${encodeURIComponent(id)}`,
  );

/** Cancela ou pausa a assinatura no Mercado Pago. */
export const updatePreapprovalStatus = (id: string, status: "cancelled" | "paused" | "authorized") =>
  mp<Preapproval>(`/preapproval/${encodeURIComponent(id)}`, { method: "PUT", body: { status } });

/**
 * Valida a assinatura do webhook (header x-signature: "ts=...,v1=...").
 * Manifesto: "id:{data.id};request-id:{x-request-id};ts:{ts};" com HMAC-SHA256 da chave secreta do webhook.
 */
export function verifyWebhook(headers: Headers, dataId: string | null) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) return true; // sem chave configurada, a origem é confirmada consultando a API do Mercado Pago
  const sig = headers.get("x-signature") ?? "";
  const parts = Object.fromEntries(sig.split(",").map((p) => p.trim().split("=") as [string, string]));
  if (!parts.ts || !parts.v1) return false;
  let manifest = "";
  if (dataId) manifest += `id:${/^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId};`;
  const requestId = headers.get("x-request-id");
  if (requestId) manifest += `request-id:${requestId};`;
  manifest += `ts:${parts.ts};`;
  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  return expected.length === parts.v1.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
}

export const SUBSCRIPTION_STATUS: Record<string, { label: string; tone: "ok" | "warn" | "bad" }> = {
  authorized: { label: "Ativa", tone: "ok" },
  pending: { label: "Aguardando pagamento", tone: "warn" },
  paused: { label: "Pausada", tone: "warn" },
  cancelled: { label: "Cancelada", tone: "bad" },
  failed: { label: "Pagamento recusado", tone: "bad" },
};
