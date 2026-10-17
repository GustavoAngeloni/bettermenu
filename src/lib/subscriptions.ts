import "server-only";
import { getPreapproval, type Preapproval } from "./billing";
import { brl, dateBR, EMAIL, firstName, sendTemplate } from "./email";
import { PLANS, planOf } from "./plans";
import { createAdminClient } from "./supabase/server";

const day = (iso?: string | null) => (iso ? iso.slice(0, 10) : null);

/** Aplica o plano contratado ao restaurante e às unidades do grupo. */
export async function applyPlanToGroup(restaurantId: string, planRaw: string, paidUntil: string | null) {
  const db = createAdminClient();
  const plan = planOf(planRaw);
  const { data: r } = await db.from("restaurants").select("id, group_id").eq("id", restaurantId).maybeSingle();
  if (!r) return;
  const root = r.group_id ?? r.id;
  const { data: group } = await db.from("restaurants").select("id").or(`id.eq.${root},group_id.eq.${root}`);
  const ids = ((group ?? [{ id: r.id }]) as { id: string }[]).map((g) => g.id);
  await db
    .from("restaurants")
    .update({ plan, max_tables: PLANS[plan].maxTables, max_stations: PLANS[plan].maxStations, ...(paidUntil ? { paid_until: paidUntil } : {}) })
    .in("id", ids);
}

/** Sincroniza nossa assinatura com o estado no Mercado Pago (chamado pelo checkout e pelo webhook). */
export async function syncPreapproval(pre: Preapproval, { paid = false } = {}) {
  const db = createAdminClient();
  const byMp = await db.from("subscriptions").select("*").eq("mp_preapproval_id", pre.id).maybeSingle();
  let sub = byMp.data;
  if (!sub && pre.external_reference) {
    const byRef = await db.from("subscriptions").select("*").eq("id", pre.external_reference).maybeSingle();
    sub = byRef.data;
  }
  if (!sub) return null;

  const status = ["authorized", "paused", "cancelled", "pending"].includes(pre.status) ? pre.status : sub.status;
  const patch: Record<string, unknown> = {
    status,
    mp_preapproval_id: pre.id,
    next_payment_date: pre.next_payment_date ?? sub.next_payment_date,
    updated_at: new Date().toISOString(),
  };
  if (paid) patch.last_payment_at = new Date().toISOString();
  await db.from("subscriptions").update(patch).eq("id", sub.id);

  // Restaurante pago até a próxima cobrança; o plano acompanha a assinatura ativa.
  if (sub.restaurant_id && status === "authorized") await applyPlanToGroup(sub.restaurant_id, sub.plan, day(pre.next_payment_date));

  // Avisos por e-mail quando o status muda (o Mercado Pago pausa depois de tentativas de cobrança sem sucesso)
  if (status !== sub.status && sub.payer_email) {
    const restaurant = sub.restaurant_name ?? "seu restaurante";
    if (status === "cancelled") {
      const { data: r } = sub.restaurant_id ? await db.from("restaurants").select("paid_until").eq("id", sub.restaurant_id).maybeSingle() : { data: null };
      await sendTemplate(
        EMAIL.assinaturaCancelada,
        sub.payer_email,
        { NOME: firstName(sub.owner_name), RESTAURANTE: restaurant, ACESSO_ATE: dateBR(r?.paid_until ?? sub.next_payment_date) },
        { idempotencyKey: `cancelada-${sub.id}` },
      );
    } else if (status === "paused") {
      await sendTemplate(
        EMAIL.pagamentoRecusado,
        sub.payer_email,
        { NOME: firstName(sub.owner_name), RESTAURANTE: restaurant, PLANO: PLANS[planOf(sub.plan)].label, VALOR: brl(sub.amount_cents) },
        { idempotencyKey: `pausada-${sub.id}-${pre.last_modified ?? ""}` },
      );
    }
  }
  return { ...sub, ...patch };
}

export async function refreshFromMercadoPago(preapprovalId: string, opts?: { paid?: boolean }) {
  return syncPreapproval(await getPreapproval(preapprovalId), opts);
}

/** Renovação cobrada (aprovada ou recusada): e-mail para o dono. A primeira cobrança já tem o e-mail de acesso. */
export async function notifyRenewal(preapprovalId: string, paymentId: string, approved: boolean) {
  const db = createAdminClient();
  const { data: sub } = await db.from("subscriptions").select("*").eq("mp_preapproval_id", preapprovalId).maybeSingle();
  if (!sub?.payer_email) return;
  const firstCharge = Date.now() - new Date(sub.created_at).getTime() < 36 * 3600_000;
  if (approved && firstCharge) return;
  const vars = { NOME: firstName(sub.owner_name), RESTAURANTE: sub.restaurant_name ?? "seu restaurante", PLANO: PLANS[planOf(sub.plan)].label, VALOR: brl(sub.amount_cents) };
  if (approved) {
    await sendTemplate(EMAIL.pagamentoConfirmado, sub.payer_email, { ...vars, PROXIMA_COBRANCA: dateBR(sub.next_payment_date) }, { idempotencyKey: `pago-${paymentId}` });
  } else {
    await sendTemplate(EMAIL.pagamentoRecusado, sub.payer_email, vars, { idempotencyKey: `recusado-${paymentId}` });
  }
}
