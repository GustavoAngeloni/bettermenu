"use client";

import { useState } from "react";
import { COLOR_PRESETS } from "@/lib/branding";
import { cn } from "@/lib/cn";

const SHOWCASE = COLOR_PRESETS.filter((c) => ["Vinho", "Mar", "Manjericão", "Mostarda", "Grafite"].includes(c.name));
const FONTS = ["classico", "elegante", "moderno", "classico", "moderno"];

/** O cardápio de demonstração rodando de verdade dentro de um celular, com troca de identidade. */
export function LivePhone() {
  const [i, setI] = useState(0);
  const c = SHOWCASE[i];
  return (
    <div className="relative mx-auto flex flex-col items-center animate-rise [animation-delay:150ms]">
      <div className="relative w-full max-w-[19.5rem] rounded-[3rem] bg-[#0f0f10] p-2.5 shadow-[0_40px_80px_-30px_rgb(0_0_0/0.55)] ring-1 ring-black/20 sm:max-w-[21rem]">
        <span className="absolute top-5 left-1/2 z-10 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />
        <div className="h-[39rem] overflow-hidden rounded-[2.4rem] bg-black sm:h-[42rem]">
          <iframe
            key={c.hex}
            title="Demonstração do cardápio"
            src={`/demo?cor=${c.hex.slice(1)}&fonte=${FONTS[i]}`}
            className="size-full animate-fade-in"
            loading="lazy"
          />
        </div>
      </div>
      <div className="mt-6 flex items-center gap-3 rounded-full border border-line bg-surface p-1.5 pr-4 shadow-card">
        <div className="flex gap-1.5">
          {SHOWCASE.map((s, n) => (
            <button
              key={s.hex}
              onClick={() => setI(n)}
              aria-label={`Ver com a cor ${s.name}`}
              aria-pressed={n === i}
              className={cn("size-7 rounded-full transition-transform hover:scale-110", n === i && "ring-2 ring-ink ring-offset-2 ring-offset-surface")}
              style={{ background: s.hex }}
            />
          ))}
        </div>
        <span className="text-xs font-semibold text-muted">Troque a identidade</span>
      </div>
    </div>
  );
}
