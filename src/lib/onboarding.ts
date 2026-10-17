import "server-only";

/**
 * Avisa a automação de e-mails (n8n, Make, Zapier...) que uma assinatura foi aprovada.
 * Configure ONBOARDING_WEBHOOK_URL; o corpo traz tudo para o e-mail de boas-vindas, menos a senha
 * (que só o dono conhece). Se ONBOARDING_WEBHOOK_SECRET existir, vai no header x-bettermenu-secret.
 */
export async function notifyOnboarding(payload: {
  event: "assinatura.aprovada" | "assinatura.plano_alterado";
  email: string;
  name: string | null;
  phone: string | null;
  restaurant: string | null;
  plan: string;
  cycle: string;
  amount_cents: number;
  restaurant_code?: string;
  username?: string;
  login_url: string;
  subscription_id: string;
  next_payment_date: string | null;
}) {
  const url = process.env.ONBOARDING_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...(process.env.ONBOARDING_WEBHOOK_SECRET ? { "x-bettermenu-secret": process.env.ONBOARDING_WEBHOOK_SECRET } : {}) },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error("[onboarding] falha ao avisar a automação de e-mails", e);
  }
}
