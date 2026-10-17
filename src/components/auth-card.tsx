import Link from "next/link";
import type { ReactNode } from "react";
import { BetterMenuLogo, ByInsight } from "@/components/brand";
import { ThemeToggle } from "@/components/theme";

/** Moldura das telas de senha (recuperar, redefinir, convite): centralizada, com a marca. */
export function AuthCard({ title, subtitle, children }: { title: ReactNode; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <main className="relative flex min-h-dvh flex-1 flex-col overflow-hidden px-5 py-6">
      <div className="pointer-events-none absolute -top-40 -right-40 size-[36rem] rounded-full bg-[var(--bm)] opacity-15 blur-[130px]" aria-hidden />
      <div className="relative flex items-center justify-between">
        <Link href="/" aria-label="Better Menu, página inicial">
          <BetterMenuLogo />
        </Link>
        <ThemeToggle />
      </div>
      <div className="relative mx-auto my-auto w-full max-w-sm py-12">
        <h1 className="font-display text-4xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-2 text-muted">{subtitle}</p>}
        <div className="mt-8">{children}</div>
      </div>
      <div className="relative flex items-center justify-center gap-2 text-xs text-muted">
        Better Menu <span className="opacity-50">·</span> <ByInsight />
      </div>
    </main>
  );
}
