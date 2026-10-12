import Link from "next/link";
import { LogOut } from "lucide-react";
import { logout } from "@/app/login/actions";
import { exitAs } from "@/app/super/actions";
import type { Profile, Restaurant } from "@/lib/types";
import { ROLE_LABEL } from "@/lib/types";

/** Cabeçalho das telas da equipe. Dono/gerente veem atalhos para todas as áreas. */
export function StaffHeader({
  restaurant,
  profile,
  title,
  dark,
  impersonating,
}: {
  restaurant: Restaurant;
  profile: Profile;
  title: string;
  dark?: boolean;
  impersonating?: boolean;
}) {
  const isManager = profile.role === "owner" || profile.role === "manager";
  const link = dark ? "text-white/70 hover:text-white" : "text-muted hover:text-ink";
  return (
    <header className={dark ? "no-print border-b border-white/10 bg-stone-900 text-white" : "no-print border-b border-line bg-white"}>
      {impersonating && (
        <form action={exitAs} className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-violet-600 px-4 py-1.5 text-center text-sm text-white">
          <span>
            Você está acessando <strong>{restaurant.name}</strong> como Super Admin.
          </span>
          <button className="rounded-md bg-white/20 px-2 py-0.5 font-semibold hover:bg-white/30">Voltar ao Super Admin</button>
        </form>
      )}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand font-bold text-white">
          {restaurant.name.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-bold leading-tight">{title}</div>
          <div className={dark ? "truncate text-xs text-white/60" : "truncate text-xs text-muted"}>
            {restaurant.name} · {profile.name} ({profile.role ? ROLE_LABEL[profile.role] : ""})
          </div>
        </div>
        {isManager && (
          <nav className="hidden gap-4 text-sm font-medium sm:flex">
            <Link className={link} href="/admin">
              Painel
            </Link>
            <Link className={link} href="/garcom">
              Garçom
            </Link>
            <Link className={link} href="/cozinha">
              Cozinha
            </Link>
          </nav>
        )}
        <form action={logout} className="shrink-0">
          <button className={`rounded-lg p-2 ${link}`} aria-label="Sair" title="Sair">
            <LogOut className="size-5" />
          </button>
        </form>
      </div>
      {isManager && (
        <nav className="flex gap-1 px-3 pb-2 text-sm font-medium sm:hidden">
          {[
            ["/admin", "Painel"],
            ["/garcom", "Garçom"],
            ["/cozinha", "Cozinha"],
          ].map(([href, label]) => (
            <Link key={href} href={href} className={`flex-1 rounded-lg py-1.5 text-center ${dark ? "bg-white/10 text-white/80" : "bg-stone-100 text-muted"}`}>
              {label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
