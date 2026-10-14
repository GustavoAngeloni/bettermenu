import Link from "next/link";
import { ArrowLeft, LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";
import { logout } from "@/app/login/actions";
import { exitAs } from "@/app/super/actions";
import type { Profile, Restaurant } from "@/lib/types";
import { ROLE_LABEL } from "@/lib/types";
import { BetterMenuMark, RestaurantLogo } from "./brand";
import { ThemeToggle } from "./theme";

/** Faixa mostrada quando o super admin está dentro de um restaurante ("Entrar como"). */
export function ImpersonationBanner({ name }: { name: string }) {
  return (
    <form action={exitAs} className="no-print flex items-center justify-center gap-3 bg-violet-600 px-4 py-2 text-sm text-white">
      <ShieldCheck className="size-4 shrink-0" />
      <span className="truncate">
        Você está acessando <strong>{name}</strong> como Super Admin.
      </span>
      <button className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/20 px-3 py-1 font-semibold transition hover:bg-white/30">
        <ArrowLeft className="size-3.5" /> Voltar
      </button>
    </form>
  );
}

/** Cabeçalho das telas de operação (garçom e cozinha). Dono/gerente veem atalhos para as outras áreas. */
export function StaffHeader({
  restaurant,
  profile,
  title,
  impersonating,
}: {
  restaurant: Restaurant;
  profile: Profile;
  title: string;
  impersonating?: boolean;
}) {
  const isManager = profile.role === "owner" || profile.role === "manager";
  return (
    <header className="no-print sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-xl">
      {impersonating && <ImpersonationBanner name={restaurant.name} />}
      <div className="flex items-center gap-3 px-4 py-2.5">
        <RestaurantLogo name={restaurant.name} url={restaurant.logo_url} className="size-10 text-base" />
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-xl leading-tight font-semibold">{title}</div>
          <div className="truncate text-xs text-muted">
            {restaurant.name} · {profile.name}
            {profile.role ? ` (${ROLE_LABEL[profile.role]})` : ""}
          </div>
        </div>
        {isManager && (
          <nav className="hidden items-center gap-1 rounded-full bg-surface-2 p-1 text-sm font-semibold sm:flex">
            <Link className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-muted transition hover:bg-surface hover:text-ink" href="/admin">
              <LayoutDashboard className="size-4" /> Painel
            </Link>
            <Link className="rounded-full px-3 py-1.5 text-muted transition hover:bg-surface hover:text-ink" href="/garcom">
              Salão
            </Link>
            <Link className="rounded-full px-3 py-1.5 text-muted transition hover:bg-surface hover:text-ink" href="/cozinha">
              Cozinha
            </Link>
          </nav>
        )}
        <ThemeToggle />
        <form action={logout}>
          <button className="flex size-10 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-ink" aria-label="Sair" title="Sair">
            <LogOut className="size-[18px]" />
          </button>
        </form>
        <span className="hidden md:block" title="Better Menu by insight">
          <BetterMenuMark className="size-6 rounded-md opacity-80" />
        </span>
      </div>
    </header>
  );
}
