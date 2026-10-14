import type { CSSProperties } from "react";

/**
 * Identidade visual de cada restaurante (white-label).
 * Guardada em `restaurants.branding` (jsonb). Tudo é opcional: sem configuração,
 * o restaurante usa a cor e a tipografia padrão do Better Menu.
 */
export type ThemeMode = "auto" | "light" | "dark";
export type FontStyle = "classico" | "moderno" | "elegante" | "minimal";

export interface Branding {
  /** cor principal em hex (#rrggbb) */
  primary?: string;
  /** foto de capa do cardápio */
  cover_url?: string | null;
  /** frase curta abaixo do nome no cardápio */
  tagline?: string | null;
  font?: FontStyle;
  /** tema inicial do cardápio do cliente; o cliente ainda pode trocar */
  theme?: ThemeMode;
}

/** Laranja-brasa do Better Menu. */
export const BM_ORANGE = "#e0572b";

export const COLOR_PRESETS: { name: string; hex: string }[] = [
  { name: "Brasa", hex: "#e0572b" },
  { name: "Tomate", hex: "#d62f2f" },
  { name: "Vinho", hex: "#8c1d40" },
  { name: "Berinjela", hex: "#5b2a86" },
  { name: "Mar", hex: "#0f6e8c" },
  { name: "Manjericão", hex: "#2f7d4f" },
  { name: "Oliva", hex: "#6b7a2a" },
  { name: "Mostarda", hex: "#d49a12" },
  { name: "Café", hex: "#6f4a32" },
  { name: "Grafite", hex: "#2b2f36" },
];

export const FONT_STYLES: Record<FontStyle, { label: string; hint: string; variable: string }> = {
  classico: { label: "Clássico", hint: "Serifa acolhedora, para cozinha de raiz e bistrôs", variable: "var(--font-fraunces)" },
  moderno: { label: "Moderno", hint: "Expressivo, para hamburguerias, bares e cafés", variable: "var(--font-bricolage)" },
  elegante: { label: "Elegante", hint: "Refinado, para alta gastronomia e vinhos", variable: "var(--font-instrument)" },
  minimal: { label: "Minimalista", hint: "Limpo e direto, para conceitos contemporâneos", variable: "var(--font-sans)" },
};

const HEX = /^#[0-9a-f]{6}$/i;

export function resolveBranding(raw: unknown): Required<Omit<Branding, "cover_url" | "tagline">> & Pick<Branding, "cover_url" | "tagline"> {
  const b = (raw && typeof raw === "object" ? raw : {}) as Branding;
  return {
    primary: b.primary && HEX.test(b.primary) ? b.primary.toLowerCase() : BM_ORANGE,
    cover_url: b.cover_url || null,
    tagline: b.tagline?.trim() || null,
    font: b.font && b.font in FONT_STYLES ? b.font : "classico",
    theme: b.theme === "light" || b.theme === "dark" ? b.theme : "auto",
  };
}

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Texto legível sobre a cor da marca: branco ou quase-preto, o que tiver mais contraste. */
export function onBrand(hex: string) {
  const l = luminance(hex);
  const vsWhite = 1.05 / (l + 0.05);
  const vsInk = (l + 0.05) / 0.06;
  return vsWhite >= vsInk || vsWhite >= 4 ? "#ffffff" : "#16130f";
}

/** Variáveis CSS que aplicam a marca do restaurante em tudo que está dentro do elemento. */
export function brandStyle(raw: unknown): CSSProperties {
  const b = resolveBranding(raw);
  return {
    "--brand": b.primary,
    "--on-brand": onBrand(b.primary),
    "--brand-font": FONT_STYLES[b.font].variable,
  } as CSSProperties;
}
