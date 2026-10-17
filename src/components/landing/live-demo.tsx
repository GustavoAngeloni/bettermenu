"use client";

import { Bell, Check, ChefHat, Flame, Pause, Play, Plus, Receipt, Smartphone, TrendingUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

// Demonstração roteirizada: um pedido atravessando o restaurante, em três telas sincronizadas.
// Toca sozinha quando aparece na tela; respeita "reduzir movimento" (aí avança só por clique).

const STEPS = [
  { t: "Mesa 7 escaneia o QR Code", d: "Sem aplicativo: o cardápio abre no celular, com a cara da casa." },
  { t: "Ana escolhe o Bife ancho", d: "Foto, adicionais e observação. Um toque e está no pedido." },
  { t: "Pedido enviado", d: "Em menos de um segundo, a comanda aparece na tela da cozinha." },
  { t: "A cozinha começa", d: "Ana acompanha no celular: em preparo." },
  { t: "Pronto para servir", d: "O celular do garçom apita, até com a tela bloqueada." },
  { t: "A conta se divide sozinha", d: "Cada um vê a sua parte, com o serviço. Sem calculadora." },
  { t: "E você vê o lucro", d: "Faturamento, ticket médio e lucro do prato, ao vivo." },
] as const;
const DURATION = 3200;

export function LiveDemo() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [calm, setCalm] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  // Começa a tocar quando a seção aparece (e para quando sai)
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion === "reduce";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCalm(reduce);
    if (reduce) return;
    const obs = new IntersectionObserver(([e]) => setPlaying(e.isIntersecting), { threshold: 0.35 });
    if (root.current) obs.observe(root.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!playing) return;
    const id = setTimeout(() => setStep((s) => (s + 1) % STEPS.length), step === STEPS.length - 1 ? DURATION + 1800 : DURATION);
    return () => clearTimeout(id);
  }, [playing, step]);

  return (
    <div ref={root} className="relative flex flex-col">
      <div className="order-2 mt-8 grid items-start gap-6 lg:order-1 lg:mt-0 lg:grid-cols-[1fr_1fr_1fr]">
        <Customer step={step} />
        <Kitchen step={step} />
        <Waiter step={step} />
      </div>

      {/* Linha do tempo */}
      <div className="order-1 rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-5 lg:order-2 lg:mt-10">
        <div className="flex items-start gap-4">
          <button
            type="button"
            onClick={() => setPlaying(!playing)}
            aria-label={playing ? "Pausar demonstração" : "Tocar demonstração"}
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--bm)] text-white transition hover:brightness-110"
          >
            {playing ? <Pause className="size-5" /> : <Play className="size-5" />}
          </button>
          <div className="min-w-0 flex-1" aria-live="polite">
            <div className="text-xs font-bold tracking-widest text-[#ffb79c] uppercase">
              Passo {step + 1} de {STEPS.length}
            </div>
            <div className="mt-1 font-serif text-2xl font-semibold text-white">{STEPS[step].t}</div>
            <div className="mt-0.5 text-white/65">{STEPS[step].d}</div>
          </div>
        </div>
        <div className="mt-5 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${STEPS.length}, 1fr)` }}>
          {STEPS.map((s, i) => (
            <button key={s.t} type="button" onClick={() => setStep(i)} aria-label={`Ir para: ${s.t}`} className="group h-6 py-2">
              <span className="block h-1.5 overflow-hidden rounded-full bg-white/15">
                <span
                  key={`${i}-${step}-${playing}`}
                  className={cn("block h-full rounded-full bg-[var(--bm)]", i < step ? "w-full" : i === step ? (playing && !calm ? "animate-[fill_var(--d)_linear_forwards]" : "w-full") : "w-0")}
                  style={{ ["--d" as string]: `${DURATION}ms` }}
                />
              </span>
            </button>
          ))}
        </div>
      </div>
      <style>{`@keyframes fill{from{width:0}to{width:100%}}`}</style>
    </div>
  );
}

// No celular só aparece a tela da vez; no computador, as três lado a lado.
const ON_MOBILE: Record<string, number[]> = { cliente: [0, 1, 5], cozinha: [2, 3], garcom: [4, 6] };

