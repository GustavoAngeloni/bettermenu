import Link from "next/link";
import { BetterMenuLogo, ByInsight } from "@/components/brand";
import { ThemeToggle } from "@/components/theme";
import { PUBLIC_PAGES, SITE } from "@/lib/site";

/** Cabeçalho das páginas públicas (home, guia, acessibilidade, FAQ). */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-canvas/80 backdrop-blur-xl">
      <a href="#conteudo" className="sr-only z-50 rounded-full bg-ink px-5 py-3 font-semibold text-canvas focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Pular para o conteúdo
      </a>
      <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-5 py-3.5">
        <Link href="/" aria-label="Better Menu, página inicial">
          <BetterMenuLogo />
        </Link>
        <span className="flex-1" />
        <nav aria-label="Principal" className="hidden items-center gap-6 text-sm font-semibold text-muted md:flex">
          <Link href="/planos" className="transition hover:text-ink">
            Planos
          </Link>
          <Link href="/cardapio-digital" className="transition hover:text-ink">
            Cardápio digital
          </Link>
          <Link href="/acessibilidade" className="transition hover:text-ink">
            Acessibilidade
          </Link>
          <Link href="/perguntas-frequentes" className="transition hover:text-ink">
            Perguntas
          </Link>
          <Link href="/demo" className="transition hover:text-ink">
            Demonstração
          </Link>
        </nav>
        <ThemeToggle />
        <Link href="/login" className="inline-flex h-10 items-center rounded-full bg-ink px-5 text-sm font-semibold text-canvas transition hover:opacity-90">
          Entrar
        </Link>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-12 md:grid-cols-[1.2fr_1fr]">
        <div>
          <BetterMenuLogo className="text-ink" markClassName="size-7" />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">{SITE.definition}</p>
        </div>
        <nav aria-label="Rodapé" className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          {PUBLIC_PAGES.filter((p) => p.path !== "/").map((p) => (
            <Link key={p.path} href={p.path} className="text-muted transition hover:text-ink">
              {p.title}
            </Link>
          ))}
          <Link href="/login" className="text-muted transition hover:text-ink">
            Acesso da equipe
          </Link>
          {SITE.contactUrl && (
            <a href={SITE.contactUrl} className="text-muted transition hover:text-ink">
              Fale com a gente
            </a>
          )}
        </nav>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-6 text-sm text-muted">
          <span>© {new Date().getFullYear()} Better Menu</span>
          <span className="flex items-center gap-2">
            Uma solução <ByInsight label="" className="text-sm" />
          </span>
        </div>
      </div>
    </footer>
  );
}

/** Pergunta e resposta abrível (FAQ). O texto fica no HTML para buscadores mesmo fechado. */
export function FaqItem({ q, a, open }: { q: string; a: string; open?: boolean }) {
  return (
    <details className="group border-b border-line py-5 [&_summary::-webkit-details-marker]:hidden" open={open}>
      <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-lg font-bold">
        <h3 className="text-lg font-bold">{q}</h3>
        <span aria-hidden className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full border border-line-strong text-muted transition group-open:rotate-45">
          +
        </span>
      </summary>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted">{a}</p>
    </details>
  );
}
