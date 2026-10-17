"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { formatBRL } from "@/lib/money";
import { cycleAmountCents } from "@/lib/plans";

/** Barra fixa no celular: aparece depois do topo e some na seção de planos. */
export function StickyCta() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      const plans = document.getElementById("planos")?.getBoundingClientRect();
      const inPlans = plans ? plans.top < window.innerHeight && plans.bottom > 0 : false;
      setShow(window.scrollY > 700 && !inPlans);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/90 p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl transition-transform duration-500 md:hidden",
        show ? "translate-y-0" : "translate-y-full",
      )}
      aria-hidden={!show}
    >
      <Link href="#planos" tabIndex={show ? 0 : -1} className="flex h-12 items-center justify-between rounded-2xl bg-[var(--bm)] px-5 font-semibold text-white">
        <span>Começar hoje</span>
        <span className="flex items-center gap-2 text-sm">
          a partir de {formatBRL(Math.round(cycleAmountCents("essencial", "anual") / 12))}/mês <ArrowRight className="size-4" />
        </span>
      </Link>
    </div>
  );
}