function Device({ label, icon: Icon, children, active, id, step }: { label: string; icon: typeof Smartphone; children: React.ReactNode; active: boolean; id: string; step: number }) {
  return (
    <div className={cn("flex-col items-center", ON_MOBILE[id].includes(step) ? "flex" : "hidden lg:flex")}>
      <div className={cn("mb-3 flex items-center gap-2 text-sm font-semibold transition-colors", active ? "text-white" : "text-white/45")}>
        <Icon className="size-4" /> {label}
        {active && <span className="size-2 rounded-full bg-[var(--bm)] animate-pulse" />}
      </div>
      <div
        className={cn(
          "relative h-[27rem] w-full max-w-[17.5rem] overflow-hidden rounded-[2.4rem] border-[7px] border-[#0b0a09] bg-[#f7f4f1] text-[#1d1714] shadow-[0_30px_60px_-30px_rgba(0,0,0,.8)] transition-[transform,box-shadow] duration-500",
          active && "scale-[1.02] shadow-[0_30px_70px_-25px_rgba(224,87,43,.55)]",
        )}
      >
        <span className="absolute top-2 left-1/2 z-20 h-4 w-16 -translate-x-1/2 rounded-full bg-[#0b0a09]" />
        {children}
      </div>
    </div>
  );
}

const STATUS = ["Recebido", "Em preparo", "Pronto", "Entregue"];

