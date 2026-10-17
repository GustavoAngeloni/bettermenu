"use client";

import { BarChart3, BookOpen, ChefHat, GraduationCap, ChevronsUpDown, ConciergeBell, LogOut, Palette, QrCode, Settings, Store, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { BetterMenuMark, ByInsight, RestaurantLogo } from "@/components/brand";
import { ThemeToggle } from "@/components/theme";
import { cn, Spinner } from "@/components/ui";

interface Units {
  list: { id: string; name: string }[];
  current: string;
  switchTo: (id: string) => Promise<string | void>;
}

/** Troca de unidade (dono com mais de um restaurante no plano). */
function UnitSwitcher({ units, className }: { units: Units; className?: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className={className}>
      <label className="relative flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm font-semibold">
        <Store className="size-4 shrink-0 text-brand-fg" aria-hidden />
        <span className="sr-only">Unidade</span>
        <select
          value={units.current}
          disabled={pending}
          onChange={(e) => {
            const id = e.target.value;
            setError(null);
            start(async () => {
              const err = await units.switchTo(id);
              if (err) setError(err);
            });
          }}
          className="min-w-0 flex-1 cursor-pointer appearance-none truncate bg-transparent pr-6 outline-none"
        >
          {units.list.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        {pending ? <Spinner className="absolute right-2.5 size-4" /> : <ChevronsUpDown className="pointer-events-none absolute right-2.5 size-4 text-muted" aria-hidden />}
      </label>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

const links = [
  { href: "/admin", label: "Visão geral", icon: BarChart3 },
  { href: "/admin/caixa", label: "Caixa", icon: Wallet, feature: "payments" as const },
  { href: "/admin/cardapio", label: "Cardápio", icon: BookOpen },
  { href: "/admin/mesas", label: "Mesas e QR Codes", icon: QrCode },
  { href: "/admin/equipe", label: "Equipe", icon: Users },
  { href: "/admin/marca", label: "Identidade visual", icon: Palette, ownerOnly: true },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings, ownerOnly: true },
  { href: "/admin/aprender", label: "Aprender", icon: GraduationCap },
];

const ops = [
  { href: "/garcom", label: "Salão (garçom)", icon: ConciergeBell },
  { href: "/cozinha", label: "Cozinha", icon: ChefHat },
];

export function AdminShell({
  restaurant,
  user,
  isOwner,
  payments,
  units,
  learningNew = 0,
  logout,
  banner,
  children,
}: {
  restaurant: { name: string; logoUrl: string | null };
  user: { name: string; role: string };
  isOwner: boolean;
  payments: boolean;
  units?: Units;
  /** novidades da central de aprendizado ainda não vistas */
  learningNew?: number;
  logout: () => Promise<void>;
  banner?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const visible = links.filter((l) => (!l.ownerOnly || isOwner) && (l.feature !== "payments" || payments));
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  return (
    <div className="flex flex-1 flex-col">
      {banner}
      <div className="flex flex-1">
        {/* Barra lateral (desktop) */}
        <aside className="no-print sticky top-0 hidden h-dvh w-[17rem] shrink-0 flex-col border-r border-line bg-surface lg:flex">
          <div className="flex items-center gap-3 px-5 pt-6 pb-5">
            <RestaurantLogo name={restaurant.name} url={restaurant.logoUrl} className="size-11 text-lg" />
            <div className="min-w-0">
              <div className="truncate font-display text-lg leading-tight font-semibold">{restaurant.name}</div>
              <div className="text-xs text-muted">Painel do restaurante</div>
            </div>
          </div>
          {units && <UnitSwitcher units={units} className="px-3 pb-4" />}

          <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
            {visible.map((l) => (
              <NavLink key={l.href} {...l} active={isActive(l.href)} badge={l.href === "/admin/aprender" ? learningNew : 0} />
            ))}
            <div className="px-3 pt-6 pb-2 text-xs font-semibold text-muted">Operação</div>
            {ops.map((l) => (
              <NavLink key={l.href} {...l} active={false} />
            ))}
          </nav>

          <div className="space-y-3 border-t border-line p-3">
            <div className="flex items-center gap-2 rounded-2xl bg-surface-2 p-2 pl-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-on-brand">
                {user.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{user.name}</div>
                <div className="text-xs text-muted">{user.role}</div>
              </div>
              <ThemeToggle />
              <form action={logout}>
                <button className="flex size-10 items-center justify-center rounded-full text-muted transition hover:bg-surface-3 hover:text-ink" aria-label="Sair" title="Sair">
                  <LogOut className="size-[18px]" />
                </button>
              </form>
            </div>
            <a href="/" target="_blank" className="flex items-center justify-between px-2 pb-1 text-xs text-muted transition hover:text-ink">
              <span className="flex items-center gap-1.5">
                <BetterMenuMark className="size-4 rounded-[4px]" /> Better Menu
              </span>
              <ByInsight />
            </a>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Topo (celular/tablet) */}
          <header className="no-print sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-xl lg:hidden">
            <div className="flex items-center gap-3 px-4 pt-3 pb-2">
              <RestaurantLogo name={restaurant.name} url={restaurant.logoUrl} className="size-9 text-base" />
              <div className="min-w-0 flex-1 truncate font-display text-lg font-semibold">{restaurant.name}</div>
              <ThemeToggle />
              <form action={logout}>
                <button className="flex size-10 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-ink" aria-label="Sair">
                  <LogOut className="size-[18px]" />
                </button>
              </form>
            </div>
            {units && <UnitSwitcher units={units} className="px-4 pb-2" />}
            <nav className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-2.5">
              {[...visible, ...ops].map((l) => {
                const active = isActive(l.href);
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={cn(
                      "flex h-9 shrink-0 items-center gap-2 rounded-full px-3.5 text-sm font-semibold whitespace-nowrap transition-colors",
                      active ? "bg-ink text-canvas" : "text-muted hover:bg-surface-2 hover:text-ink",
                    )}
                  >
                    <l.icon className="size-4" /> {l.label}
                    {l.href === "/admin/aprender" && learningNew > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold text-on-brand" aria-label={`${learningNew} novidades`}>
                        {learningNew}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </header>

          <main className="mx-auto w-full max-w-6xl min-w-0 flex-1 px-4 py-6 md:px-8 md:py-10 print:p-0">{children}</main>
        </div>
      </div>
    </div>
  );
}

function NavLink({ href, label, icon: Icon, active, badge = 0 }: { href: string; label: string; icon: typeof BarChart3; active: boolean; badge?: number }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
        active ? "bg-brand-soft text-brand-fg" : "text-muted hover:bg-surface-2 hover:text-ink",
      )}
    >
      <Icon className={cn("size-[18px] transition-transform duration-300 ease-out-expo", !active && "group-hover:scale-110")} />
      {label}
      {badge > 0 && (
        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-on-brand" aria-label={`${badge} novidades`}>
          {badge}
        </span>
      )}
    </Link>
  );
}
