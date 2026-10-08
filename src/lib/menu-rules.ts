// Regras de cardápio usadas no servidor (validação do pedido) e no cliente (exibição).
import { TIMEZONE } from "./time";
import type { Category, MenuItem } from "./types";

const fmt = new Intl.DateTimeFormat("en-US", { timeZone: TIMEZONE, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Dia da semana (0=domingo) e minutos desde meia-noite, no fuso do restaurante. */
export function localNow(date = new Date()) {
  const parts = fmt.formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return { dow: WEEKDAYS.indexOf(get("weekday")), minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
};

/** Janela de dias/horário. Suporta virar a meia-noite (ex.: 18:00 → 02:00). */
export function inWindow(days: number[] | null | undefined, start: string | null | undefined, end: string | null | undefined, now = localNow()) {
  if (days && days.length > 0 && !days.includes(now.dow)) {
    // Janela que passa da meia-noite pertence ao dia em que começou.
    if (!(start && end && toMinutes(end) < toMinutes(start) && now.minutes < toMinutes(end) && days.includes((now.dow + 6) % 7))) {
      return false;
    }
  }
  if (!start || !end) return true;
  const s = toMinutes(start);
  const e = toMinutes(end);
  return s <= e ? now.minutes >= s && now.minutes < e : now.minutes >= s || now.minutes < e;
}

export function isCategoryOpen(c: Pick<Category, "days" | "start_time" | "end_time">, enabled: boolean, now = localNow()) {
  return !enabled || inWindow(c.days, c.start_time, c.end_time, now);
}

/** Preço vigente: happy hour se estiver no horário da promoção. */
export function effectivePrice(
  item: Pick<MenuItem, "price_cents" | "promo_price_cents" | "promo_days" | "promo_start" | "promo_end">,
  enabled: boolean,
  now = localNow(),
): { price: number; promo: boolean } {
  if (enabled && item.promo_price_cents != null && item.promo_start && item.promo_end && inWindow(item.promo_days, item.promo_start, item.promo_end, now)) {
    return { price: item.promo_price_cents, promo: true };
  }
  return { price: item.price_cents, promo: false };
}

export const DAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function describeWindow(days: number[] | null, start: string | null, end: string | null) {
  const d = days && days.length && days.length < 7 ? days.map((x) => DAY_SHORT[x]).join(", ") : "Todos os dias";
  const h = start && end ? `${start.slice(0, 5)}–${end.slice(0, 5)}` : "o dia todo";
  return `${d} · ${h}`;
}
