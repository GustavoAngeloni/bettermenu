import {
  Accessibility,
  BellRing,
  Contrast,
  Ear,
  EyeOff,
  Hand,
  Keyboard,
  Maximize2,
  MessageSquareText,
  Mic,
  Speech,
  Type,
  Vibrate,
  Volume2,
  Wind,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FaqItem, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { FAQ } from "@/lib/faq";
import { APP_ID, breadcrumbLd, faqLd, JsonLd, ORG_ID, SITE } from "@/lib/site";
import { LibrasOnPage } from "./libras";

const DESCRIPTION =
  "Recursos de acessibilidade do Better Menu para pessoas cegas, com baixa visão, surdas e que não falam: leitor de tela, ouvir o cardápio, ditado, Libras com VLibras, mensagens escritas para o garçom e avisos por vibração.";

export const metadata: Metadata = {
  title: "Acessibilidade: cardápio digital para pessoas cegas, surdas e que não falam",
  description: DESCRIPTION,
  alternates: { canonical: "/acessibilidade" },
  openGraph: { title: "Acessibilidade no Better Menu", description: DESCRIPTION, url: "/acessibilidade" },
};

type Feature = { icon: LucideIcon; title: string; text: string };

const groups: { id: string; icon: LucideIcon; who: string; intro: string; features: Feature[] }[] = [
  {
    id: "cegos",
    icon: EyeOff,
    who: "Pessoas cegas e com baixa visão",
    intro: "Todo o caminho, do QR Code à conta, pode ser feito ouvindo.",
    features: [
      { icon: Accessibility, title: "VoiceOver e TalkBack", text: "Botões com nome, preços com promoção lidos como “de R$ 40 por R$ 32”, status do pedido e totais anunciados. Sem botões escondidos dentro de outros." },
      { icon: Volume2, title: "Ouvir o cardápio", text: "Uma voz lê categoria por categoria: nome, descrição, restrições e preço de cada prato, com controles de pausar, voltar e avançar. O prato lido fica destacado na tela." },
      { icon: Speech, title: "Narrar em voz alta", text: "Mesmo sem leitor de tela, o app fala o que acontece: item adicionado, mensagem enviada, pedido pronto, garçom a caminho." },
      { icon: Mic, title: "Ditar mensagens", text: "No campo de mensagem para a equipe, toque no microfone e fale. O texto aparece escrito para conferir antes de enviar." },
      { icon: Type, title: "Texto até 30% maior", text: "Três tamanhos de letra. O layout inteiro acompanha, sem cortar nem sobrepor." },
      { icon: Contrast, title: "Alto contraste", text: "Textos quase pretos (ou brancos no tema escuro), bordas bem marcadas e foco do teclado impossível de perder." },
    ],
  },
  {
    id: "surdos",
    icon: Ear,
    who: "Pessoas surdas, com baixa audição ou que não falam",
    intro: "Pedir, chamar, perguntar e pagar sem precisar falar nem ouvir.",
    features: [
      { icon: MessageSquareText, title: "Mensagem para o garçom", text: "Frases prontas (“Água, por favor”, “Tenho alergia”, “Quero pagar”) ou texto livre chegam no celular do garçom, mesmo com a tela bloqueada." },
      { icon: Maximize2, title: "Mostrar na tela", text: "A mensagem aparece em letras enormes, preto no branco, para virar o celular para quem estiver atendendo." },
      { icon: Hand, title: "Libras com VLibras", text: "O tradutor oficial e gratuito do Governo Federal: toque em qualquer texto e um avatar traduz para Libras." },
      { icon: Vibrate, title: "Avisos por vibração", text: "Pedido pronto e garçom atendendo fazem o celular vibrar, além do aviso na tela. Nada depende só de som." },
    ],
  },
];

const forAll: Feature[] = [
  { icon: Wind, title: "Reduzir animações", text: "Desliga movimentos e efeitos. Também respeita a configuração do sistema." },
  { icon: Keyboard, title: "Teclado e foco", text: "Tudo funciona com teclado, painéis prendem o foco enquanto abertos e devolvem ao fechar, e há atalho para pular direto ao cardápio." },
  { icon: BellRing, title: "Atendimento avisado", text: "O cliente informa como prefere ser atendido e o garçom vê um selo na mesa com a orientação certa." },
];

export default function AccessibilityPage() {
  const faq = FAQ.filter((f) => f.group === "Acessibilidade");
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebPage",
              name: "Acessibilidade no Better Menu",
              description: DESCRIPTION,
              inLanguage: "pt-BR",
              publisher: { "@id": ORG_ID },
              about: { "@id": APP_ID },
              accessibilityFeature: ["largePrint", "highContrastDisplay", "synthesizedSpeech", "signLanguage", "structuralNavigation"],
            },
            breadcrumbLd([
              { name: "Better Menu", path: "/" },
              { name: "Acessibilidade", path: "/acessibilidade" },
            ]),
            faqLd(faq),
          ],
        }}
      />
      <SiteHeader />
      <main id="conteudo" className="flex-1">
        <section className="relative overflow-hidden bg-[#16120f] text-white">
          <div className="pointer-events-none absolute -top-40 right-[-10rem] size-[38rem] rounded-full bg-[var(--bm)] opacity-30 blur-[140px]" aria-hidden />
          <div className="relative mx-auto w-full max-w-6xl px-5 pt-16 pb-20">
            <nav aria-label="Você está em" className="text-sm text-white/60">
              <Link href="/" className="hover:text-white">
                Better Menu
              </Link>{" "}
              / <span aria-current="page">Acessibilidade</span>
            </nav>
            <h1 className="mt-8 max-w-4xl font-serif text-[clamp(2.4rem,6vw,4.5rem)] leading-[1.03] font-semibold tracking-[-0.02em]">
              Um cardápio que <span className="font-normal text-[#ffb79c] italic">todo mundo consegue usar.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/72">
              No {SITE.name}, quem não enxerga ouve o cardápio, quem não ouve recebe os avisos na tela e por vibração, e quem não fala conversa com o garçom por escrito.
              Tudo no mesmo cardápio, sem aplicativo extra.
            </p>
            <div className="mt-10 inline-flex items-center gap-3 rounded-2xl border border-white/15 bg-white/5 p-4 pr-6">
              <span className="flex size-11 items-center justify-center rounded-xl bg-white text-[#16120f]">
                <Accessibility className="size-6" aria-hidden />
              </span>
              <span className="text-sm leading-snug text-white/80">
                <strong className="block text-base text-white">Como ativar</strong>
                Toque no símbolo de acessibilidade no topo do cardápio.
              </span>
            </div>
          </div>
        </section>

        <div className="mx-auto w-full max-w-6xl px-5">
          {groups.map((g) => (
            <section key={g.id} aria-labelledby={g.id} className="border-b border-line py-20">
              <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
                <div>
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-[color-mix(in_oklch,var(--bm)_14%,var(--surface))] text-[var(--bm)]">
                    <g.icon className="size-6" aria-hidden />
                  </span>
                  <h2 id={g.id} className="mt-5 font-serif text-3xl leading-tight font-semibold tracking-tight md:text-4xl">
                    {g.who}
                  </h2>
                  <p className="mt-3 text-lg text-muted">{g.intro}</p>
                </div>
                <ul className="grid gap-x-8 gap-y-8 sm:grid-cols-2">
                  {g.features.map((f) => (
                    <li key={f.title}>
                      <f.icon className="size-5 text-[var(--bm)]" aria-hidden />
                      <h3 className="mt-3 text-lg font-bold">{f.title}</h3>
                      <p className="mt-1.5 leading-relaxed text-muted">{f.text}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ))}

          <section aria-labelledby="todos" className="border-b border-line py-20">
            <h2 id="todos" className="font-serif text-3xl font-semibold tracking-tight md:text-4xl">
              Para todos
            </h2>
            <ul className="mt-10 grid gap-8 md:grid-cols-3">
              {forAll.map((f) => (
                <li key={f.title} className="rounded-2xl border border-line bg-surface p-6">
                  <f.icon className="size-5 text-[var(--bm)]" aria-hidden />
                  <h3 className="mt-3 text-lg font-bold">{f.title}</h3>
                  <p className="mt-1.5 leading-relaxed text-muted">{f.text}</p>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="declaracao" className="grid gap-10 py-20 lg:grid-cols-[0.8fr_1.2fr]">
            <h2 id="declaracao" className="font-serif text-3xl font-semibold tracking-tight md:text-4xl">
              Declaração de acessibilidade
            </h2>
            <div className="space-y-5 text-lg leading-relaxed text-muted">
              <p>
                O {SITE.name} segue como referência as Diretrizes de Acessibilidade para Conteúdo Web (WCAG 2.2, nível AA) e o Modelo de Acessibilidade em Governo
                Eletrônico (eMAG), em atenção à Lei Brasileira de Inclusão (Lei nº 13.146/2015).
              </p>
              <p>
                <strong className="text-ink">Limitações conhecidas.</strong> A tradução em Libras depende do serviço VLibras, do Governo Federal. O ditado por voz funciona
                nos navegadores que oferecem reconhecimento de fala (Chrome no Android e Safari no iPhone, por exemplo). As fotos dos pratos são decorativas: a descrição
                escrita pelo restaurante é o que o leitor de tela lê.
              </p>
              <p>
                Encontrou uma barreira? Conte para o restaurante ou para a equipe do {SITE.name}
                {SITE.contactEmail ? (
                  <>
                    {" "}
                    pelo e-mail{" "}
                    <a className="font-semibold text-[var(--bm)] underline" href={`mailto:${SITE.contactEmail}`}>
                      {SITE.contactEmail}
                    </a>
                  </>
                ) : null}
                . Cada relato vira melhoria.
              </p>
            </div>
          </section>

          <section aria-labelledby="perguntas" className="pb-24">
            <h2 id="perguntas" className="font-serif text-3xl font-semibold tracking-tight">
              Perguntas frequentes
            </h2>
            <div className="mt-4 border-t border-line">
              {faq.map((f) => (
                <FaqItem key={f.q} q={f.q} a={f.a} open />
              ))}
            </div>
            <Link href="/demo" className="mt-10 inline-flex h-12 items-center rounded-2xl bg-[var(--bm)] px-6 font-semibold text-white">
              Testar a acessibilidade no cardápio de demonstração
            </Link>
          </section>
        </div>
      </main>
      <SiteFooter />
      <LibrasOnPage />
    </>
  );
}
