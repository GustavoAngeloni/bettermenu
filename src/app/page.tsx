import { Accessibility, ArrowRight, BellRing, ChefHat, Ear, Hand, MessageSquareText, QrCode, Receipt, Type, Volume2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FaqItem, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { FAQ } from "@/lib/faq";
import { faqLd, JsonLd, organizationLd, SITE, softwareLd } from "@/lib/site";
import { LivePhone } from "./live-phone";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { url: "/", title: SITE.title, description: SITE.description },
};

const steps = [
  { icon: QrCode, title: "O cliente escaneia", text: "QR Code na mesa, digita o nome e já está no cardápio do seu restaurante, com suas cores e fotos." },
  { icon: ChefHat, title: "A cozinha recebe na hora", text: "Pedido chega na tela da cozinha e do bar com mesa, observações e tempo de espera." },
  { icon: BellRing, title: "O garçom é avisado", text: "Chamados e pratos prontos apitam no celular do garçom, até com a tela bloqueada." },
  { icon: Receipt, title: "A conta se divide sozinha", text: "Cada um vê o que consumiu, inclusive o que foi dividido. Sem calculadora na mesa." },
];

const roles = [
  { who: "Para o dono", what: "Faturamento, pratos que mais vendem, horários de pico, avaliações e fechamento de caixa. Tudo em tempo real." },
  { who: "Para o salão", what: "Mapa de mesas vivo, chamados com som, transferência de mesas e lançamento de pedidos pelo garçom." },
  { who: "Para a cozinha", what: "Comandas por estação, totais para produzir em lote, impressão em 80 mm e botão de esgotado." },
  { who: "Para o cliente", what: "Um cardápio bonito, em três idiomas, que mostra o andamento do pedido e a conta de cada um." },
];

const access = [
  {
    who: "Para quem não enxerga",
    items: [
      { icon: Volume2, title: "Ouvir o cardápio", text: "Uma voz lê cada prato, descrição e preço, categoria por categoria, e destaca na tela o que está lendo." },
      { icon: Accessibility, title: "Leitor de tela de ponta a ponta", text: "Funciona com VoiceOver e TalkBack: botões com nome, preços falados, status do pedido anunciado." },
      { icon: Type, title: "Texto grande e alto contraste", text: "Letras até 30% maiores, cores reforçadas e nada de animação para quem prefere." },
    ],
  },
  {
    who: "Para quem não ouve ou não fala",
    items: [
      { icon: MessageSquareText, title: "Mensagem direto para o garçom", text: "Frases prontas ou texto livre chegam no celular do garçom, até com a tela bloqueada." },
      { icon: Hand, title: "Libras com VLibras", text: "O tradutor oficial do governo transforma qualquer texto do cardápio em Libras, com avatar." },
      { icon: Ear, title: "Avisos que se veem e se sentem", text: "Pedido pronto e garçom a caminho chegam na tela e por vibração, nunca só por som." },
    ],
  },
];

