import { Accessibility } from "lucide-react";
import { cleanNeeds, NEED_ICON, NEED_STAFF } from "@/lib/access-needs";
import type { Guest } from "@/lib/types";

/** Ícones das necessidades de um cliente (mesa, chamados). */
export function NeedIcons({ needs, className }: { needs: unknown; className?: string }) {
  const list = cleanNeeds(needs);
  if (!list.length) return null;
  return (
    <span className={className} role="img" aria-label={list.map((n) => NEED_STAFF[n].label).join(", ")}>
      {list.map((n) => {
        const Icon = NEED_ICON[n];
        return <Icon key={n} className="inline size-4" aria-hidden />;
      })}
    </span>
  );
}

/** Quadro "Atendimento acessível" no topo da mesa: quem avisou o quê e como atender. */
export function AccessNote({ guests }: { guests: Pick<Guest, "id" | "name" | "access_needs">[] }) {
  const list = guests.map((g) => ({ g, needs: cleanNeeds(g.access_needs) })).filter((x) => x.needs.length);
  if (!list.length) return null;
  return (
    <section aria-label="Atendimento acessível" className="mb-4 rounded-2xl border-2 border-sky-500/50 bg-sky-50 p-4">
      <div className="flex items-center gap-2 font-bold text-sky-800">
        <Accessibility className="size-5" aria-hidden /> Atendimento acessível
      </div>
      <ul className="mt-2.5 space-y-2.5">
        {list.flatMap(({ g, needs }) =>
          needs.map((n) => {
            const Icon = NEED_ICON[n];
            return (
              <li key={`${g.id}-${n}`} className="flex gap-3">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-800">
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="text-sm leading-snug">
                  <strong>{g.name}</strong> · {NEED_STAFF[n].label}
                  <span className="block text-muted">{NEED_STAFF[n].how}</span>
                </span>
              </li>
            );
          }),
        )}
      </ul>
    </section>
  );
}
