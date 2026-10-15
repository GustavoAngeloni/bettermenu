import type { Metadata } from "next";
import Link from "next/link";
import { FaqItem, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { FAQ } from "@/lib/faq";
import { breadcrumbLd, faqLd, JsonLd } from "@/lib/site";

const DESCRIPTION = "Respostas diretas sobre o Better Menu: como funciona o cardápio digital com QR Code, conta dividida, idiomas, acessibilidade, equipamentos e planos.";

export const metadata: Metadata = {
  title: "Perguntas frequentes sobre cardápio digital",
  description: DESCRIPTION,
  alternates: { canonical: "/perguntas-frequentes" },
  openGraph: { title: "Perguntas frequentes · Better Menu", description: DESCRIPTION, url: "/perguntas-frequentes" },
};

const slug = (g: string) => g.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export default function FaqPage() {
  const groups = [...new Set(FAQ.map((f) => f.group))];
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            faqLd(FAQ),
            breadcrumbLd([
              { name: "Better Menu", path: "/" },
              { name: "Perguntas frequentes", path: "/perguntas-frequentes" },
            ]),
          ],
        }}
      />
      <SiteHeader />
      <main id="conteudo" className="mx-auto w-full max-w-3xl flex-1 px-5 pt-14 pb-24">
        <nav aria-label="Você está em" className="text-sm text-muted">
          <Link href="/" className="hover:text-ink">
            Better Menu
          </Link>{" "}
          / <span aria-current="page">Perguntas frequentes</span>
        </nav>
        <h1 className="mt-6 font-serif text-[clamp(2.3rem,5.5vw,3.75rem)] leading-[1.04] font-semibold tracking-[-0.02em]">
          Perguntas <span className="font-normal text-[var(--bm)] italic">frequentes</span>
        </h1>
        <p className="mt-4 text-lg text-muted">Tudo o que donos de restaurante, garçons e clientes costumam perguntar, em respostas curtas.</p>
        <nav aria-label="Assuntos" className="mt-8 flex flex-wrap gap-2">
          {groups.map((g) => (
            <a key={g} href={`#${slug(g)}`} className="rounded-full border border-line-strong px-4 py-2 text-sm font-semibold hover:bg-surface-2">
              {g}
            </a>
          ))}
        </nav>
        {groups.map((g) => (
          <section key={g} aria-labelledby={slug(g)} className="mt-14">
            <h2 id={slug(g)} className="scroll-mt-24 font-serif text-3xl font-semibold tracking-tight">
              {g}
            </h2>
            <div className="mt-3 border-t border-line">
              {FAQ.filter((f) => f.group === g).map((f) => (
                <FaqItem key={f.q} q={f.q} a={f.a} open />
              ))}
            </div>
          </section>
        ))}
      </main>
      <SiteFooter />
    </>
  );
}
