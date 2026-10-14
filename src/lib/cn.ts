import { extendTailwindMerge } from "tailwind-merge";

// Ensina ao merge as cores/sombras do tema, para "text-on-brand" não ser confundido com tamanho de fonte.
const merge = extendTailwindMerge({
  extend: {
    theme: {
      color: ["brand", "brand-fg", "brand-dark", "brand-soft", "on-brand", "bm", "insight", "canvas", "surface", "surface-2", "surface-3", "ink", "muted", "line", "line-strong"],
    },
  },
});

/** Junta classes CSS ignorando valores falsos; em conflito, a última vence. Funciona no servidor e no cliente. */
export function cn(...classes: (string | false | null | undefined)[]) {
  return merge(classes.filter(Boolean).join(" "));
}
