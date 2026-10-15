"use client";

import {
  Accessibility,
  Contrast,
  Droplets,
  Hand,
  HelpCircle,
  MapPin,
  Maximize2,
  MessageSquareText,
  Mic,
  Pause,
  Play,
  Receipt,
  Send,
  SkipBack,
  SkipForward,
  Square,
  Utensils,
  Vibrate,
  Volume2,
  Wind,
  X,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, cn, inputClass, Sheet, Spinner } from "@/components/ui";
import { ACCESS_NEEDS, NEED_ICON } from "@/lib/access-needs";
import { canSpeak, speak, stopSpeaking, useDictation, type A11yPrefs, type TextSize } from "@/lib/a11y";
import { DICTS, type Dict, type Lang } from "./i18n";


export function A11yButton({ label, onClick, className }: { label: string; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn("inline-flex size-10 shrink-0 items-center justify-center rounded-full transition-colors", className)}
    >
      <Accessibility className="size-[19px]" />
    </button>
  );
}

function Toggle({
  icon: Icon,
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  icon: LucideIcon;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-3.5 rounded-2xl px-1 py-3 text-left disabled:opacity-45"
    >
      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", checked ? "bg-brand text-on-brand" : "bg-surface-2 text-ink")}>
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{label}</span>
        <span className="block text-sm leading-snug text-muted">{hint}</span>
      </span>
      <span aria-hidden className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", checked ? "bg-brand" : "bg-surface-3")}>
        <span className={cn("absolute top-1 left-1 size-5 rounded-full bg-white shadow transition-transform", checked && "translate-x-5")} />
      </span>
    </button>
  );
}

