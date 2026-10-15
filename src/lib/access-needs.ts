import { Ear, EyeOff, Speech, type LucideIcon } from "lucide-react";

// Necessidades de atendimento que o cliente avisa pelo cardápio (guests.access_needs).
// A equipe vê o ícone na mesa e a orientação de como atender.

export const ACCESS_NEEDS = ["visao", "fala", "audicao"] as const;
export type AccessNeed = (typeof ACCESS_NEEDS)[number];

export const NEED_ICON: Record<AccessNeed, LucideIcon> = { visao: EyeOff, fala: Speech, audicao: Ear };

export const NEED_STAFF: Record<AccessNeed, { label: string; how: string }> = {
  visao: {
    label: "Deficiência visual",
    how: "Apresente-se pelo nome, leia as opções e a conta em voz alta e diga onde colocou cada prato.",
  },
  fala: {
    label: "Comunica-se por escrito",
    how: "Fale normalmente e espere a resposta: o cliente escreve ou mostra a mensagem na tela do celular.",
  },
  audicao: {
    label: "Surdo(a) ou ouve pouco",
    how: "Fale de frente, sem cobrir a boca, ou escreva. Os avisos do app chegam para ele por vibração e na tela.",
  },
};

export function cleanNeeds(raw: unknown): AccessNeed[] {
  return Array.isArray(raw) ? ACCESS_NEEDS.filter((n) => raw.includes(n)) : [];
}
