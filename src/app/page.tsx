import {
  Accessibility,
  ArrowRight,
  BadgeCheck,
  BellRing,
  ChefHat,
  Clock,
  CreditCard,
  Ear,
  FileX,
  Hand,
  Languages,
  LayoutDashboard,
  MessageSquareText,
  QrCode,
  Receipt,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  TrendingUp,
  Users,
  Volume2,
  X,
  Zap,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BetterMenuLogo, ByInsight } from "@/components/brand";
import { LiveDemo } from "@/components/landing/live-demo";
import { ProfitCalculator } from "@/components/landing/profit-calculator";
import { ShareWhatsApp } from "@/components/landing/share-whatsapp";
import { StickyCta } from "@/components/landing/sticky-cta";
import { Pricing } from "@/components/pricing";
import { FaqItem, SiteFooter } from "@/components/site-chrome";
import { ThemeToggle } from "@/components/theme";
import { FAQ } from "@/lib/faq";
import { formatBRL } from "@/lib/money";
import { cycleAmountCents } from "@/lib/plans";
import { faqLd, JsonLd, organizationLd, SITE, softwareLd } from "@/lib/site";
import { LoginForm } from "./login/login-form";
import { LivePhone } from "./live-phone";

export const metadata: Metadata = {
  title: { absolute: "Better Menu · Cardápio digital que vende mais: pedido na mesa, cozinha ao vivo e conta dividida" },
  description:
    "O cliente escaneia o QR Code, pede pelo celular e a cozinha recebe na hora. A conta se divide sozinha e você vê o lucro de cada prato. Sem aplicativo, sem fidelidade, pronto hoje.",
  alternates: { canonical: "/" },
  openGraph: { url: "/", title: "Better Menu · O cardápio que deixa a mesa com vontade de pedir", description: SITE.description },
};

const pains = [
  { icon: BellRing, pain: "Mesa acenando e ninguém vê", fix: "Chamado no celular do garçom, até com a tela bloqueada." },
  { icon: FileX, pain: "Comanda de papel que some no caminho", fix: "O pedido sai do celular do cliente direto para a tela da cozinha." },
  { icon: Receipt, pain: "Seis pessoas e uma calculadora", fix: "Cada um vê a sua parte, com os itens divididos e o serviço." },
  { icon: Clock, pain: "Cardápio impresso com preço velho", fix: "Mudou o preço ou acabou o prato? Muda na hora, em todas as mesas." },
  { icon: TrendingUp, pain: "Vender muito e não saber se lucra", fix: "Custo, lucro e margem de cada prato, no painel do dono." },
];

const roles = [
  { icon: Smartphone, who: "Para o cliente", items: ["Cardápio com fotos, no idioma dele", "Pede, acompanha e chama sem esperar", "Conta dividida, sem constrangimento"] },
  { icon: BellRing, who: "Para o salão", items: ["Chamados e pratos prontos com som", "Mapa de mesas ao vivo", "Pagamento por pessoa e mesa liberada em 1 toque"] },
  { icon: ChefHat, who: "Para a cozinha", items: ["Comandas por estação, sem papel perdido", "Total do que produzir em lote", "Esgotou? Some do cardápio na hora"] },
  { icon: LayoutDashboard, who: "Para você, dono", items: ["Faturamento e ticket médio ao vivo", "Lucro e margem de cada prato", "Horários de pico, avaliações e caixa"] },
];

const objections = [
  ["E se meu cliente for mais velho ou não gostar de celular?", "O garçom continua lançando pedidos normalmente pelo próprio celular. O QR é um caminho a mais, nunca o único. E o cardápio tem letra grande, alto contraste e leitura em voz alta."],
  ["Preciso comprar tablet, impressora, alguma máquina?", "Não. Funciona no celular e no navegador que você já tem. A impressora térmica de 80 mm é opcional, para quem gosta de comanda em papel."],
  ["Quanto tempo leva para começar?", "O restaurante é criado assim que o pagamento é aprovado. Você cadastra o cardápio (ou importa de uma planilha ou foto), imprime os QR Codes e abre no mesmo dia."],
  ["Tem fidelidade ou multa para cancelar?", "Não. Você cancela quando quiser pelo próprio painel; o acesso continua até o fim do período já pago."],
];

