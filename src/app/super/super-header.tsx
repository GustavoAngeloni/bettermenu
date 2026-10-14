import { LogOut } from "lucide-react";
import Link from "next/link";
import { logout } from "@/app/login/actions";
import { BetterMenuLogo, ByInsight } from "@/components/brand";
import { ThemeToggle } from "@/components/theme";

export function SuperHeader({ name }: { name: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 md:px-8">
        <Link href="/super" aria-label="Início do Super Admin">
          <BetterMenuLogo />
        </Link>
        <span className="hidden rounded-full bg-violet-100 px-2.5 py-1 text-xs font-bold text-violet-800 sm:inline">Super Admin</span>
        <span className="flex-1" />
        <ByInsight className="hidden md:inline-flex" />
        <span className="hidden h-6 w-px bg-line md:block" />
        <span className="hidden text-sm text-muted sm:block">{name}</span>
        <ThemeToggle />
        <form action={logout}>
          <button className="flex size-10 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-ink" aria-label="Sair">
            <LogOut className="size-[18px]" />
          </button>
        </form>
      </div>
    </header>
  );
}
