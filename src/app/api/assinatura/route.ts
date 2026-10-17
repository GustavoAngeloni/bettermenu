import { after, NextResponse } from "next/server";
import { z } from "zod";
import { getStaff } from "@/lib/auth";
import { billingConfigured, createPreapproval, ensureMpPlan, MercadoPagoError, updatePreapprovalStatus } from "@/lib/billing";
import { cycleAmountCents, isCycle, isPlanKey } from "@/lib/plans";
import { freeSlug, provisionRestaurant } from "@/lib/provision";
import { appUrl } from "@/lib/qr";
import { normalizeUsername } from "@/lib/staff-admin";
import { notifyOnboarding } from "@/lib/onboarding";
import { applyPlanToGroup } from "@/lib/subscriptions";
import { createAdminClient } from "@/lib/supabase/server";

// Checkout de assinatura: recebe o token do cartão (gerado pelo formulário do Mercado Pago no navegador),
// cria a assinatura no Mercado Pago e, aprovada, libera o restaurante na hora.

const NewAccount = z.object({
  restaurantName: z.string().trim().min(2).max(80),
  ownerName: z.string().trim().min(2).max(80),
  username: z.string().trim().min(2).max(30),
  password: z.string().min(6).max(72),
});
const Body = z.object({
  plan: z.string(),
  cycle: z.string(),
  email: z.string().trim().toLowerCase().email().max(120),
  phone: z.string().trim().max(30).optional().default(""),
  document: z.string().trim().max(20).optional().default(""),
  cardToken: z.string().min(8).max(200),
  upgrade: z.boolean().optional().default(false),
  account: NewAccount.optional(),
});

// Limite simples contra abuso: 6 tentativas por minuto por IP.
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  list.push(now);
  hits.set(ip, list);
  return list.length > 6;
}

