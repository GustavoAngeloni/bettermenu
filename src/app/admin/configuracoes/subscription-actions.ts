"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { updatePreapprovalStatus } from "@/lib/billing";
import { dateBR, EMAIL, firstName, sendTemplate } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/server";

/** Dono cancela a assinatura: para as próximas cobranças; o acesso segue até o fim do período pago. */
export async function cancelSubscription(subscriptionId: string): Promise<string | null> {
  const { profile, restaurant } = await requireStaff(["owner"]);
  if (profile.role !== "owner") return "Só o dono pode cancelar";
  const db = createAdminClient();
  const { data: sub } = await db.from("subscriptions").select("id, restaurant_id, mp_preapproval_id").eq("id", subscriptionId).maybeSingle();
  if (!sub || sub.restaurant_id !== restaurant.id) return "Assinatura não encontrada";
  if (sub.mp_preapproval_id) {
    try {
      await updatePreapprovalStatus(sub.mp_preapproval_id, "cancelled");
    } catch {
      return "O Mercado Pago não respondeu. Tente de novo em instantes.";
    }
  }
  await db.from("subscriptions").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", sub.id);
  const { data: full } = await db.from("subscriptions").select("payer_email, owner_name, restaurant_name").eq("id", sub.id).maybeSingle();
  if (full?.payer_email) {
    await sendTemplate(
      EMAIL.assinaturaCancelada,
      full.payer_email,
      { NOME: firstName(full.owner_name), RESTAURANTE: full.restaurant_name ?? restaurant.name, ACESSO_ATE: dateBR(restaurant.paid_until) },
      { idempotencyKey: `cancelada-${sub.id}` },
    );
  }
  revalidatePath("/admin/configuracoes");
  return null;
}
