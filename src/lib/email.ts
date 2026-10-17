import "server-only";

// E-mails transacionais pelo Resend. Os textos ficam em templates publicados no Resend
// (editáveis no painel; criados por scripts/emails/sync.mjs) e o sistema só envia o alias + as variáveis.
// Sem RESEND_API_KEY, nada é enviado (o fluxo segue, e o envio é registrado no log).

const API = "https://api.resend.com";

export const EMAIL = {
  acessoLiberado: "bm-acesso-liberado",
  redefinirSenha: "bm-redefinir-senha",
  senhaAlterada: "bm-senha-alterada",
  conviteEquipe: "bm-convite-equipe",
  pagamentoConfirmado: "bm-pagamento-confirmado",
  pagamentoRecusado: "bm-pagamento-recusado",
  assinaturaCancelada: "bm-assinatura-cancelada",
  planoAlterado: "bm-plano-alterado",
} as const;
export type EmailTemplate = (typeof EMAIL)[keyof typeof EMAIL];

/** Evento que dispara a automação de boas-vindas (série de dicas nos primeiros dias). */
export const ONBOARDING_EVENT = "bm.assinatura.aprovada";

export const emailConfigured = () => !!process.env.RESEND_API_KEY;

async function resend(path: string, body: unknown, idempotencyKey?: string) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "content-type": "application/json",
      ...(idempotencyKey ? { "idempotency-key": idempotencyKey } : {}),
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Resend ${path}: HTTP ${res.status} ${await res.text().catch(() => "")}`.slice(0, 400));
  return res.json().catch(() => ({}));
}

/** Envia um e-mail a partir de um template publicado. Nunca lança: falha de e-mail não pode travar o fluxo. */
export async function sendTemplate(template: EmailTemplate, to: string, variables: Record<string, string | number>, opts: { idempotencyKey?: string } = {}) {
  if (!emailConfigured()) {
    console.info(`[email] RESEND_API_KEY ausente: "${template}" para ${to} não enviado`, process.env.NODE_ENV !== "production" ? variables : "");
    return false;
  }
  try {
    await resend(
      "/emails",
      {
        from: process.env.EMAIL_FROM || "Better Menu <ola@bettermenu.app>",
        to: [to],
        ...(process.env.EMAIL_REPLY_TO ? { reply_to: process.env.EMAIL_REPLY_TO } : {}),
        template: { id: template, variables },
        tags: [{ name: "categoria", value: template.replace(/[^a-z0-9_-]/gi, "_") }],
      },
      opts.idempotencyKey,
    );
    return true;
  } catch (e) {
    console.error(`[email] falha ao enviar "${template}" para ${to}`, e);
    return false;
  }
}

/** Cadastra (ou atualiza) o contato no Resend e dispara a automação de boas-vindas. */
export async function startOnboarding(input: { email: string; firstName: string; restaurant: string; plan: string; loginUrl: string }) {
  if (!emailConfigured()) return;
  try {
    await resend("/contacts", {
      email: input.email,
      first_name: input.firstName,
      unsubscribed: false,
      properties: { restaurante: input.restaurant, plano: input.plan },
    }).catch(() => {}); // contato já existente: segue para o evento
    await resend("/events/send", {
      event: ONBOARDING_EVENT,
      email: input.email,
      payload: { nome: input.firstName, restaurante: input.restaurant, plano: input.plan, link_login: input.loginUrl },
    });
  } catch (e) {
    console.error("[email] falha ao iniciar a automação de boas-vindas", e);
  }
}

export const firstName = (name: string | null | undefined) => (name ?? "").trim().split(/\s+/)[0] || "tudo bem";
export const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const dateBR = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—");
