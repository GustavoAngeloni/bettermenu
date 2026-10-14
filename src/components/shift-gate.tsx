"use client";

import { BellRing } from "lucide-react";
import { useState, type ReactNode } from "react";
import { unlockAudio } from "@/lib/alerts";
import { Button } from "./ui";

/**
 * Tela inicial do garçom/cozinha. O toque em "Iniciar turno" libera o som
 * (navegadores bloqueiam áudio sem interação) e mantém a tela acesa.
 */
export function ShiftGate({ children, role }: { children: ReactNode; role: string }) {
  const [started, setStarted] = useState(false);
  if (started) return <>{children}</>;
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center gap-7 overflow-hidden p-8 text-center">
      <div className="pointer-events-none absolute top-1/2 left-1/2 size-[30rem] -translate-1/2 rounded-full bg-brand/15 blur-3xl" aria-hidden />
      <div className="relative flex size-28 items-center justify-center rounded-[2rem] bg-brand text-on-brand shadow-[0_24px_48px_-20px_var(--brand-glow)] animate-rise">
        <span className="absolute inset-0 rounded-[2rem] animate-pulse-dot" />
        <BellRing className="size-12" />
      </div>
      <div className="relative animate-rise [animation-delay:80ms]">
        <h1 className="font-display text-4xl font-semibold tracking-tight">Pronto para o turno?</h1>
        <p className="mx-auto mt-3 max-w-sm text-muted">
          Toque abaixo para ativar os alertas sonoros de {role}. Mantenha esta tela aberta e o volume ligado.
        </p>
      </div>
      <Button
        size="lg"
        className="relative min-w-56 animate-rise [animation-delay:160ms]"
        onClick={async () => {
          await unlockAudio().catch(() => {});
          setStarted(true);
        }}
      >
        Iniciar turno
      </Button>
    </div>
  );
}
