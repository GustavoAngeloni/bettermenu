import type { CSSProperties, ReactNode } from "react";
import { brandStyle } from "@/lib/branding";
import { cn } from "@/lib/cn";

/** Símbolo do Better Menu: um "b" desenhado como cabo de talher + prato. */
export function BetterMenuMark({ className, mono }: { className?: string; mono?: boolean }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("shrink-0", className ?? "size-9")} aria-hidden="true">
      <rect width="40" height="40" rx="11" fill={mono ? "currentColor" : "var(--bm)"} />
      <rect x="10.5" y="7.5" width="4.6" height="24.5" rx="2.3" fill={mono ? "var(--bg)" : "#fff"} />
      <circle cx="21.6" cy="23.6" r="6.9" fill="none" stroke={mono ? "var(--bg)" : "#fff"} strokeWidth="4.6" />
      <circle cx="30.2" cy="10.4" r="2.7" fill={mono ? "var(--bg)" : "#fff"} />
    </svg>
  );
}

export function BetterMenuLogo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BetterMenuMark className={markClassName} />
      <span className="font-serif text-[1.35em] leading-none font-semibold tracking-tight">
        better<span className="font-normal italic">menu</span>
      </span>
    </span>
  );
}

/**
 * Assinatura "by insight". `tone` força a versão clara ou escura do logo
 * (sobre fotos); sem `tone`, segue o tema da tela.
 */
export function ByInsight({ className, tone, label = "by" }: { className?: string; tone?: "light" | "dark"; label?: string }) {
  const img = (src: string, cls?: string) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="insight" width={853} height={324} className={cn("h-[1.05em] w-auto translate-y-[0.06em]", cls)} />
  );
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", className)}>
      <span className="opacity-70">{label}</span>
      {tone === "light"
        ? img("/brand/insight-light-ink.png")
        : tone === "dark"
          ? img("/brand/insight-dark-ink.png")
          : (
            <>
              {img("/brand/insight-dark-ink.png", "dark:hidden")}
              {img("/brand/insight-light-ink.png", "hidden dark:block")}
            </>
          )}
    </span>
  );
}

/** Rodapé "Better Menu · by insight" usado nas telas do restaurante. `tone="light"` sobre fotos. */
export function PoweredBy({ className, tone }: { className?: string; tone?: "light" }) {
  return (
    <a
      href="/"
      target="_blank"
      className={cn(
        "inline-flex items-center gap-2 text-xs transition-colors",
        tone === "light" ? "text-white/70 hover:text-white" : "text-muted hover:text-ink",
        className,
      )}
    >
      <BetterMenuMark className="size-4 rounded-[4px]" />
      <span>
        Feito com <strong className={cn("font-semibold", tone === "light" ? "text-white" : "text-ink")}>Better Menu</strong>
      </span>
      <span className="opacity-50">·</span>
      <ByInsight tone={tone} />
    </a>
  );
}

/**
 * Aplica a marca do restaurante (cor, tipografia) em tudo que estiver dentro.
 * Os tokens de cor (fundo, superfícies, linhas) são recalculados com a cor da marca.
 */
export function BrandScope({
  branding,
  children,
  className,
  style,
  theme,
}: {
  branding: unknown;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  theme?: "dark" | "light";
}) {
  return (
    <div className={cn("brand-scope flex flex-1 flex-col", className)} style={{ ...brandStyle(branding), ...style }} data-theme={theme}>
      {children}
    </div>
  );
}

/** Logo do restaurante, ou a inicial sobre a cor da marca. */
export function RestaurantLogo({ name, url, className }: { name: string; url: string | null | undefined; className?: string }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} className={cn("size-10 shrink-0 rounded-xl bg-surface object-cover", className)} />;
  }
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand font-display text-lg font-semibold text-on-brand",
        className,
      )}
      aria-label={name}
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}