export function A11ySheet({
  open,
  onClose,
  t,
  prefs,
  update,
  needs,
  onNeeds,
  onListen,
  onMessage,
}: {
  open: boolean;
  onClose: () => void;
  t: Dict;
  prefs: A11yPrefs;
  update: (p: Partial<A11yPrefs>) => void;
  /** undefined = ainda não entrou na mesa (não há como avisar a equipe) */
  needs?: string[];
  onNeeds?: (needs: string[]) => void;
  onListen?: () => void;
  onMessage?: () => void;
}) {
  const speechOk = typeof window !== "undefined" && canSpeak();
  return (
    <Sheet open={open} onClose={onClose} title={t.a11y}>
      <p className="-mt-1 text-sm text-muted">{t.a11yIntro}</p>

      {onListen && speechOk && (
        <button
          type="button"
          onClick={onListen}
          className="mt-4 flex w-full items-center gap-3.5 rounded-2xl bg-brand p-4 text-left text-on-brand transition active:scale-[0.98]"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-black/15">
            <Volume2 className="size-6" />
          </span>
          <span>
            <span className="block font-bold">{t.listenMenu}</span>
            <span className="block text-sm opacity-85">{t.listenMenuHint}</span>
          </span>
        </button>
      )}

      {onMessage && (
        <button
          type="button"
          onClick={onMessage}
          className="mt-2.5 flex w-full items-center gap-3.5 rounded-2xl border border-line-strong p-4 text-left transition hover:bg-surface-2 active:scale-[0.98]"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-fg">
            <MessageSquareText className="size-6" />
          </span>
          <span>
            <span className="block font-bold">{t.writeMessage}</span>
            <span className="block text-sm text-muted">{t.writeHint}</span>
          </span>
        </button>
      )}

      {needs && onNeeds && (
        <fieldset className="mt-5 rounded-2xl border border-line p-4">
          <legend className="px-1 font-bold">{t.needsTitle}</legend>
          <p className="text-sm text-muted">{t.needsHint}</p>
          <div className="mt-3 grid gap-2">
            {ACCESS_NEEDS.map((n) => {
              const Icon = NEED_ICON[n];
              const on = needs.includes(n);
              return (
                <button
                  key={n}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onNeeds(on ? needs.filter((x) => x !== n) : [...needs, n])}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-sm font-semibold transition",
                    on ? "border-brand bg-brand-soft text-ink" : "border-line-strong hover:bg-surface-2",
                  )}
                >
                  <Icon className={cn("size-5 shrink-0", on ? "text-brand-fg" : "text-muted")} />
                  <span className="flex-1">{t.needs[n]}</span>
                  <span aria-hidden className={cn("size-5 rounded-md border-2", on ? "border-brand bg-brand" : "border-line-strong")} />
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <div className="mt-5">
        <div className="mb-2 flex items-center gap-2 font-bold">{t.textSize}</div>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t.textSize}>
          {([0, 1, 2] as TextSize[]).map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={prefs.size === s}
              onClick={() => update({ size: s })}
              className={cn(
                "flex h-16 flex-col items-center justify-center rounded-2xl border font-semibold transition",
                prefs.size === s ? "border-ink bg-ink text-canvas" : "border-line-strong hover:bg-surface-2",
              )}
            >
              <span aria-hidden className={cn("leading-none font-display", s === 0 ? "text-base" : s === 1 ? "text-xl" : "text-2xl")}>
                Aa
              </span>
              <span className="mt-1 text-[0.7rem]">{t.sizes[s]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 divide-y divide-line">
        <Toggle icon={Contrast} label={t.contrast} hint={t.contrastHint} checked={prefs.contrast} onChange={(v) => update({ contrast: v })} />
        <Toggle icon={Wind} label={t.calm} hint={t.calmHint} checked={prefs.calm} onChange={(v) => update({ calm: v })} />
        <Toggle icon={Volume2} label={t.speakLabel} hint={t.speakHint} checked={prefs.speak} onChange={(v) => update({ speak: v })} disabled={!speechOk} />
        <Toggle icon={Hand} label={t.libras} hint={t.librasHint} checked={prefs.libras} onChange={(v) => update({ libras: v })} />
        <Toggle icon={Vibrate} label={t.vibrateLabel} hint={t.vibrateHint} checked={prefs.vibrate} onChange={(v) => update({ vibrate: v })} />
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------- VLibras

declare global {
  interface Window {
    VLibras?: { Widget: new (url: string) => unknown };
  }
}

/**
 * Tradutor de Libras do Governo Federal (vlibras.gov.br), gratuito.
 * Só baixa o script quando o cliente liga a opção.
 */
export function VLibras({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    if (document.getElementById("vlibras-js")) return;
    const s = document.createElement("script");
    s.id = "vlibras-js";
    s.src = "https://vlibras.gov.br/app/vlibras-plugin.js";
    s.async = true;
    s.onload = () => {
      if (window.VLibras) new window.VLibras.Widget("https://vlibras.gov.br/app");
      // o widget espera o evento "load" da página, que já passou
      window.dispatchEvent(new Event("load"));
    };
    document.body.appendChild(s);
  }, [enabled]);

  if (!enabled) return null;
  return (
    // atributos exigidos pelo plugin do VLibras
    <div {...{ vw: "" }} className="enabled">
      <div {...{ "vw-access-button": "" }} className="active" />
      <div {...{ "vw-plugin-wrapper": "" }}>
        <div className="vw-plugin-top-wrapper" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- mensagem para a equipe

const PHRASES: { key: string; icon: LucideIcon }[] = [
  { key: "come", icon: Hand },
  { key: "water", icon: Droplets },
  { key: "napkins", icon: MessageSquareText },
  { key: "cutlery", icon: Utensils },
  { key: "allergy", icon: HelpCircle },
  { key: "menuHelp", icon: Volume2 },
  { key: "restroom", icon: MapPin },
  { key: "pay", icon: Receipt },
];

/**
 * Para quem não fala (ou não ouve): frases prontas ou texto livre,
 * enviados ao celular do garçom ou mostrados em letras grandes na tela.
 * Quem não enxerga pode ditar a mensagem.
 */
export function MessageSheet({
  open,
  onClose,
  t,
  lang,
  canSend,
  onSend,
}: {
  open: boolean;
  onClose: () => void;
  t: Dict;
  lang: Lang;
  canSend: boolean;
  onSend: (message: string) => Promise<boolean>;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [show, setShow] = useState<string | null>(null);
  const dictation = useDictation(lang, (said) => setText(said.slice(0, 280)));

  // Frase pronta vai em português para a equipe; o cliente vê no idioma dele.
  const forStaff = (value: string) => {
    const key = Object.keys(DICTS[lang].phrases).find((k) => DICTS[lang].phrases[k] === value);
    return key ? DICTS.pt.phrases[key] : value;
  };

  async function send() {
    const msg = text.trim();
    if (!msg) return;
    setSending(true);
    const ok = await onSend(forStaff(msg));
    setSending(false);
    if (ok) {
      setText("");
      onClose();
    }
  }

  return (
    <>
      <Sheet open={open && !show} onClose={onClose} title={t.messageTitle}>
        <div className="text-sm font-semibold text-muted" id="phrases-label">
          {t.quickPhrasesLabel}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2" role="group" aria-labelledby="phrases-label">
          {PHRASES.map(({ key, icon: Icon }) => {
            const phrase = t.phrases[key];
            const on = text === phrase;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={on}
                onClick={() => setText(phrase)}
                className={cn(
                  "flex min-h-16 items-start gap-2 rounded-2xl border p-3 text-left text-sm leading-snug font-semibold transition active:scale-[0.98]",
                  on ? "border-brand bg-brand-soft" : "border-line hover:border-line-strong",
                )}
              >
                <Icon className={cn("mt-0.5 size-4 shrink-0", on ? "text-brand-fg" : "text-muted")} />
                {phrase}
              </button>
            );
          })}
        </div>

        <label htmlFor="staff-message" className="mt-4 block font-bold">
          {t.writeMessage}
        </label>
        <div className="relative mt-2">
          <textarea
            id="staff-message"
            rows={3}
            maxLength={280}
            className={cn(inputClass, "pr-14 text-base")}
            placeholder={t.messagePlaceholder}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          {dictation.supported && (
            <button
              type="button"
              onClick={dictation.listening ? dictation.stop : dictation.start}
              aria-label={t.dictate}
              aria-pressed={dictation.listening}
              className={cn(
                "absolute top-2 right-2 flex size-10 items-center justify-center rounded-full transition",
                dictation.listening ? "bg-red-600 text-white animate-pulse-dot" : "bg-surface-2 text-ink hover:bg-surface-3",
              )}
            >
              <Mic className="size-5" />
            </button>
          )}
        </div>
        <p className="mt-1.5 min-h-5 text-xs text-muted" aria-live="polite">
          {dictation.listening ? t.listening : `${text.length}/280`}
        </p>

        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          <Button variant="secondary" size="lg" disabled={!text.trim()} onClick={() => setShow(text.trim())}>
            <Maximize2 className="size-5" /> {t.showOnScreen}
          </Button>
          {canSend && (
            <Button size="lg" disabled={!text.trim() || sending} onClick={send}>
              {sending ? (
                <Spinner />
              ) : (
                <>
                  <Send className="size-5" /> {t.sendToWaiter}
                </>
              )}
            </Button>
          )}
        </div>
      </Sheet>
      {show && <ShowCard text={show} t={t} onClose={() => setShow(null)} />}
    </>
  );
}

/** Mensagem em letras enormes, preto no branco, para mostrar ao garçom. */
function ShowCard({ text, t, onClose }: { text: string; t: Dict; onClose: () => void }) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  const size = text.length < 30 ? "text-[clamp(2.6rem,11vw,5rem)]" : text.length < 90 ? "text-[clamp(2rem,8vw,3.6rem)]" : "text-[clamp(1.5rem,6vw,2.6rem)]";
  return (
    <div role="dialog" aria-modal="true" aria-label={t.showOnScreen} className="fixed inset-0 z-[80] flex flex-col bg-white p-6 pt-[max(1.5rem,env(safe-area-inset-top))] text-black">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-neutral-600">{t.showHint}</span>
        <button ref={close} onClick={onClose} aria-label={t.close} className="flex size-12 items-center justify-center rounded-full bg-black text-white">
          <X className="size-6" />
        </button>
      </div>
      <p className={cn("my-auto font-sans leading-[1.1] font-extrabold tracking-tight break-words", size)}>{text}</p>
    </div>
  );
}

// ---------------------------------------------------------------- ouvir o cardápio

export interface ReadEntry {
  /** id do elemento destacado durante a leitura (ou null para títulos de categoria) */
  elementId: string | null;
  text: string;
  label: string;
}

/** Barra de reprodução do "Ouvir o cardápio": lê cada prato e destaca na tela. */
export function MenuReader({ entries, lang, t, onClose }: { entries: ReadEntry[]; lang: Lang; t: Dict; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const run = useRef(0);

  const highlight = useCallback((i: number) => {
    document.querySelectorAll(".reading").forEach((el) => el.classList.remove("reading"));
    const id = entries[i]?.elementId;
    const el = id ? document.getElementById(id) : null;
    if (el) {
      el.classList.add("reading");
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [entries]);

  useEffect(() => {
    if (!playing) return;
    const my = ++run.current;
    highlight(index);
    speak(entries[index]?.text ?? "", lang, 0.98).then(() => {
      if (run.current !== my) return;
      if (index + 1 < entries.length) setIndex(index + 1);
      else setPlaying(false);
    });
  }, [index, playing, entries, lang, highlight]);

  useEffect(
    () => () => {
      run.current++;
      stopSpeaking();
      document.querySelectorAll(".reading").forEach((el) => el.classList.remove("reading"));
    },
    [],
  );

  const go = (i: number) => {
    run.current++;
    stopSpeaking();
    setIndex(Math.max(0, Math.min(entries.length - 1, i)));
    setPlaying(true);
  };

  return (
    <div
      role="region"
      aria-label={t.listenMenu}
      className="fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-xl px-4 animate-slide-up"
    >
      <div className="flex items-center gap-2 rounded-[1.4rem] bg-ink p-2 pl-4 text-canvas shadow-float">
        <Volume2 className="size-5 shrink-0 opacity-80" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="text-[0.7rem] font-semibold opacity-70">
            {t.listenMenu} · {index + 1}/{entries.length}
          </div>
          <div className="truncate text-sm font-bold" aria-live="off">
            {entries[index]?.label}
          </div>
        </div>
        <button onClick={() => go(index - 1)} aria-label={t.prev} className="flex size-10 items-center justify-center rounded-full hover:bg-white/10">
          <SkipBack className="size-5" />
        </button>
        <button
          onClick={() => {
            if (playing) {
              run.current++;
              stopSpeaking();
              setPlaying(false);
            } else go(index);
          }}
          aria-label={playing ? t.pause : t.play}
          className="flex size-11 items-center justify-center rounded-full bg-canvas text-ink"
        >
          {playing ? <Pause className="size-5" /> : <Play className="size-5" />}
        </button>
        <button onClick={() => go(index + 1)} aria-label={t.next} className="flex size-10 items-center justify-center rounded-full hover:bg-white/10">
          <SkipForward className="size-5" />
        </button>
        <button onClick={onClose} aria-label={t.stop} className="flex size-10 items-center justify-center rounded-full hover:bg-white/10">
          <Square className="size-4" />
        </button>
      </div>
    </div>
  );
}
