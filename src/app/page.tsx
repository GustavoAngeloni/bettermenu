import { ArrowRight, BellRing, ChefHat, QrCode, Receipt } from "lucide-react";
import Link from "next/link";
import { BetterMenuLogo, ByInsight } from "@/components/brand";
import { ThemeToggle } from "@/components/theme";
import { LivePhone } from "./live-phone";

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

export default function Home() {
  return (
    <main className="flex flex-1 flex-col overflow-x-clip">
      <header className="sticky top-0 z-40 border-b border-line/60 bg-canvas/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-5 py-3.5">
          <BetterMenuLogo />
          <span className="flex-1" />
          <Link href="/demo" className="hidden text-sm font-semibold text-muted transition hover:text-ink sm:block">
            Demonstração
          </Link>
          <ThemeToggle />
          <Link href="/login" className="inline-flex h-10 items-center rounded-full bg-ink px-5 text-sm font-semibold text-canvas transition hover:opacity-90">
            Entrar
          </Link>
        </div>
      </header>

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
          <h2 className="max-w-xl font-serif text-4xl leading-tight font-semibold tracking-tight md:text-5xl">Do QR Code à conta paga, sem papel no caminho.</h2>
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

      <footer className="mt-auto border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm text-muted">
          <BetterMenuLogo className="text-ink" markClassName="size-7" />
          <span className="flex items-center gap-2">
            Uma solução <ByInsight label="" className="text-sm" />
          </span>
        </div>
      </footer>
    </main>
  );
}
