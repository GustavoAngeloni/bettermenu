import type { ThemeMode } from "@/lib/branding";
import { ThemeFallback } from "./theme";

// Scripts que rodam antes da primeira pintura (renderizados só no servidor).

const THEME_KEY = "bm_theme";
const A11Y_KEY = "bm_a11y";
const SCALE = ["100%", "115%", "130%"];

/**
 * Script que roda antes da primeira pintura: aplica o tema salvo no aparelho,
 * senão o padrão da tela (`fallback`), senão o do sistema. Evita o "flash" branco.
 */
export function ThemeScript({ fallback = "auto" }: { fallback?: ThemeMode }) {
  const js = `(function(){try{var d=document.documentElement,s=localStorage.getItem("${THEME_KEY}"),f="${fallback}";var m=s==="light"||s==="dark"?s:f!=="auto"?f:matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";d.dataset.theme=m;}catch(e){}})()`;
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: js }} />
      <ThemeFallback fallback={fallback} />
    </>
  );
}

/** Roda antes da primeira pintura, como o ThemeScript: evita o texto "pular" de tamanho. */
export function A11yScript() {
  const js = `(function(){try{var p=JSON.parse(localStorage.getItem("${A11Y_KEY}")||"{}"),d=document.documentElement,s=${JSON.stringify(SCALE)};if(p.size)d.style.fontSize=s[p.size];if(p.contrast)d.dataset.contrast="high";if(p.calm)d.dataset.motion="reduce";}catch(e){}})()`;
  return <script dangerouslySetInnerHTML={{ __html: js }} />;
}
