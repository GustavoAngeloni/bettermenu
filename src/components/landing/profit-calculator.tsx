"use client";

import { useState } from "react";
import { formatBRL } from "@/lib/money";
import { PLANS } from "@/lib/plans";

// Simulação transparente: o dono informa os próprios números. Nada de promessa de "aumento de X%".

function Slider({ label, value, min, max, step = 1, onChange, format }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; format: (v: number) => string }) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-semibold">{label}</span>
        <span className="font-serif text-xl font-semibold tabular-nums">{format(value)}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-2 w-full accent-[var(--bm)]" />
    </label>
  );
}

export function ProfitCalculator() {
  const [tables, setTables] = useState(15);
  const [turns, setTurns] = useState(3);
  const [share, setShare] = useState(25);
  const [price, setPrice] = useState(22);
  const perMonth = Math.round(tables * turns * 30 * (share / 100) * price * 100);
  const plan = PLANS.profissional.priceCents;
  const items = Math.ceil(plan / (price * 100));
  return (
    <div className="grid gap-8 rounded-[2rem] border border-line bg-surface p-6 md:p-9 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-6">
        <Slider label="Mesas no salão" value={tables} min={4} max={60} onChange={setTables} format={(v) => String(v)} />
        <Slider label="Giros por dia (vezes que cada mesa é ocupada)" value={turns} min={1} max={8} onChange={setTurns} format={(v) => `${v}×`} />
        <Slider label="Mesas que pedem 1 item a mais" value={share} min={5} max={60} step={5} onChange={setShare} format={(v) => `${v}%`} />
        <Slider label="Preço desse item (sobremesa, drink...)" value={price} min={8} max={60} onChange={setPrice} format={(v) => formatBRL(v * 100)} />
        <p className="text-xs leading-relaxed text-muted">
          Simulação com os seus números. Fotos, sugestões de “combina com” e o pedido sem esperar o garçom são o que fazem a mesa pedir aquele item a mais.
        </p>
      </div>
      <div className="flex flex-col justify-between rounded-[1.6rem] bg-[#16120f] p-7 text-white">
        <div>
          <div className="text-xs font-bold tracking-widest text-[#ffb79c] uppercase">Por mês, a mais no caixa</div>
          <div className="mt-2 font-serif text-5xl font-semibold tracking-tight tabular-nums" aria-live="polite">
            {formatBRL(perMonth)}
          </div>
          <div className="mt-1 text-sm text-white/60">{formatBRL(perMonth * 12)} em um ano</div>
        </div>
        <div className="mt-8 rounded-2xl bg-white/[0.07] p-4 text-sm leading-relaxed text-white/80">
          O plano Profissional custa {formatBRL(plan)} por mês. Ele se paga com <strong className="text-[#ffb79c]">{items} itens a mais no mês</strong>: menos de{" "}
          {Math.max(1, Math.ceil(items / 30))} por dia.
        </div>
      </div>
    </div>
  );
}
