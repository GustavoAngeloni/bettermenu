"use client";

import { CreditCard } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Badge, Button, cn, Spinner } from "@/components/ui";
import { formatBRL } from "@/lib/money";
import { PLANS, planOf } from "@/lib/plans";
import { cancelSubscription } from "./subscription-actions";

export interface SubscriptionView {
  id: string;
  plan: string;
  cycle: string;
  amount_cents: number;
  status: string;
  next_payment_date: string | null;
  payer_email: string;
}

const LABEL: Record<string, [string, string]> = {
  authorized: ["Ativa", "bg-emerald-100 text-emerald-800"],
  pending: ["Aguardando pagamento", "bg-amber-100 text-amber-800"],
  paused: ["Pausada", "bg-amber-100 text-amber-800"],
  cancelled: ["Cancelada", "bg-stone-200 text-stone-700"],
  failed: ["Pagamento recusado", "bg-red-100 text-red-700"],
};

/** Assinatura do restaurante (Mercado Pago): status, próxima cobrança, trocar plano e cancelar. */
export function SubscriptionCard({ sub, paidUntil }: { sub: SubscriptionView | null; paidUntil: string | null }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [label, cls] = LABEL[sub?.status ?? ""] ?? ["Sem assinatura online", "bg-stone-200 text-stone-700"];
  const date = (d: string | null) => (d ? new Date(d).toLocaleDateString("pt-BR") : "—");
  return (
    <section className="rounded-[1.4rem] border border-line bg-surface p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-soft text-brand-fg">
          <CreditCard className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl font-semibold">Assinatura</h2>
          <p className="text-sm text-muted">Cobrança no cartão de crédito pelo Mercado Pago.</p>
        </div>
        <Badge className={cls}>{label}</Badge>
      </div>
      {sub ? (
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted">Plano</dt>
            <dd className="font-semibold">
              {PLANS[planOf(sub.plan)].label} · {sub.cycle}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Valor</dt>
            <dd className="font-semibold tabular-nums">
              {formatBRL(sub.amount_cents)}/{sub.cycle === "mensal" ? "mês" : "ano"}
            </dd>
          </div>
          <div>
            <dt className="text-muted">{sub.status === "cancelled" ? "Acesso até" : "Próxima cobrança"}</dt>
            <dd className="font-semibold">{date(sub.status === "cancelled" ? paidUntil : sub.next_payment_date)}</dd>
          </div>
        </dl>
      ) : (
        <p className="mt-4 text-sm text-muted">Seu plano foi contratado diretamente com a equipe insight{paidUntil ? `, com acesso até ${date(paidUntil)}` : ""}. Você pode passar a pagar no cartão por aqui.</p>
      )}
      <div className={cn("mt-5 flex flex-wrap gap-2")}>
        <Link href="/assinar" className="inline-flex h-10 items-center rounded-xl bg-brand px-4 text-sm font-semibold text-on-brand">
          {sub?.status === "authorized" ? "Mudar de plano" : "Assinar no cartão"}
        </Link>
        {sub?.status === "authorized" && (
          <Button
            variant="ghost"
            size="md"
            className="text-red-600"
            disabled={pending}
            onClick={() => {
              if (!window.confirm("Cancelar a assinatura? As próximas cobranças param e o acesso continua até o fim do período já pago.")) return;
              setError(null);
              start(async () => {
                const err = await cancelSubscription(sub.id);
                if (err) setError(err);
              });
            }}
          >
            {pending ? <Spinner className="size-4" /> : "Cancelar assinatura"}
          </Button>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </section>
  );
}
