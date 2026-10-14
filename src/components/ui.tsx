"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export { cn };

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success" | "ink";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand text-on-brand shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_1px_2px_rgb(0_0_0/0.12)] hover:bg-brand-dark disabled:opacity-45",
  secondary: "bg-surface text-ink border border-line-strong hover:border-ink/40 hover:bg-surface-2 disabled:opacity-50",
  ghost: "text-ink hover:bg-surface-2 disabled:opacity-50",
  danger: "bg-red-600 text-white hover:bg-red-700 disabled:opacity-50",
  success: "bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50",
  ink: "bg-ink text-canvas hover:bg-ink/88 disabled:opacity-50",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" | "lg" }) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-[background-color,border-color,transform,opacity] duration-200 select-none active:scale-[0.97] disabled:cursor-not-allowed disabled:active:scale-100",
        size === "sm" && "h-9 px-3 text-sm",
        size === "md" && "h-11 px-4 text-sm",
        size === "lg" && "h-14 rounded-2xl px-6 text-base",
        variants[variant],
        className,
      )}
    />
  );
}

/** Painel que sobe de baixo no celular e vira modal centralizado no desktop. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
  bleed,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  /** conteúdo começa colado nas bordas (ex.: foto do prato) e o título vai para dentro dele */
  bleed?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div
        ref={panel}
        tabIndex={-1}
        className={cn(
          "relative flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-[1.75rem] bg-surface text-ink shadow-float outline-none animate-slide-up sm:rounded-[1.75rem]",
          wide ? "sm:max-w-2xl" : "sm:max-w-md",
        )}
      >
        {/* alça de arrastar (visual) no celular */}
        <span className="pointer-events-none absolute top-2 left-1/2 z-20 h-1 w-10 -translate-x-1/2 rounded-full bg-ink/15 sm:hidden" aria-hidden />
        {bleed ? (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-20 flex size-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition hover:bg-black/60"
            aria-label="Fechar"
          >
            <X className="size-5" />
          </button>
        ) : (
          <div className="flex items-center justify-between gap-4 px-5 pt-6 pb-3 sm:pt-5">
            <div className="min-w-0 flex-1 font-display text-xl font-semibold text-ink">{title}</div>
            <button onClick={onClose} className="-mr-1 rounded-full p-2 text-muted transition hover:bg-surface-2 hover:text-ink" aria-label="Fechar">
              <X className="size-5" />
            </button>
          </div>
        )}
        <div className={cn("flex-1 overflow-y-auto overscroll-contain", bleed ? "pb-5" : "px-5 pb-5")}>{children}</div>
        {footer && (
          <div className="border-t border-line bg-surface px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>
        )}
      </div>
    </div>
  );
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap", className)}>
      {children}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <span className={cn("inline-block size-5 animate-spin rounded-full border-2 border-current border-r-transparent", className)} />;
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs leading-relaxed text-muted">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-base text-ink placeholder:text-muted/80 outline-none transition-[border-color,box-shadow] focus:border-brand focus:ring-4 focus:ring-brand/15 disabled:bg-surface-2 disabled:text-muted sm:text-sm";

/** Título de página das telas internas. */
export function PageHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink md:text-[2.15rem]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Seletor de duas ou mais opções com indicador deslizante. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  className?: string;
}) {
  const i = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  return (
    <div className={cn("relative grid rounded-2xl bg-surface-2 p-1", className)} style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      <span
        aria-hidden
        className="absolute inset-y-1 left-1 rounded-xl bg-surface shadow-sm transition-transform duration-300 ease-out-expo"
        style={{ width: `calc((100% - 0.5rem) / ${options.length})`, transform: `translateX(${i * 100}%)` }}
      />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn("relative z-10 rounded-xl py-2 text-sm font-semibold transition-colors", value === o.value ? "text-ink" : "text-muted hover:text-ink")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
