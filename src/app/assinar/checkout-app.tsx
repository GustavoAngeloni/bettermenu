"use client";

import { ArrowLeft, Check, CreditCard, Lock, RefreshCw, ShieldCheck, Store } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BetterMenuLogo, ByInsight } from "@/components/brand";
import { CycleToggle } from "@/components/pricing";
import { ThemeToggle } from "@/components/theme";
import { Button, cn, Field, inputClass, Spinner } from "@/components/ui";
import { formatBRL } from "@/lib/money";
import { SecureCardForm, type CardResult } from "./secure-card";
import { annualSavingsCents, cycleAmountCents, PLAN_KEYS, PLAN_PITCH, PLANS, type Cycle, type PlanKey } from "@/lib/plans";

interface Owner {
  name: string;
  restaurant: string;
  currentPlan: PlanKey;
}

interface Account {
  restaurantName: string;
  ownerName: string;
  email: string;
  phone: string;
  username: string;
  password: string;
}

type Step = "dados" | "pagamento";

type CardFormData = CardResult;

const usernameFrom = (name: string) =>
  name
    .trim()
    .split(/\s+/)[0]
    ?.toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "") ?? "";

export function CheckoutApp({
  initialPlan,
  initialCycle,
  publicKey,
  configured,
  owner,
}: {
  initialPlan: PlanKey;
  initialCycle: Cycle;
  publicKey: string;
  configured: boolean;
  owner: Owner | null;
}) {
  const router = useRouter();
  const [plan, setPlan] = useState<PlanKey>(initialPlan);
  const [cycle, setCycle] = useState<Cycle>(initialCycle);
  const [step, setStep] = useState<Step>("dados");
  const [acc, setAcc] = useState<Account>({ restaurantName: "", ownerName: owner?.name ?? "", email: "", phone: "", username: "", password: "" });
  const [touchedUser, setTouchedUser] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const upgrade = !!owner;
  const amount = cycleAmountCents(plan, cycle);

  const set = (k: keyof Account, v: string) => {
    setAcc((a) => {
      const next = { ...a, [k]: v };
      if (k === "ownerName" && !touchedUser) next.username = usernameFrom(v);
      return next;
    });
  };

  function validate(): string | null {
    if (!/^\S+@\S+\.\S+$/.test(acc.email)) return "Informe um e-mail válido";
    if (upgrade) return null;
    if (acc.restaurantName.trim().length < 2) return "Informe o nome do restaurante";
    if (acc.ownerName.trim().length < 2) return "Informe seu nome";
    if (acc.username.trim().length < 2) return "Escolha um usuário com ao menos 2 letras";
    if (acc.password.length < 6) return "A senha precisa de ao menos 6 caracteres";
    return null;
  }

  function goPay(e: React.FormEvent) {
    e.preventDefault();
    const v = validate();
    setError(v);
    if (!v) {
      setStep("pagamento");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function subscribe(card: CardFormData) {
    setError(null);
    const res = await fetch("/api/assinatura", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        plan,
        cycle,
        email: card.payer?.email || acc.email,
        phone: acc.phone,
        document: card.payer?.identification?.number ?? "",
        cardToken: card.token,
        upgrade,
        account: upgrade
          ? undefined
          : { restaurantName: acc.restaurantName, ownerName: acc.ownerName, username: acc.username, password: acc.password },
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; ref?: string; error?: string };
    if (!res.ok || !data.ok) {
      setError(data.error ?? "Não foi possível concluir. Tente de novo.");
      throw new Error(data.error);
    }
    router.push(`/assinar/sucesso?ref=${data.ref}`);
  }

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <header className="border-b border-line bg-canvas/85 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-5 py-3.5">
          <Link href="/" aria-label="Better Menu, página inicial">
            <BetterMenuLogo />
          </Link>
          <span className="flex-1" />
          <span className="hidden items-center gap-1.5 text-sm text-muted sm:flex">
            <Lock className="size-4" aria-hidden /> Checkout seguro
          </span>
          <ThemeToggle />
        </div>
      </header>

      <main id="conteudo" className="mx-auto grid w-full max-w-6xl flex-1 gap-8 px-5 py-10 lg:grid-cols-[1fr_24rem] lg:gap-12">
        <div className="min-w-0">
          <Steps step={step} upgrade={upgrade} />
          <h1 className="mt-6 font-serif text-[clamp(2rem,4.5vw,3rem)] leading-[1.05] font-semibold tracking-tight">
            {upgrade ? (
              <>
                Mudar o plano do <span className="font-normal text-[var(--bm)] italic">{owner.restaurant}</span>
              </>
            ) : (
              <>
                Seu restaurante no ar <span className="font-normal text-[var(--bm)] italic">em minutos.</span>
              </>
            )}
          </h1>

          {!configured && (
            <p className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              O pagamento online está sendo configurado. Enquanto isso, fale com a equipe insight para assinar.
            </p>
          )}

          {step === "dados" ? (
            <form onSubmit={goPay} className="mt-8 space-y-8" noValidate>
              <section aria-labelledby="escolha" className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 id="escolha" className="text-lg font-bold">
                    1. Escolha o plano
                  </h2>
                  <CycleToggle value={cycle} onChange={setCycle} />
                </div>
                <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Plano">
                  {PLAN_KEYS.map((p) => {
                    const on = plan === p;
                    const value = cycleAmountCents(p, cycle);
                    return (
                      <button
                        key={p}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => setPlan(p)}
                        className={cn(
                          "relative rounded-2xl border p-4 text-left transition",
                          on ? "border-[var(--bm)] bg-[color-mix(in_oklch,var(--bm)_8%,var(--surface))] ring-2 ring-[var(--bm)]/25" : "border-line bg-surface hover:border-line-strong",
                        )}
                      >
                        {owner?.currentPlan === p && <span className="absolute top-3 right-3 text-[10px] font-bold text-muted uppercase">atual</span>}
                        <span className="block font-serif text-xl font-semibold">{PLANS[p].label}</span>
                        <span className="mt-1 block text-sm font-semibold tabular-nums">
                          {formatBRL(cycle === "mensal" ? value : Math.round(value / 12))}
                          <span className="font-normal text-muted">/mês</span>
                        </span>
                        <span className="mt-1 block text-xs text-muted">{PLAN_PITCH[p].tagline}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section aria-labelledby="dados" className="space-y-4">
                <h2 id="dados" className="text-lg font-bold">
                  2. {upgrade ? "Contato para a cobrança" : "Seu restaurante e seu acesso"}
                </h2>
                <div className="grid gap-4 rounded-[1.4rem] border border-line bg-surface p-5 sm:grid-cols-2">
                  {!upgrade && (
                    <>
                      <Field label="Nome do restaurante">
                        <input className={inputClass} value={acc.restaurantName} onChange={(e) => set("restaurantName", e.target.value)} placeholder="Cantina da Nonna" autoComplete="organization" required />
                      </Field>
                      <Field label="Seu nome">
                        <input className={inputClass} value={acc.ownerName} onChange={(e) => set("ownerName", e.target.value)} autoComplete="name" required />
                      </Field>
                    </>
                  )}
                  <Field label="E-mail" hint="Recibos e avisos de cobrança chegam aqui.">
                    <input className={inputClass} type="email" value={acc.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" required />
                  </Field>
                  <Field label="WhatsApp (opcional)">
                    <input className={inputClass} type="tel" value={acc.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="tel" placeholder="(11) 99999-0000" />
                  </Field>
                  {!upgrade && (
                    <>
                      <Field label="Usuário para entrar" hint="Você entra com o código do restaurante + este usuário.">
                        <input
                          className={inputClass}
                          value={acc.username}
                          onChange={(e) => {
                            setTouchedUser(true);
                            set("username", e.target.value.toLowerCase().replace(/\s/g, ""));
                          }}
                          autoComplete="username"
                          autoCapitalize="none"
                          required
                        />
                      </Field>
                      <Field label="Senha" hint="Mínimo de 6 caracteres.">
                        <input className={inputClass} type="password" value={acc.password} onChange={(e) => set("password", e.target.value)} autoComplete="new-password" minLength={6} required />
                      </Field>
                    </>
                  )}
                </div>
              </section>

              {error && (
                <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">
                  {error}
                </p>
              )}
              <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={!configured}>
                <CreditCard className="size-5" /> Continuar para o pagamento
              </Button>
            </form>
          ) : (
            <section aria-labelledby="pagar" className="mt-8 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="pagar" className="text-lg font-bold">
                  3. Pagamento
                </h2>
                <button type="button" onClick={() => setStep("dados")} className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
                  <ArrowLeft className="size-4" /> Voltar e editar
                </button>
              </div>
              <p className="text-sm text-muted">
                Os dados do cartão são digitados no formulário seguro do Mercado Pago e não passam pelo Better Menu. A cobrança de {formatBRL(amount)} se repete{" "}
                {cycle === "mensal" ? "todo mês" : "a cada 12 meses"} até você cancelar.
              </p>
              {error && (
                <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">
                  {error}
                </p>
              )}
              {publicKey === "mock" && process.env.NODE_ENV !== "production" ? (
                <MockCard amount={amount} onSubmit={subscribe} />
              ) : (
                <SecureCardForm publicKey={publicKey} amount={amount} email={acc.email} submitLabel={upgrade ? "Confirmar novo plano" : "Assinar agora"} onSubmit={subscribe} />
              )}
            </section>
          )}
        </div>

        <Summary plan={plan} cycle={cycle} upgrade={upgrade} />
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-sm text-muted">
          <span className="flex items-center gap-2">
            <ShieldCheck className="size-4" aria-hidden /> Pagamentos processados pelo Mercado Pago
          </span>
          <span className="flex items-center gap-2">
            Uma solução <ByInsight label="" className="text-sm" />
          </span>
        </div>
      </footer>
    </div>
  );
}

function Steps({ step, upgrade }: { step: Step; upgrade: boolean }) {
  const list = ["Plano", upgrade ? "Contato" : "Seus dados", "Pagamento"];
  const current = step === "dados" ? 1 : 2;
  return (
    <ol className="flex flex-wrap items-center gap-2 text-sm font-semibold" aria-label="Etapas">
      {list.map((s, i) => {
        const done = i < current;
        const active = i === current || (i === 0 && step === "dados");
        return (
          <li key={s} className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-7 items-center justify-center rounded-full text-xs",
                done && !active ? "bg-emerald-600 text-white" : active ? "bg-[var(--bm)] text-white" : "bg-surface-2 text-muted",
              )}
              aria-hidden
            >
              {done && !active ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
            </span>
            <span className={active ? "text-ink" : "text-muted"} aria-current={active ? "step" : undefined}>
              {s}
            </span>
            {i < list.length - 1 && <span className="mx-1 h-px w-6 bg-line-strong" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}

function Summary({ plan, cycle, upgrade }: { plan: PlanKey; cycle: Cycle; upgrade: boolean }) {
  const amount = cycleAmountCents(plan, cycle);
  return (
    <aside aria-label="Resumo da assinatura" className="lg:sticky lg:top-6 lg:self-start">
      <div className="relative overflow-hidden rounded-[1.8rem] bg-[#16120f] p-7 text-white">
        <div className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-[var(--bm)] opacity-40 blur-[80px]" aria-hidden />
        <div className="relative">
          <div className="text-xs font-bold tracking-widest text-[#ffb79c] uppercase">Resumo</div>
          <div className="mt-4 flex items-baseline justify-between gap-3">
            <span className="font-serif text-3xl font-semibold">{PLANS[plan].label}</span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">{cycle === "mensal" ? "Mensal" : "Anual"}</span>
          </div>
          <ul className="mt-5 space-y-2 text-sm text-white/75">
            {PLAN_PITCH[plan].bullets.slice(0, 4).map((b) => (
              <li key={b} className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-[#ffb79c]" aria-hidden /> {b}
              </li>
            ))}
          </ul>
          <dl className="mt-6 space-y-2 border-t border-white/12 pt-5 text-sm">
            {cycle === "anual" && (
              <>
                <div className="flex justify-between text-white/65">
                  <dt>12 × {formatBRL(PLANS[plan].priceCents)}</dt>
                  <dd className="tabular-nums line-through">{formatBRL(PLANS[plan].priceCents * 12)}</dd>
                </div>
                <div className="flex justify-between text-[#ffb79c]">
                  <dt>Desconto anual (5%)</dt>
                  <dd className="tabular-nums">− {formatBRL(annualSavingsCents(plan))}</dd>
                </div>
              </>
            )}
            <div className="flex items-baseline justify-between pt-1">
              <dt className="font-semibold">{cycle === "mensal" ? "Por mês" : "Por ano"}</dt>
              <dd className="font-serif text-3xl font-semibold tabular-nums">{formatBRL(amount)}</dd>
            </div>
          </dl>
          <ul className="mt-6 space-y-2 text-xs text-white/60">
            <li className="flex gap-2">
              <RefreshCw className="size-3.5 shrink-0" aria-hidden /> Renovação automática. Cancele quando quiser, sem multa.
            </li>
            <li className="flex gap-2">
              <Store className="size-3.5 shrink-0" aria-hidden /> {upgrade ? "O novo plano vale na hora para todas as suas unidades." : "Restaurante criado na hora, com 10 mesas para começar."}
            </li>
            <li className="flex gap-2">
              <Lock className="size-3.5 shrink-0" aria-hidden /> Cartão processado pelo Mercado Pago.
            </li>
          </ul>
        </div>
      </div>
    </aside>
  );
}

/** Só em desenvolvimento local (chave "mock"): simula o formulário do Mercado Pago. */
function MockCard({ amount, onSubmit }: { amount: number; onSubmit: (d: CardFormData) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        await onSubmit({ token: `mock-card-${Date.now()}`, payer: { identification: { type: "CPF", number: "12345678909" } } }).catch(() => {});
        setBusy(false);
      }}
      className="space-y-4 rounded-[1.4rem] border border-dashed border-line-strong bg-surface p-5"
    >
      <p className="text-xs font-bold text-amber-700 uppercase">Modo de teste local · nenhum cartão real</p>
      <Field label="Número do cartão">
        <input className={inputClass} defaultValue="5031 4332 1540 6351" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Validade">
          <input className={inputClass} defaultValue="11/30" />
        </Field>
        <Field label="CVV">
          <input className={inputClass} defaultValue="123" />
        </Field>
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={busy}>
        {busy ? <Spinner /> : `Assinar e pagar ${formatBRL(amount)}`}
      </Button>
    </form>
  );
}
