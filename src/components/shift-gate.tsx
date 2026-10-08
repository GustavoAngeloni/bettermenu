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
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="rounded-full bg-brand-soft p-6 text-brand">
        <BellRing className="size-12" />
      </div>
      <div>
        <h1 className="text-2xl font-bold">Pronto para o turno?</h1>
        <p className="mt-2 max-w-sm text-muted">
          Toque abaixo para ativar os alertas sonoros de {role}. Mantenha esta tela aberta e o volume ligado.
        </p>
      </div>
      <Button
        size="lg"
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