export default function Home() {
  const homeFaq = FAQ.filter((f) => f.home);
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            organizationLd(),
            softwareLd(),
            { "@type": "WebSite", "@id": `${SITE.url}/#site`, url: SITE.url, name: SITE.name, inLanguage: "pt-BR", publisher: { "@id": `${SITE.url}/#organizacao` } },
            { "@type": "WebPage", "@id": `${SITE.url}/#pagina`, url: SITE.url, name: SITE.title, description: SITE.description, inLanguage: "pt-BR", about: { "@id": `${SITE.url}/#software` } },
            faqLd(homeFaq),
          ],
        }}
      />
      <SiteHeader />
    <main id="conteudo" className="flex flex-1 flex-col overflow-x-clip">

      {/* Hero */}
      <section className="relative">
        <div className="pointer-events-none absolute top-20 -right-40 size-[40rem] rounded-full bg-[var(--bm)] opacity-[0.13] blur-[140px]" aria-hidden />
        <div className="mx-auto grid w-full max-w-6xl items-center gap-14 px-5 pt-14 pb-20 md:pt-20 lg:grid-cols-[1.1fr_1fr] lg:gap-8">
          <div className="min-w-0 animate-rise">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-muted">
              <span className="size-1.5 rounded-full bg-[var(--bm)] animate-pulse-dot" /> Cardápio digital para restaurantes
            </span>
            <h1 className="mt-6 font-serif text-[clamp(2.15rem,6vw,4.75rem)] leading-[1.12] break-words font-semibold tracking-[-0.025em]">
              O cardápio que deixa a mesa <span className="font-normal text-[var(--bm)] italic">com vontade de pedir.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted">
              Pedidos pelo celular, cozinha e garçons conectados em tempo real e a conta dividida por pessoa. Com a cara do seu restaurante.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/demo"
                className="group inline-flex h-13 items-center gap-2 rounded-2xl bg-[var(--bm)] px-6 font-semibold text-white shadow-[0_14px_34px_-14px_var(--bm)] transition hover:brightness-110"
              >
                Experimentar como cliente <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="/login" className="inline-flex h-13 items-center rounded-2xl border border-line-strong px-6 font-semibold transition hover:bg-surface">
                Acesso da equipe
              </Link>
            </div>
          </div>
          <LivePhone />
        </div>
      </section>

      {/* Como funciona: é uma sequência real, então a ordem importa */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto w-full max-w-6xl px-5 py-20">
          <h2 id="como-funciona" className="max-w-xl scroll-mt-24 font-serif text-4xl leading-tight font-semibold tracking-tight md:text-5xl">
            Do QR Code à conta paga, sem papel no caminho.
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">{SITE.definition}</p>
          <ol className="mt-14 grid gap-x-10 gap-y-12 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <li key={s.title} className="relative">
                <div className="flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-[color-mix(in_oklch,var(--bm)_14%,var(--surface))] text-[var(--bm)]">
                    <s.icon className="size-5" />
                  </span>
                  <span className="font-serif text-sm text-muted italic">passo {i + 1}</span>
                </div>
                <h3 className="mt-5 text-lg font-bold">{s.title}</h3>
                <p className="mt-2 leading-relaxed text-muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Para quem */}
      <section className="mx-auto w-full max-w-6xl px-5 py-24">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 className="font-serif text-4xl leading-tight font-semibold tracking-tight md:text-5xl">
              Uma plataforma, <span className="font-normal italic">a casa inteira.</span>
            </h2>
            <p className="mt-5 max-w-sm text-muted">Cada restaurante tem sua própria identidade: logo, cores, capa e tipografia. O Better Menu fica nos bastidores.</p>
          </div>
          <dl className="divide-y divide-line border-y border-line">
            {roles.map((r) => (
              <div key={r.who} className="grid gap-2 py-6 sm:grid-cols-[10rem_1fr] sm:gap-8">
                <dt className="font-serif text-xl font-semibold">{r.who}</dt>
                <dd className="leading-relaxed text-muted">{r.what}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Acessibilidade: diferencial e conteúdo para quem busca "cardápio acessível" */}
      <section aria-labelledby="acessivel" className="relative overflow-hidden bg-[#16120f] text-white">
        <div className="pointer-events-none absolute -bottom-40 -left-32 size-[34rem] rounded-full bg-[var(--bm)] opacity-25 blur-[130px]" aria-hidden />
        <div className="relative mx-auto w-full max-w-6xl px-5 py-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/75">
            <Accessibility className="size-3.5" aria-hidden /> Acessibilidade
          </span>
          <h2 id="acessivel" className="mt-6 max-w-3xl font-serif text-4xl leading-tight font-semibold tracking-tight md:text-5xl">
            Todo mundo pede sozinho. <span className="font-normal text-[#ffb79c] italic">Inclusive quem não vê, não ouve ou não fala.</span>
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/70">
            O cardápio tem um botão de acessibilidade em todas as telas. O cliente ainda pode avisar como prefere ser atendido, e o garçom recebe a orientação na mesa.
          </p>
          <div className="mt-14 grid gap-12 lg:grid-cols-2">
            {access.map((col) => (
              <div key={col.who}>
                <h3 className="font-serif text-2xl font-semibold">{col.who}</h3>
                <ul className="mt-6 space-y-6">
                  {col.items.map((it) => (
                    <li key={it.title} className="flex gap-4">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-[#ffb79c]">
                        <it.icon className="size-5" aria-hidden />
                      </span>
                      <span>
                        <span className="block font-bold">{it.title}</span>
                        <span className="mt-1 block leading-relaxed text-white/65">{it.text}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <Link href="/acessibilidade" className="group mt-14 inline-flex h-12 items-center gap-2 rounded-2xl bg-white px-6 font-semibold text-[#16120f] transition hover:bg-white/90">
            Ver todos os recursos de acessibilidade <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
          </Link>
        </div>
      </section>

      {/* Perguntas frequentes (respostas diretas: Google, assistentes de voz e IAs citam este trecho) */}
      <section aria-labelledby="faq" className="mx-auto w-full max-w-6xl px-5 py-24">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 id="faq" className="font-serif text-4xl leading-tight font-semibold tracking-tight md:text-5xl">
              Perguntas <span className="font-normal italic">frequentes</span>
            </h2>
            <Link href="/perguntas-frequentes" className="mt-5 inline-flex items-center gap-2 font-semibold text-[var(--bm)] hover:underline">
              Ver todas as respostas <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <div className="border-t border-line">
            {homeFaq.map((f) => (
              <FaqItem key={f.q} q={f.q} a={f.a} />
            ))}
          </div>
        </div>
      </section>
    </main>
      <SiteFooter />
    </>
  );
}
