import { ArrowRight, BookOpen, CheckCircle2, Clock, QrCode, UtensilsCrossed } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { SUBSCRIPTION_STATUS } from "@/lib/billing";
import { formatBRL } from "@/lib/money";
import { PLANS, planOf } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Assinatura confirmada", robots: { index: false, follow: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function SuccessPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { ref } = await searchParams;
  const db = createAdminClient();
  const { data: sub } = typeof ref === "string" && UUID.test(ref) ? await db.from("subscriptions").select("*").eq("id", ref).maybeSingle() : { data: null };
  const { data: restaurant } = sub?.restaurant_id ? await db.from("restaurants").select("name, slug").eq("id", sub.restaurant_id).maybeSingle() : { data: null };
  const { data: owner } = sub?.restaurant_id
    ? await db.from("profiles").select("username").eq("restaurant_id", sub.restaurant_id).eq("role", "owner").order("created_at").limit(1).maybeSingle()
    : { data: null };
  const ok = sub?.status === "authorized";
  const status = SUBSCRIPTION_STATUS[sub?.status ?? "pending"] ?? SUBSCRIPTION_STATUS.pending;

  return (
    <>
      <SiteHeader />
      <main id="conteudo" className="mx-auto w-full max-w-3xl flex-1 px-5 py-16">
        {!sub ? (
          <div className="text-center">
            <h1 className="font-serif text-4xl font-semibold">Assinatura não encontrada</h1>
            <p className="mt-3 text-muted">Se você acabou de pagar, confira o e-mail do Mercado Pago ou fale com a equipe insight.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center text-center">
              <span className={ok ? "text-emerald-600" : "text-amber-600"}>{ok ? <CheckCircle2 className="size-16" /> : <Clock className="size-16" />}</span>
              <h1 className="mt-5 font-serif text-[clamp(2.2rem,5vw,3.4rem)] leading-tight font-semibold tracking-tight">
                {ok ? (
                  <>
                    Bem-vindo ao <span className="font-normal text-[var(--bm)] italic">Better Menu!</span>
                  </>
                ) : (
                  "Estamos confirmando seu pagamento"
                )}
              </h1>
              <p className="mt-3 max-w-lg text-lg text-muted">
                Plano {PLANS[planOf(sub.plan)].label} {sub.cycle} · {formatBRL(sub.amount_cents)}/{sub.cycle === "mensal" ? "mês" : "ano"} · {status.label}
              </p>
            </div>

            {restaurant && owner ? (
              <section className="mt-10 rounded-[1.6rem] bg-[#16120f] p-7 text-white">
                <h2 className="font-serif text-2xl font-semibold">Seu acesso</h2>
                <dl className="mt-5 grid gap-3 sm:grid-cols-3">
                  {[
                    ["Endereço", "/login"],
                    ["Código do restaurante", restaurant.slug],
                    ["Usuário", owner.username],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-2xl bg-white/8 p-4">
                      <dt className="text-xs text-white/60">{k}</dt>
                      <dd className="mt-1 font-mono text-lg font-semibold">{v}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-4 text-sm text-white/65">A senha é a que você escolheu no cadastro. Guarde este código: é ele que a sua equipe usa para entrar.</p>
                <Link href="/login" className="group mt-6 inline-flex h-12 items-center gap-2 rounded-2xl bg-[var(--bm)] px-6 font-semibold text-white">
                  Entrar no painel <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </section>
            ) : ok && !sub.restaurant_id ? (
              <p className="mt-10 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-900">
                Pagamento aprovado! Estamos finalizando o cadastro do seu restaurante; a equipe insight entra em contato pelo e-mail {sub.payer_email} em instantes.
              </p>
            ) : null}

            <section className="mt-10">
              <h2 className="font-serif text-2xl font-semibold">Próximos passos</h2>
              <ol className="mt-5 grid gap-4 sm:grid-cols-3">
                {[
                  [UtensilsCrossed, "Monte o cardápio", "Cadastre pratos com foto, ou importe por planilha ou foto do cardápio impresso."],
                  [QrCode, "Imprima os QR Codes", "Em Mesas e QR Codes, imprima os cartões das mesas."],
                  [BookOpen, "Veja os manuais", "Em Aprender, no painel, estão os manuais e vídeos de cada tela."],
                ].map(([Icon, t, d], i) => {
                  const I = Icon as typeof QrCode;
                  return (
                    <li key={i} className="rounded-2xl border border-line bg-surface p-5">
                      <I className="size-5 text-[var(--bm)]" aria-hidden />
                      <h3 className="mt-3 font-bold">{t as string}</h3>
                      <p className="mt-1 text-sm text-muted">{d as string}</p>
                    </li>
                  );
                })}
              </ol>
            </section>
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
