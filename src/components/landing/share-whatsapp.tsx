"use client";

import { Share2 } from "lucide-react";
import { SITE } from "@/lib/site";

/** Indicação: o dono manda para outro restaurante pelo WhatsApp (ou pelo compartilhar do celular). */
export function ShareWhatsApp({ className }: { className?: string }) {
  const text = `Olha que incrível esse cardápio digital: o cliente pede pelo celular, a cozinha recebe na hora e a conta se divide sozinha. Dá pra testar aqui: ${SITE.url}/demo`;
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        if (navigator.share) {
          try {
            await navigator.share({ title: "Better Menu", text, url: `${SITE.url}/demo` });
            return;
          } catch {}
        }
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
      }}
    >
      <Share2 className="size-4" aria-hidden /> Indicar para um restaurante
    </button>
  );
}
