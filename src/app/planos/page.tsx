import { Check, Minus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Pricing } from "@/components/pricing";
import { FaqItem, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { FAQ } from "@/lib/faq";
import { cycleAmountCents, PLAN_HIGHLIGHTS, PLAN_KEYS, PLANS } from "@/lib/plans";
import { breadcrumbLd, JsonLd, ORG_ID, SITE } from "@/lib/site";

const DESCRIPTION = "Planos do Better Menu: Essencial, Profissional e Premium, com pagamento mensal ou anual (5% de desconto) no cartão de crédito pelo Mercado Pago.";

export const metadata: Metadata = {
  title: "Planos e preços",
  description: DESCRIPTION,
  alternates: { canonical: "/planos" },
  openGraph: { title: "Planos e preços · Better Menu", description: DESCRIPTION, url: "/planos" },
};

export default function PlansPage() {
  const faq = FAQ.filter((f) => /custa|lucro|restaurante\. Preciso/.test(f.q));
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Product",
              name: SITE.name,
              description: DESCRIPTION,
              brand: { "@id": ORG_ID },
              offers: PLAN_KEYS.flatMap((p) =>
                (["mensal", "anual"] as const).map((c) => ({
                  "@type": "Offer",
                  name: `${PLANS[p].label} ${c}`,
                  price: (cycleAmountCents(p, c) / 100).toFixed(2),
                  priceCurrency: "BRL",
                  url: `${SITE.url}/assinar?plano=${p}&ciclo=${c}`,
                })),
              ),
            },
            breadcrumbLd([
              { name: "Better Menu", path: "/" },
              { name: "Planos", path: "/planos" },
            ]),
          ],
        }}
      />
      <SiteHeader />
      <main id="conteudo" className="flex-1">
        <section className="mx-auto w-full max-w-6xl px-5 pt-14 pb-20">
          <h1 className="mx-auto max-w-3xl text-center font-serif text-[clamp(2.4rem,6vw,4.25rem)] leading-[1.03] font-semibold tracking-[-0.02em]">
            Um plano para cada <span className="font-normal text-[var(--bm)] italic">tamanho de casa.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-center text-lg text-muted">Sem taxa de adesão e sem fidelidade. Pague por mês ou economize 5% no anual.</p>
          <div className="mt-12">
            <Pricing />
          </div>
          <p className="mt-6 text-center text-sm text-muted">Pagamento seguro no cartão de crédito pelo Mercado Pago. O restaurante fica pronto na hora.</p>
        </section>

        <section aria-labelledby="comparar" className="border-y border-line bg-surface">
          <div className="mx-auto w-full max-w-4xl px-5 py-16">
            <h2 id="comparar" className="font-serif text-3xl font-semibold tracking-tight">
              Compare os planos
            </h2>
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left">
                    <th className="py-3 pr-3 font-semibold">Funcionalidade</th>
                    {PLAN_KEYS.map((p) => (
                      <th key={p} className="px-2 py-3 text-center font-semibold">
                        {PLANS[p].label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {PLAN_HIGHLIGHTS.map((row) => (
                    <tr key={row.label}>
                      <td className="py-3 pr-3">{row.label}</td>
                      {PLAN_KEYS.map((p) => {
                        const v = row.values[p];
                        return (
                          <td key={p} className="px-2 py-3 text-center font-semibold">
                            {v === true ? <Check className="mx-auto size-4 text-emerald-600" aria-label="Incluso" /> : v === false ? <Minus className="mx-auto size-4 text-muted" aria-label="Não incluso" /> : v}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-3xl px-5 py-16">
          <h2 className="font-serif text-3xl font-semibold tracking-tight">Dúvidas sobre planos</h2>
          <div className="mt-4 border-t border-line">
            {faq.map((f) => (
              <FaqItem key={f.q} q={f.q} a={f.a} />
            ))}
            <FaqItem q="Posso cancelar quando quiser?" a="Sim. Não há fidelidade: a assinatura pode ser cancelada a qualquer momento e o acesso continua até o fim do período já pago." />
            <FaqItem q="Quais formas de pagamento?" a="Cartão de crédito, processado pelo Mercado Pago, com cobrança automática a cada mês ou a cada ano." />
          </div>
          <Link href="/demo" className="mt-8 inline-flex font-semibold text-[var(--bm)] hover:underline">
            Experimentar a demonstração antes →
          </Link>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
