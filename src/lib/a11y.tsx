"use client";

// Acessibilidade do cardápio do cliente: preferências salvas no aparelho,
// leitura em voz alta (Web Speech), ditado por voz e avisos por vibração.

import { useCallback, useEffect, useRef, useState } from "react";

export type TextSize = 0 | 1 | 2;

export interface A11yPrefs {
  /** 0 = normal, 1 = grande (115%), 2 = muito grande (130%) */
  size: TextSize;
  /** alto contraste: texto mais escuro, linhas mais fortes, foco bem visível */
  contrast: boolean;
  /** sem animações nem movimentos de tela */
  calm: boolean;
  /** narra o que acontece (item adicionado, pedido pronto...) mesmo sem leitor de tela */
  speak: boolean;
  /** tradutor de Libras do governo (VLibras) */
  libras: boolean;
  /** vibra quando o pedido fica pronto ou o garçom atende */
  vibrate: boolean;
}

export const DEFAULT_PREFS: A11yPrefs = { size: 0, contrast: false, calm: false, speak: false, libras: false, vibrate: true };
const KEY = "bm_a11y";
const SCALE = ["100%", "115%", "130%"];

export function readPrefs(): A11yPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_PREFS;
}

/** Aplica as preferências no <html>. O tamanho do texto escala tudo (o layout usa rem). */
export function applyPrefs(p: A11yPrefs) {
  const d = document.documentElement;
  d.style.fontSize = p.size ? SCALE[p.size] : "";
  if (p.contrast) d.dataset.contrast = "high";
  else delete d.dataset.contrast;
  if (p.calm) d.dataset.motion = "reduce";
  else delete d.dataset.motion;
}


export function useA11yPrefs() {
  const [prefs, setPrefs] = useState<A11yPrefs>(DEFAULT_PREFS);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrefs(readPrefs());
  }, []);
  const update = useCallback((patch: Partial<A11yPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {}
      applyPrefs(next);
      return next;
    });
  }, []);
  return [prefs, update] as const;
}

export const prefersCalm = () =>
  typeof window !== "undefined" &&
  (document.documentElement.dataset.motion === "reduce" || window.matchMedia("(prefers-reduced-motion: reduce)").matches);

// ---------------------------------------------------------------- voz

const VOICE_LANG = { pt: "pt-BR", en: "en-US", es: "es-ES" } as const;
export type SpeechLang = keyof typeof VOICE_LANG;

export const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window;

function pickVoice(lang: SpeechLang) {
  const voices = window.speechSynthesis.getVoices();
  const tag = VOICE_LANG[lang];
  return voices.find((v) => v.lang === tag && v.localService) ?? voices.find((v) => v.lang === tag) ?? voices.find((v) => v.lang.startsWith(lang));
}

/** Fala um texto (interrompe o que estiver sendo falado). Resolve quando termina. */
export function speak(text: string, lang: SpeechLang = "pt", rate = 1): Promise<void> {
  if (!canSpeak() || !text) return Promise.resolve();
  const synth = window.speechSynthesis;
  synth.cancel();
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = VOICE_LANG[lang];
    const voice = pickVoice(lang);
    if (voice) u.voice = voice;
    u.rate = rate;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    synth.speak(u);
  });
}

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel();
}

/** Preço falado por extenso ("trinta e dois reais e cinquenta centavos" fica a cargo da voz). */
export function spokenPrice(cents: number, lang: SpeechLang) {
  const reais = Math.floor(cents / 100);
  const cent = cents % 100;
  if (lang === "en") return cent ? `${reais} reais and ${cent} cents` : `${reais} reais`;
  if (lang === "es") return cent ? `${reais} reales con ${cent} centavos` : `${reais} reales`;
  return cent ? `${reais} reais e ${cent} centavos` : `${reais} reais`;
}

export function vibrate(pattern: number | number[]) {
  try {
    if (readPrefs().vibrate) navigator.vibrate?.(pattern);
  } catch {}
}

// ---------------------------------------------------------------- ditado

interface RecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

function recognitionCtor(): (new () => RecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => RecognitionLike; webkitSpeechRecognition?: new () => RecognitionLike };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Ditado por voz: o texto reconhecido chega em `onText` (parcial e final). */
export function useDictation(lang: SpeechLang, onText: (text: string, final: boolean) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const rec = useRef<RecognitionLike | null>(null);
  const cb = useRef(onText);
  useEffect(() => {
    cb.current = onText;
  });
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(!!recognitionCtor());
    return () => rec.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    stopSpeaking();
    const r = new Ctor();
    r.lang = VOICE_LANG[lang];
    r.interimResults = true;
    r.continuous = false;
    r.onresult = (e) => {
      let text = "";
      let final = false;
      for (let i = 0; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
        final = e.results[i].isFinal;
      }
      cb.current(text, final);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    rec.current = r;
    setListening(true);
    r.start();
  }, [lang]);

  const stop = useCallback(() => rec.current?.stop(), []);
  return { supported, listening, start, stop };
}
