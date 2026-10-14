"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import type { ThemeMode } from "@/lib/branding";

const KEY = "bm_theme";

/**
 * Script que roda antes da primeira pintura: aplica o tema salvo no aparelho,
 * senão o padrão da tela (`fallback`), senão o do sistema. Evita o "flash" branco.
 */
export function ThemeScript({ fallback = "auto" }: { fallback?: ThemeMode }) {
  const js = `(function(){try{var d=document.documentElement,s=localStorage.getItem("${KEY}"),f="${fallback}";var m=s==="light"||s==="dark"?s:f!=="auto"?f:matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";d.dataset.theme=m;}catch(e){}})()`;
  return <script dangerouslySetInnerHTML={{ __html: js }} />;
}

function current(): "light" | "dark" {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function setTheme(mode: "light" | "dark") {
  const root = document.documentElement;
  root.classList.add("theme-switching");
  root.dataset.theme = mode;
  try {
    localStorage.setItem(KEY, mode);
  } catch {}
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", mode === "dark" ? "#141210" : "#f7f5f3");
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("theme-switching")));
}

export function useTheme() {
  const [mode, setMode] = useState<"light" | "dark" | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(current());
    const obs = new MutationObserver(() => setMode(current()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  return [mode, (m: "light" | "dark") => setTheme(m)] as const;
}

/** Botão sol/lua. Ícone gira na troca. */
export function ThemeToggle({ className, label }: { className?: string; label?: boolean }) {
  const [mode, set] = useTheme();
  const dark = mode === "dark";
  return (
    <button
      type="button"
      onClick={() => set(dark ? "light" : "dark")}
      className={cn(
        "group inline-flex items-center gap-2 rounded-full text-sm font-medium text-muted transition-colors hover:text-ink",
        label ? "px-3 py-2 hover:bg-surface-2" : "size-10 justify-center hover:bg-surface-2",
        className,
      )}
      aria-label={dark ? "Usar tema claro" : "Usar tema escuro"}
      title={dark ? "Tema claro" : "Tema escuro"}
    >
      <span className="relative size-[18px]">
        <Sun
          className={cn(
            "absolute inset-0 size-[18px] transition-all duration-500 ease-out-expo",
            dark ? "scale-50 -rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100",
          )}
        />
        <Moon
          className={cn(
            "absolute inset-0 size-[18px] transition-all duration-500 ease-out-expo",
            dark ? "scale-100 rotate-0 opacity-100" : "scale-50 rotate-90 opacity-0",
          )}
        />
      </span>
      {label && <span>{dark ? "Tema escuro" : "Tema claro"}</span>}
    </button>
  );
}
