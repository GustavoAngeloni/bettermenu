"use client";

// Alertas sonoros para garçom e cozinha.
// Navegadores só liberam áudio depois de um toque do usuário, por isso existe
// o botão "Iniciar turno", que chama unlockAudio() e mantém a tela acesa.

let ctx: AudioContext | null = null;
let wakeLock: WakeLockSentinel | null = null;

export async function unlockAudio() {
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") await ctx.resume();
  await keepScreenOn();
}

async function keepScreenOn() {
  try {
    if ("wakeLock" in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => (wakeLock = null));
    }
  } catch {
    // Sem suporte ou negado: segue sem manter a tela acesa.
  }
}

if (typeof document !== "undefined") {
  // O wake lock cai quando a aba fica oculta; pede de novo ao voltar.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && ctx) keepScreenOn();
  });
}

function tone(freq: number, start: number, duration: number, volume = 0.35) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, ctx.currentTime + start);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + duration + 0.05);
}

/** Chamado de cliente: "ding-dong" repetido, bem perceptível. */
export function playCall() {
  for (let i = 0; i < 2; i++) {
    tone(1318, i * 0.7, 0.35);
    tone(988, i * 0.7 + 0.25, 0.45);
  }
  navigator.vibrate?.([300, 150, 300, 150, 300]);
}

/** Pedido pronto / novo pedido: sinal curto. */
export function playChime() {
  tone(880, 0, 0.18, 0.3);
  tone(1175, 0.15, 0.3, 0.3);
  navigator.vibrate?.(200);
}
