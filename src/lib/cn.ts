/** Junta classes CSS ignorando valores falsos. Funciona no servidor e no cliente. */
export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
