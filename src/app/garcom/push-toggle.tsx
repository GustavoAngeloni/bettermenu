"use client";

import { BellRing, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/components/ui";
import { savePushSubscription } from "./actions";

type Status = "unsupported" | "ios-install" | "off" | "on" | "denied" | "working";

function base64ToUint8(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Ativa alertas no aparelho mesmo com a tela bloqueada (Web Push). */
export function PushToggle() {
  const [status, setStatus] = useState<Status>("working");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const ios = /iPhone|iPad/.test(navigator.userAgent);
      const standalone = window.matchMedia("(display-mode: standalone)").matches;
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        // No iPhone, o push só funciona com o app adicionado à tela de início.
        return setStatus(ios && !standalone ? "ios-install" : "unsupported");
      }
      if (Notification.permission === "denied") return setStatus("denied");
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.getSubscription();
      if (sub) await savePushSubscription(sub.toJSON() as never);
      setStatus(sub ? "on" : "off");
    })().catch(() => setStatus("unsupported"));
  }, []);

  async function enable() {
    setStatus("working");
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setStatus(permission === "denied" ? "denied" : "off");
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ToUint8(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });
      const result = await savePushSubscription(sub.toJSON() as never);
      if (!result.ok) throw new Error(result.error);
      setStatus("on");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível ativar");
      setStatus("off");
    }
  }

  if (status === "unsupported" || status === "working") return null;

  const text: Record<Exclude<Status, "unsupported" | "working">, string> = {
    on: "Alertas com a tela bloqueada: ativados neste aparelho",
    off: "Ativar alertas com a tela bloqueada",
    denied: "Notificações bloqueadas. Libere nas configurações do navegador.",
    "ios-install": "No iPhone: toque em Compartilhar → Adicionar à Tela de Início e abra por lá para receber alertas.",
  };

  return (
    <div>
      <button
        onClick={status === "off" ? enable : undefined}
        disabled={status !== "off"}
        className={cn(
          "flex w-full items-center gap-2 rounded-xl px-4 py-2.5 text-left text-sm font-medium",
          status === "on" ? "bg-emerald-50 text-emerald-800" : status === "off" ? "bg-brand text-white" : "bg-amber-50 text-amber-900",
        )}
      >
        {status === "ios-install" ? <Smartphone className="size-4 shrink-0" /> : <BellRing className="size-4 shrink-0" />}
        {text[status]}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
