import "server-only";
import { getPreapproval, type Preapproval } from "./billing";
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
  return { ...sub, ...patch };
}

export async function refreshFromMercadoPago(preapprovalId: string, opts?: { paid?: boolean }) {
  return syncPreapproval(await getPreapproval(preapprovalId), opts);
}