function Customer({ step }: { step: number }) {
  const ordered = step >= 2;
  const inCart = step === 1;
  const status = step <= 2 ? 0 : step === 3 ? 1 : 2;
  return (
    <Device id="cliente" step={step} label="Celular do cliente" icon={Smartphone} active={step <= 3 || step === 5}>
      <div className="h-24 bg-[url(https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=60&auto=format&fit=crop)] bg-cover bg-center" />
      <div className="-mt-6 px-4">
        <div className="flex size-11 items-center justify-center rounded-xl bg-[#b4441f] font-serif text-lg font-bold text-white ring-4 ring-[#f7f4f1]">B</div>
        <div className="mt-1.5 font-serif text-xl leading-tight font-semibold">Brasa &amp; Vinho</div>
        <div className="text-[11px] text-[#7a6f68]">Mesa 7 · Olá, Ana</div>
      </div>

      {step < 5 && !ordered && (
        <div className="mt-3 space-y-2 px-3">
          {[
            ["Bife ancho na brasa", "R$ 119,00", "1600891964092-4316c288032e"],
            ["Spaghetti de camarão", "R$ 89,00", "1563379926898-05f4575a45d8"],
            ["Burger da casa", "R$ 54,00", "1568901346375-23c9450c58cd"],
          ].map(([n, p, img], i) => (
            <div key={n} className={cn("flex items-center gap-2.5 rounded-2xl p-2 transition-colors duration-500", i === 0 && step >= 1 && "bg-[#fbe9e1]")}>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-bold">{n}</div>
                {i === 0 && (
                  <div className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 text-[9px] font-bold text-amber-800">
                    <Flame className="size-2.5" /> Mais pedido
                  </div>
                )}
                <div className="text-[12px] font-semibold">{p}</div>
              </div>
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`https://images.unsplash.com/photo-${img}?w=160&q=60&auto=format&fit=crop`} alt="" className="size-14 rounded-xl object-cover" />
                <span className={cn("absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full bg-white shadow ring-1 ring-black/10", i === 0 && step === 1 && "animate-ping-once bg-[#e0572b] text-white")}>
                  <Plus className="size-3.5" strokeWidth={3} />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* barra do pedido */}
      <div className={cn("absolute inset-x-3 bottom-3 flex items-center gap-2 rounded-2xl bg-[#b4441f] p-2 pr-3 text-white transition-all duration-500", inCart ? "translate-y-0 opacity-100" : "translate-y-16 opacity-0")}>
        <span className="flex size-8 items-center justify-center rounded-xl bg-black/15 text-sm font-bold">1</span>
        <span className="flex-1 text-[13px] font-bold">Confirmar pedido</span>
        <span className="text-[13px] font-bold">R$ 119,00</span>
      </div>

      {/* acompanhamento */}
      {ordered && step < 5 && (
        <div className="mt-4 px-4 animate-[rise_.5s_ease-out_both]">
          <div className="font-serif text-lg font-semibold">Acompanhe seu pedido</div>
          <div className="mt-2 rounded-2xl border border-black/10 bg-white p-3">
            <div className="text-[13px] font-bold">1× Bife ancho na brasa</div>
            <div className="text-[11px] text-[#b4441f]">“ponto para mal”</div>
            <div className="mt-2 flex gap-1">
              {STATUS.map((s, i) => (
                <span key={s} className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/10">
                  <span className={cn("block h-full bg-[#b4441f] transition-all duration-700", i <= status ? "w-full" : "w-0")} />
                </span>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-4 text-[9px] font-semibold">
              {STATUS.map((s, i) => (
                <span key={s} className={i === status ? "text-[#b4441f]" : i < status ? "" : "text-black/35"}>
                  {s}
                </span>
              ))}
            </div>
          </div>
          {step === 4 && <div className="mt-3 rounded-full bg-[#1d1714] px-3 py-2 text-center text-[12px] font-semibold text-white animate-[rise_.4s_ease-out_both]">✓ Seu Bife ancho está pronto!</div>}
        </div>
      )}
      {step === 2 && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#b4441f] text-white animate-[fadeout_2.8s_ease_forwards]">
          <Check className="size-14 rounded-full border-4 border-white/40 p-2" strokeWidth={3} />
          <div className="mt-3 font-serif text-2xl font-semibold">Pedido enviado!</div>
          <div className="text-sm opacity-80">A cozinha já recebeu.</div>
        </div>
      )}

      {/* conta dividida */}
      {step >= 5 && (
        <div className="mt-4 px-4 animate-[rise_.5s_ease-out_both]">
          <div className="text-[11px] font-semibold text-[#7a6f68]">Sua parte</div>
          <div className="font-serif text-4xl font-semibold">R$ 86,35</div>
          <div className="mt-3 space-y-1.5 border-t border-dashed border-black/20 pt-3 text-[12px]">
            <Row a="1× Bife ancho ÷2" b="R$ 59,50" />
            <Row a="2× Negroni ÷4" b="R$ 19,00" />
            <Row a="Serviço (10%)" b="R$ 7,85" muted />
          </div>
          <div className="mt-3 rounded-2xl bg-white p-3 text-[12px]">
            <Row a="Ana (você)" b="R$ 86,35" bold />
            <Row a="Bruno" b="R$ 84,70" />
            <Row a="Lia" b="R$ 41,80" />
          </div>
        </div>
      )}
    </Device>
  );
}

function Row({ a, b, muted, bold }: { a: string; b: string; muted?: boolean; bold?: boolean }) {
  return (
    <div className={cn("flex justify-between gap-2", muted && "text-[#7a6f68]", bold && "font-bold")}>
      <span>{a}</span>
      <span className="tabular-nums">{b}</span>
    </div>
  );
}

function Kitchen({ step }: { step: number }) {
  const col = step < 2 ? -1 : step === 2 ? 0 : step === 3 ? 1 : 2;
  const headers = ["Novos", "Em preparo", "Prontos"];
  return (
    <Device id="cozinha" step={step} label="Tela da cozinha" icon={ChefHat} active={step >= 2 && step <= 4}>
      <div className="h-full bg-[#141110] px-3 pt-8 text-white">
        <div className="flex items-center justify-between">
          <span className="font-serif text-lg font-semibold">Cozinha</span>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px]">A produzir: 3× Burger</span>
        </div>
        <div className="mt-3 space-y-3">
          {headers.map((h, i) => (
            <div key={h} className="rounded-2xl bg-white/[0.05] p-2">
              <div className="mb-1.5 flex justify-between text-[11px] font-bold text-white/60">
                {h}
                <span>{i === col ? 1 : i === 0 ? 0 : 0}</span>
              </div>
              {i === col ? (
                <div
                  key={`${i}-${step}`}
                  className={cn(
                    "overflow-hidden rounded-xl text-[#1d1714] animate-[slide_.5s_cubic-bezier(.16,1,.3,1)_both]",
                    i === 0 ? "bg-[#ef4444]" : i === 1 ? "bg-amber-400" : "bg-emerald-500",
                  )}
                >
                  <div className="flex justify-between px-2.5 pt-2 font-serif text-base font-semibold text-white">
                    Mesa 7 <span className="font-sans text-[11px] font-bold">{i === 0 ? "agora" : i === 1 ? "4 min" : "17 min"}</span>
                  </div>
                  <div className="mx-1 mb-1 mt-1 rounded-lg bg-white p-2 text-[12px]">
                    <div className="flex items-center gap-1.5 font-bold">
                      <span className={cn("flex size-3.5 items-center justify-center rounded border", i === 2 ? "border-emerald-600 bg-emerald-600 text-white" : "border-black/30")}>
                        {i === 2 && <Check className="size-2.5" strokeWidth={4} />}
                      </span>
                      1× Bife ancho na brasa
                    </div>
                    <div className="pl-5 text-[10px] text-[#b4441f]">ponto para mal · Ana</div>
                  </div>
                </div>
              ) : (
                <div className="h-6 rounded-xl border border-dashed border-white/10" />
              )}
            </div>
          ))}
        </div>
      </div>
    </Device>
  );
}

function Waiter({ step }: { step: number }) {
  return (
    <Device id="garcom" step={step} label="Celular do garçom" icon={Bell} active={step >= 4}>
      <div className="px-3 pt-8">
        <div className="font-serif text-lg font-semibold">Salão</div>
        <div className="mt-2 min-h-[5.5rem] space-y-2">
          {step === 4 && (
            <div className="flex items-center gap-2 rounded-2xl border-2 border-emerald-500 bg-emerald-50 p-2.5 animate-[slide_.5s_cubic-bezier(.16,1,.3,1)_both]">
              <span className="flex size-8 items-center justify-center rounded-full bg-emerald-500 text-white animate-[swing_1s_ease-in-out_infinite]">
                <Bell className="size-4" />
              </span>
              <span className="text-[12px]">
                <b className="block">Mesa 7 · Pronto para servir</b>1× Bife ancho (Ana)
              </span>
            </div>
          )}
          {step === 5 && (
            <div className="flex items-center gap-2 rounded-2xl border-2 border-red-500 bg-red-50 p-2.5 animate-[slide_.5s_cubic-bezier(.16,1,.3,1)_both]">
              <span className="flex size-8 items-center justify-center rounded-full bg-red-500 text-white">
                <Receipt className="size-4" />
              </span>
              <span className="text-[12px]">
                <b className="block">Mesa 7 · Pediu a conta</b>3 pessoas · R$ 212,85
              </span>
            </div>
          )}
          {step === 6 && (
            <div className="rounded-2xl bg-[#1d1714] p-3 text-white animate-[slide_.5s_cubic-bezier(.16,1,.3,1)_both]">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#ffb79c]">
                <TrendingUp className="size-3.5" /> Painel do dono · hoje
              </div>
              <div className="mt-1 font-serif text-2xl font-semibold">R$ 3.537,40</div>
              <div className="mt-1 grid grid-cols-2 gap-2 text-[11px]">
                <span>
                  Ticket por mesa<b className="block text-sm">R$ 212,85</b>
                </span>
                <span>
                  Lucro no ancho<b className="block text-sm text-emerald-400">R$ 70,00</b>
                </span>
              </div>
            </div>
          )}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {Array.from({ length: 9 }, (_, i) => {
            const n = i + 1;
            const calling = n === 7 && (step === 4 || step === 5);
            const busy = [2, 3, 5, 7, 9].includes(n);
            return (
              <div
                key={n}
                className={cn(
                  "flex aspect-square flex-col items-center justify-center rounded-2xl text-center transition-colors duration-500",
                  calling ? "bg-red-500 text-white" : busy ? "bg-[#b4441f] text-white" : "bg-white text-black/40 ring-1 ring-black/10",
                )}
              >
                <span className="font-serif text-xl leading-none font-semibold">{n}</span>
                {busy && <span className="mt-0.5 text-[9px] font-semibold opacity-85">{n === 7 ? "R$ 212" : "ocupada"}</span>}
              </div>
            );
          })}
        </div>
      </div>
      <style>{`
        @keyframes slide{from{transform:translateY(-14px);opacity:0}to{transform:none;opacity:1}}
        @keyframes rise{from{transform:translateY(10px);opacity:0}to{transform:none;opacity:1}}
        @keyframes fadeout{0%,70%{opacity:1}100%{opacity:0;visibility:hidden}}
        @keyframes swing{0%,100%{transform:rotate(0)}25%{transform:rotate(14deg)}75%{transform:rotate(-12deg)}}
        .animate-ping-once{animation:pingonce .8s ease-out 2}
        @keyframes pingonce{0%{box-shadow:0 0 0 0 rgba(224,87,43,.6)}100%{box-shadow:0 0 0 12px rgba(224,87,43,0)}}
      `}</style>
    </Device>
  );
}