export async function POST(req: Request) {
  if (!billingConfigured()) return NextResponse.json({ error: "Pagamento online ainda não configurado. Fale com a equipe insight." }, { status: 503 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (limited(ip)) return NextResponse.json({ error: "Muitas tentativas. Aguarde um minuto e tente de novo." }, { status: 429 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Confira os dados do formulário." }, { status: 400 });
  const body = parsed.data;
  if (!isPlanKey(body.plan) || !isCycle(body.cycle)) return NextResponse.json({ error: "Plano inválido." }, { status: 400 });

  // Dono logado mudando de plano, ou conta nova.
  const staff = body.upgrade ? await getStaff() : null;
  const upgradeOf = staff?.profile.role === "owner" && staff.restaurant ? staff.restaurant : null;
  if (body.upgrade && !upgradeOf) return NextResponse.json({ error: "Entre como dono para mudar o plano." }, { status: 401 });
  if (!upgradeOf && !body.account) return NextResponse.json({ error: "Preencha os dados do restaurante." }, { status: 400 });
  const username = body.account ? normalizeUsername(body.account.username) : "";
  if (body.account && username.length < 2) return NextResponse.json({ error: "Usuário deve ter ao menos 2 letras, sem espaços." }, { status: 400 });

  const db = createAdminClient();
  const base = await appUrl();
  const amount = cycleAmountCents(body.plan, body.cycle);
  const { data: sub, error } = await db
    .from("subscriptions")
    .insert({
      restaurant_id: upgradeOf?.id ?? null,
      plan: body.plan,
      cycle: body.cycle,
      amount_cents: amount,
      payer_email: body.email,
      owner_name: body.account?.ownerName ?? staff?.profile.name ?? null,
      phone: body.phone || null,
      document: body.document.replace(/\D/g, "") || null,
      restaurant_name: body.account?.restaurantName ?? upgradeOf?.name ?? null,
    })
    .select("id")
    .single();
  if (error || !sub) return NextResponse.json({ error: "Não foi possível iniciar a assinatura." }, { status: 500 });

  let pre;
  try {
    const mpPlanId = await ensureMpPlan(body.plan, body.cycle, base);
    pre = await createPreapproval({ plan: body.plan, cycle: body.cycle, mpPlanId, subscriptionId: sub.id, payerEmail: body.email, cardTokenId: body.cardToken, appUrl: base });
  } catch (e) {
    await db.from("subscriptions").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", sub.id);
    const msg = e instanceof MercadoPagoError ? e.message : "erro de comunicação";
    return NextResponse.json({ error: `O Mercado Pago recusou a assinatura (${msg}). Confira os dados do cartão ou use outro cartão.` }, { status: 402 });
  }

  const authorized = pre.status === "authorized";
  await db
    .from("subscriptions")
    .update({
      mp_preapproval_id: pre.id,
      status: authorized ? "authorized" : pre.status,
      next_payment_date: pre.next_payment_date ?? null,
      last_payment_at: authorized ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sub.id);
  if (!authorized) return NextResponse.json({ ok: true, ref: sub.id, status: pre.status });

  const paidUntil = pre.next_payment_date?.slice(0, 10) ?? null;
  if (upgradeOf) {
    // Troca de plano: aplica ao grupo e encerra a assinatura anterior no Mercado Pago.
    await applyPlanToGroup(upgradeOf.id, body.plan, paidUntil);
    const { data: old } = await db.from("subscriptions").select("id, mp_preapproval_id").eq("restaurant_id", upgradeOf.id).eq("status", "authorized").neq("id", sub.id);
    for (const o of (old ?? []) as { id: string; mp_preapproval_id: string | null }[]) {
      if (o.mp_preapproval_id) await updatePreapprovalStatus(o.mp_preapproval_id, "cancelled").catch(() => {});
      await db.from("subscriptions").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", o.id);
    }
    after(() =>
      notifyOnboarding({
        event: "assinatura.plano_alterado",
        email: body.email,
        name: staff?.profile.name ?? null,
        phone: body.phone || null,
        restaurant: upgradeOf.name,
        plan: body.plan,
        cycle: body.cycle,
        amount_cents: amount,
        restaurant_code: upgradeOf.slug,
        login_url: `${base}/login?codigo=${encodeURIComponent(upgradeOf.slug)}`,
        subscription_id: sub.id,
        next_payment_date: pre.next_payment_date ?? null,
      }),
    );
    return NextResponse.json({ ok: true, ref: sub.id, status: "authorized", upgrade: true });
  }

  const account = body.account!;
  const slug = await freeSlug(account.restaurantName);
  const created = await provisionRestaurant({
    name: account.restaurantName,
    slug,
    plan: body.plan,
    ownerName: account.ownerName,
    ownerUsername: username,
    ownerPassword: account.password,
    tables: 10,
    paidUntil,
  });
  if (!created.ok) {
    // Pagamento aprovado mas o cadastro falhou: fica registrado para a equipe concluir manualmente.
    return NextResponse.json({ ok: true, ref: sub.id, status: "authorized", provisionError: created.error });
  }
  await db.from("subscriptions").update({ restaurant_id: created.restaurantId }).eq("id", sub.id);
  // E-mail de boas-vindas com os acessos (automação externa); o link abre o login já preenchido.
  after(() =>
    notifyOnboarding({
      event: "assinatura.aprovada",
      email: body.email,
      name: account.ownerName,
      phone: body.phone || null,
      restaurant: account.restaurantName,
      plan: body.plan,
      cycle: body.cycle,
      amount_cents: amount,
      restaurant_code: slug,
      username,
      login_url: `${base}/login?codigo=${encodeURIComponent(slug)}&usuario=${encodeURIComponent(username)}`,
      subscription_id: sub.id,
      next_payment_date: pre.next_payment_date ?? null,
    }),
  );
  return NextResponse.json({ ok: true, ref: sub.id, status: "authorized", slug, username });
}
