import { NextResponse } from "next/server";
import { getAuthorizedPayment, verifyWebhook } from "@/lib/billing";
import { notifyRenewal, refreshFromMercadoPago } from "@/lib/subscriptions";

// Notificações do Mercado Pago (Assinaturas). Configure a URL no painel do Mercado Pago:
//   https://SEU-DOMINIO/api/mercadopago/webhook  — tópicos "Planos e assinaturas".
// A origem é validada pela chave secreta (x-signature) e, de todo modo, os dados são relidos da API.

export async function POST(req: Request) {
  const url = new URL(req.url);
  const body = (await req.json().catch(() => ({}))) as { type?: string; topic?: string; data?: { id?: string | number } };
  const type = body.type ?? body.topic ?? url.searchParams.get("type") ?? url.searchParams.get("topic") ?? "";
  const dataId = url.searchParams.get("data.id") ?? (body.data?.id != null ? String(body.data.id) : null) ?? url.searchParams.get("id");

  if (!verifyWebhook(req.headers, url.searchParams.get("data.id") ?? dataId)) {
    return NextResponse.json({ error: "assinatura inválida" }, { status: 401 });
  }
  if (!dataId) return NextResponse.json({ ok: true });

  try {
    if (type === "subscription_preapproval" || type === "preapproval") {
      await refreshFromMercadoPago(dataId);
    } else if (type === "subscription_authorized_payment" || type === "authorized_payment") {
      const payment = await getAuthorizedPayment(dataId);
      const approved = payment.payment?.status === "approved" || payment.status === "processed";
      const rejected = payment.payment?.status === "rejected";
      if (payment.preapproval_id) {
        await refreshFromMercadoPago(payment.preapproval_id, { paid: approved });
        if (approved || rejected) await notifyRenewal(payment.preapproval_id, String(payment.id), approved);
      }
    }
  } catch (e) {
    console.error("[mercadopago] webhook", type, dataId, e);
    // 500 faz o Mercado Pago tentar de novo mais tarde
    return NextResponse.json({ error: "falha ao processar" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
