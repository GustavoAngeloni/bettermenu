"use client";

import { BarChart3, BookOpen, QrCode, Settings, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui";

const links = [
  { href: "/admin", label: "Estatísticas", icon: BarChart3 },
  { href: "/admin/caixa", label: "Caixa", icon: Wallet, feature: "payments" as const },
  { href: "/admin/cardapio", label: "Cardápio", icon: BookOpen },
  { href: "/admin/mesas", label: "Mesas e QR Codes", icon: QrCode },
  { href: "/admin/equipe", label: "Equipe", icon: Users },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings, ownerOnly: true },
];

export function AdminNav({ isOwner, payments }: { isOwner: boolean; payments: boolean }) {
  const pathname = usePathname();
  return (
    <nav className="no-print no-scrollbar flex gap-1 overflow-x-auto border-b border-line bg-white px-2 py-2 md:w-60 md:flex-col md:border-r md:border-b-0 md:bg-transparent md:px-4 md:py-8">
      {links
        .filter((l) => (!l.ownerOnly || isOwner) && (l.feature !== "payments" || payments))
        .map((l) => {
          const active = l.href === "/admin" ? pathname === "/admin" : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium whitespace-nowrap",
                active ? "bg-brand-soft text-brand" : "text-muted hover:bg-stone-100 hover:text-ink",
              )}
            >
              <l.icon className="size-4" /> {l.label}
            </Link>
          );
        })}
    </nav>
  );
}