export default function Home() {
  const homeFaq = FAQ.filter((f) => f.home);
  const fromMonthly = Math.round(cycleAmountCents("essencial", "anual") / 12);
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

      {/* Topo da landing: planos, demonstração e login de quem já é cliente */}
      <header className="sticky top-0 z-40 border-b border-line/60 bg-canvas/80 backdrop-blur-xl">
        <a href="#conteudo" className="sr-only z-50 rounded-full bg-ink px-5 py-3 font-semibold text-canvas focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
          Pular para o conteúdo
        </a>
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-5 py-3">
          <Link href="/" aria-label="Better Menu, página inicial">
            <BetterMenuLogo />
          </Link>
          <span className="flex-1" />
          <nav aria-label="Principal" className="hidden items-center gap-6 text-sm font-semibold text-muted md:flex">
            <a href="#demo" className="hover:text-ink">
              Como funciona
            </a>
            <a href="#planos" className="hover:text-ink">
              Planos
            </a>
            <a href="#perguntas" className="hover:text-ink">
              Dúvidas
            </a>
          </nav>
          <ThemeToggle />
          <Link href="/login" className="inline-flex h-10 items-center rounded-full border border-line-strong px-4 text-sm font-semibold transition hover:bg-surface-2">
            <span className="sm:hidden">Entrar</span>
            <span className="hidden sm:inline">Já sou cliente</span>
          </Link>
          <a href="#planos" className="hidden h-10 items-center rounded-full bg-[var(--bm)] px-5 text-sm font-semibold text-white transition hover:brightness-110 sm:inline-flex">
            Assinar
          </a>
        </div>
      </header>

      <main id="conteudo" className="flex flex-1 flex-col overflow-x-clip">
        {/* HERO */}
        <section className="relative">
          <div className="pointer-events-none absolute top-10 -right-40 size-[44rem] rounded-full bg-[var(--bm)] opacity-[0.14] blur-[150px]" aria-hidden />
          <div className="mx-auto grid w-full max-w-6xl items-center gap-14 px-5 pt-12 pb-20 md:pt-16 lg:grid-cols-[1.1fr_1fr] lg:gap-8">
            <div className="animate-rise">
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-muted">
                <span className="size-1.5 rounded-full bg-[var(--bm)] animate-pulse-dot" /> Cardápio digital · pedidos na mesa · conta dividida
              </span>
              <h1 className="mt-6 font-serif text-[clamp(2.6rem,6.2vw,5rem)] leading-[1.0] font-semibold tracking-[-0.03em]">
                Seu salão vende mais quando <span className="font-normal text-[var(--bm)] italic">ninguém espera o garçom.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted md:text-xl">
                O cliente escaneia o QR Code, pede pelo celular e a cozinha recebe na hora. A conta se divide sozinha. E você finalmente vê{" "}
                <strong className="text-ink">quanto lucra em cada prato</strong>. Tudo com a cara do seu restaurante.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <a
                  href="#planos"
                  className="group inline-flex h-14 items-center gap-2 rounded-2xl bg-[var(--bm)] px-7 text-lg font-semibold text-white shadow-[0_18px_40px_-16px_var(--bm)] transition hover:brightness-110"
                >
                  Quero começar hoje <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
                </a>
                <a href="#demo" className="inline-flex h-14 items-center gap-2 rounded-2xl border border-line-strong px-6 font-semibold transition hover:bg-surface">
                  <Zap className="size-4 text-[var(--bm)]" /> Ver um pedido acontecer
                </a>
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
                {["Sem aplicativo para baixar", "Sem fidelidade", "Pronto no mesmo dia", `A partir de ${formatBRL(fromMonthly)}/mês no anual`].map((t) => (
                  <li key={t} className="flex items-center gap-1.5">
                    <BadgeCheck className="size-4 text-emerald-600" aria-hidden /> {t}
                  </li>
                ))}
              </ul>
            </div>
            <LivePhone />
          </div>
        </section>

        {/* DOR → SOLUÇÃO */}
        <section aria-labelledby="dor" className="border-y border-line bg-surface">
          <div className="mx-auto w-full max-w-6xl px-5 py-20">
            <p className="text-sm font-bold tracking-widest text-[var(--bm)] uppercase">Sexta, 21h</p>
            <h2 id="dor" className="mt-3 max-w-3xl font-serif text-4xl leading-tight font-semibold tracking-tight md:text-5xl">
              Você conhece essa noite. <span className="font-normal italic">Ela custa caro.</span>
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-muted">Casa cheia é ótimo. O problema é tudo o que se perde entre a mesa, o garçom e a cozinha.</p>
            <ul className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pains.map((p) => (
                <li key={p.pain} className="rounded-[1.6rem] border border-line bg-canvas p-6">
                  <p.icon className="size-6 text-[var(--bm)]" aria-hidden />
                  <p className="mt-4 flex items-start gap-2 font-semibold text-muted line-through decoration-red-400/70 decoration-2">
                    <X className="mt-0.5 size-4 shrink-0 text-red-500 no-underline" aria-hidden /> {p.pain}
                  </p>
                  <p className="mt-2 text-lg leading-snug font-semibold">{p.fix}</p>
                </li>
              ))}
              <li className="flex flex-col justify-center rounded-[1.6rem] bg-[#16120f] p-6 text-white">
                <p className="font-serif text-2xl leading-snug font-semibold">
                  Menos espera, menos erro, <span className="font-normal text-[#ffb79c] italic">mais pedidos por mesa.</span>
                </p>
                <a href="#demo" className="mt-5 inline-flex items-center gap-2 font-semibold text-[#ffb79c] hover:underline">
                  Veja em 20 segundos <ArrowRight className="size-4" />
                </a>
              </li>
            </ul>
          </div>
        </section>

        {/* DEMONSTRAÇÃO AO VIVO (JS) */}
        <section id="demo" aria-labelledby="demo-t" className="relative scroll-mt-16 overflow-hidden bg-[#16120f] text-white">
          <div className="pointer-events-none absolute -top-32 left-1/2 size-[50rem] -translate-x-1/2 rounded-full bg-[var(--bm)] opacity-20 blur-[160px]" aria-hidden />
          <div className="relative mx-auto w-full max-w-6xl px-5 py-24">
            <p className="text-sm font-bold tracking-widest text-[#ffb79c] uppercase">Ao vivo</p>
            <h2 id="demo-t" className="mt-3 max-w-3xl font-serif text-4xl leading-tight font-semibold tracking-tight md:text-5xl">
              Um pedido atravessando o seu restaurante, <span className="font-normal text-[#ffb79c] italic">em tempo real.</span>
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-white/65">Três telas, um único fluxo. Nenhum papel, nenhum grito no passe.</p>
            <div className="mt-12">
              <LiveDemo />
            </div>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/demo" className="inline-flex h-12 items-center gap-2 rounded-2xl bg-white px-6 font-semibold text-[#16120f] transition hover:bg-white/90">
                <Smartphone className="size-4" /> Testar como cliente no seu celular
              </Link>
              <a href="#planos" className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[var(--bm)] px-6 font-semibold text-white transition hover:brightness-110">
                Quero isso no meu restaurante <ArrowRight className="size-4" />
              </a>
            </div>
          </div>
        </section>

        {/* CALCULADORA */}
        <section aria-labelledby="calc" className="mx-auto w-full max-w-6xl px-5 py-24">
          <p className="text-sm font-bold tracking-widest text-[var(--bm)] uppercase">Faça a conta</p>
          <h2 id="calc" className="mt-3 max-w-3xl font-serif text-4xl leading-tight font-semibold tracking-tight md:text-5xl">
            E se cada mesa pedisse <span className="font-normal italic">só mais uma sobremesa?</span>
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-muted">Mexa com os números da sua casa. Cardápio com foto e sugestões na hora certa fazem a mesa pedir de novo, sem ninguém precisar oferecer.</p>
          <div className="mt-10">
            <ProfitCalculator />
          </div>
        </section>

        {/* TUDO QUE VEM JUNTO */}
        <section aria-labelledby="tudo" className="border-y border-line bg-surface">
          <div className="mx-auto w-full max-w-6xl px-5 py-24">
            <h2 id="tudo" className="max-w-3xl font-serif text-4xl leading-tight font-semibold tracking-tight md:text-5xl">
              Uma plataforma, <span className="font-normal italic">a casa inteira conectada.</span>
            </h2>
            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {roles.map((r) => (
                <div key={r.who} className="rounded-[1.6rem] border border-line bg-canvas p-6">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-[color-mix(in_oklch,var(--bm)_14%,var(--surface))] text-[var(--bm)]">
                    <r.icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-5 font-serif text-xl font-semibold">{r.who}</h3>
                  <ul className="mt-3 space-y-2 text-sm text-muted">
                    {r.items.map((i) => (
                      <li key={i} className="flex gap-2">
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--bm)]" aria-hidden /> {i}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-2 text-sm">
              {[
                [Languages, "Português, inglês e espanhol"],
                [Sparkles, "Com a sua logo, cores e fotos"],
                [Users, "Até 5 unidades no mesmo login"],
                [QrCode, "Cartões de QR prontos para imprimir"],
                [CreditCard, "Fechamento de caixa por forma de pagamento"],
              ].map(([I, t]) => {
                const Icon = I as typeof Languages;
                return (
                  <span key={t as string} className="inline-flex items-center gap-2 rounded-full border border-line bg-canvas px-4 py-2 font-semibold">
                    <Icon className="size-4 text-[var(--bm)]" aria-hidden /> {t as string}
                  </span>
                );
              })}
            </div>
          </div>
        </section>

        {/* ACESSIBILIDADE (diferencial que viraliza) */}
        <section aria-labelledby="acessivel" className="mx-auto w-full max-w-6xl px-5 py-24">
          <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-muted">
                <Accessibility className="size-3.5" aria-hidden /> Só aqui
              </span>
              <h2 id="acessivel" className="mt-5 font-serif text-4xl leading-tight font-semibold tracking-tight md:text-5xl">
                O único cardápio que <span className="font-normal text-[var(--bm)] italic">todo mundo consegue usar sozinho.</span>
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-muted">
                Quem não enxerga ouve o cardápio. Quem não ouve recebe os avisos na tela e por vibração. Quem não fala conversa com o garçom por escrito. É inclusão de verdade e é
                a história que os seus clientes vão contar para os amigos.
              </p>
              <Link href="/acessibilidade" className="mt-6 inline-flex items-center gap-2 font-semibold text-[var(--bm)] hover:underline">
                Ver os recursos de acessibilidade <ArrowRight className="size-4" />
              </Link>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {[
                [Volume2, "Ouvir o cardápio", "Uma voz lê pratos, descrições e preços."],
                [MessageSquareText, "Mensagem para o garçom", "Frases prontas ou texto livre, direto no celular dele."],
                [Hand, "Libras com VLibras", "Qualquer texto do cardápio traduzido por um avatar."],
                [Ear, "Avisos por vibração", "Pedido pronto chega na tela e no toque."],
              ].map(([I, t, d]) => {
                const Icon = I as typeof Volume2;
                return (
                  <li key={t as string} className="rounded-[1.4rem] border border-line bg-surface p-5">
                    <Icon className="size-5 text-[var(--bm)]" aria-hidden />
                    <h3 className="mt-3 font-bold">{t as string}</h3>
                    <p className="mt-1 text-sm text-muted">{d as string}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* PLANOS */}
        <section id="planos" aria-labelledby="planos-t" className="scroll-mt-16 border-y border-line bg-surface">
          <div className="mx-auto w-full max-w-6xl px-5 py-24">
            <p className="text-center text-sm font-bold tracking-widest text-[var(--bm)] uppercase">Planos</p>
            <h2 id="planos-t" className="mx-auto mt-3 max-w-3xl text-center font-serif text-4xl leading-tight font-semibold tracking-tight md:text-5xl">
              Comece hoje. <span className="font-normal italic">Pague por mês ou economize no ano.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-lg text-muted">Sem taxa de adesão e sem fidelidade. No plano anual você ganha 5% de desconto.</p>
            <div className="mt-12">
              <Pricing />
            </div>
            <ul className="mx-auto mt-10 grid max-w-4xl gap-4 text-sm sm:grid-cols-3">
              {[
                [ShieldCheck, "Pagamento seguro", "Cartão de crédito processado pelo Mercado Pago."],
                [Zap, "Acesso na hora", "Restaurante criado assim que o pagamento é aprovado. Os acessos chegam no seu e-mail."],
                [RefreshCw, "Cancele quando quiser", "Sem multa. O acesso segue até o fim do período pago."],
              ].map(([I, t, d]) => {
                const Icon = I as typeof Zap;
                return (
                  <li key={t as string} className="flex gap-3 rounded-2xl border border-line bg-canvas p-4">
                    <Icon className="size-5 shrink-0 text-emerald-600" aria-hidden />
                    <span>
                      <strong className="block">{t as string}</strong>
                      <span className="text-muted">{d as string}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* OBJEÇÕES + FAQ */}
        <section id="perguntas" aria-labelledby="faq" className="mx-auto w-full max-w-6xl scroll-mt-16 px-5 py-24">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <h2 id="faq" className="font-serif text-4xl leading-tight font-semibold tracking-tight md:text-5xl">
                Ainda com <span className="font-normal italic">dúvida?</span>
              </h2>
              <p className="mt-4 text-muted">As perguntas que todo dono faz antes de assinar.</p>
              <Link href="/perguntas-frequentes" className="mt-5 inline-flex items-center gap-2 font-semibold text-[var(--bm)] hover:underline">
                Ver todas as respostas <ArrowRight className="size-4" />
              </Link>
            </div>
            <div className="border-t border-line">
              {objections.map(([q, a]) => (
                <FaqItem key={q} q={q} a={a} />
              ))}
              {homeFaq.slice(0, 4).map((f) => (
                <FaqItem key={f.q} q={f.q} a={f.a} />
              ))}
            </div>
          </div>
        </section>

        {/* CTA FINAL + INDICAÇÃO */}
        <section className="relative overflow-hidden bg-[#16120f] text-white">
          <div className="pointer-events-none absolute -bottom-40 -left-20 size-[40rem] rounded-full bg-[var(--bm)] opacity-30 blur-[150px]" aria-hidden />
          <div className="relative mx-auto flex w-full max-w-6xl flex-col items-start gap-8 px-5 py-24 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <h2 className="font-serif text-[clamp(2.4rem,5vw,4rem)] leading-[1.02] font-semibold tracking-tight">
                Amanhã, sua casa cheia pode <span className="font-normal text-[#ffb79c] italic">funcionar sozinha.</span>
              </h2>
              <p className="mt-5 text-lg text-white/65">Assine agora, receba os acessos no e-mail e monte seu cardápio ainda hoje.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <a href="#planos" className="group inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-[var(--bm)] px-8 text-lg font-semibold text-white transition hover:brightness-110">
                Escolher meu plano <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
              </a>
              <ShareWhatsApp className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl border border-white/20 px-6 font-semibold transition hover:bg-white/10" />
            </div>
          </div>
        </section>

        {/* JÁ É CLIENTE */}
        <section id="entrar" aria-labelledby="entrar-t" className="mx-auto w-full max-w-6xl scroll-mt-16 px-5 py-20">
          <div className="grid items-center gap-10 rounded-[2rem] border border-line bg-surface p-6 md:p-10 lg:grid-cols-[1fr_24rem]">
            <div>
              <h2 id="entrar-t" className="font-serif text-3xl font-semibold tracking-tight md:text-4xl">
                Já é cliente? <span className="font-normal italic">Entre por aqui.</span>
              </h2>
              <p className="mt-3 max-w-md text-muted">
                Use o código do restaurante, o usuário e a senha que chegaram no seu e-mail de boas-vindas. Garçons e cozinha entram pelo mesmo lugar.
              </p>
              <p className="mt-4 text-sm text-muted">
                Esqueceu a senha? O dono gera uma nova em Equipe. Dono sem acesso? Fale com a equipe <ByInsight label="" className="align-middle text-sm" />.
              </p>
            </div>
            <LoginForm compact />
          </div>
        </section>
      </main>

      <SiteFooter />
      <StickyCta />
    </>
  );
}
