import { LogOut } from "lucide-react";
import Link from "next/link";
import { logout } from "@/app/login/actions";

export function SuperHeader({ name }: { name: string }) {
  return (
    <header className="border-b border-line bg-ink text-white">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Link href="/super" className="flex size-9 items-center justify-center rounded-xl bg-brand font-bold">
          B
        </Link>
        <div className="flex-1">
          <div className="font-bold">Better Menu · Super Admin</div>
          <div className="text-xs text-white/60">{name}</div>
        </div>
        <form action={logout}>
          <button className="rounded-lg p-2 text-white/70 hover:text-white" aria-label="Sair">
            <LogOut className="size-5" />
          </button>
        </form>
      </div>
    </header>
  );
}
