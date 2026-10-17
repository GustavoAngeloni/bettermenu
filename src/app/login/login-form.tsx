"use client";

import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { Button, Field, inputClass, Spinner } from "@/components/ui";
import { login } from "./actions";

export function LoginForm({ defaults, compact }: { defaults?: { restaurant?: string; username?: string }; compact?: boolean }) {
  const [error, action, pending] = useActionState(login, null);
  const restaurantRef = useRef<HTMLInputElement>(null);
  const [show, setShow] = useState(false);

  // Lembra o código do restaurante no aparelho (tablet da cozinha, celular do garçom).
  useEffect(() => {
    try {
      const saved = localStorage.getItem("bm_restaurant");
      if (saved && restaurantRef.current && !restaurantRef.current.value && !defaults?.restaurant) restaurantRef.current.value = saved;
    } catch {}
  }, [defaults?.restaurant]);

  return (
    <form
      action={action}
      onSubmit={() => {
        try {
          localStorage.setItem("bm_restaurant", restaurantRef.current?.value ?? "");
        } catch {}
      }}
      className={compact ? "space-y-3" : "mt-8 space-y-4"}
    >
      <Field label="Código do restaurante">
        <input ref={restaurantRef} name="restaurant" className={inputClass} placeholder="ex.: cantina-da-nonna" autoCapitalize="none" defaultValue={defaults?.restaurant} />
      </Field>
      <Field label="Usuário">
        <input name="username" className={inputClass} autoCapitalize="none" autoComplete="username" required defaultValue={defaults?.username} />
      </Field>
      <Field label="Senha">
        <span className="relative block">
          <input name="password" type={show ? "text" : "password"} className={`${inputClass} pr-11`} autoComplete="current-password" required />
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted hover:text-ink"
            aria-label={show ? "Ocultar senha" : "Mostrar senha"}
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </span>
      </Field>
      {error && <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700 animate-fade-in">{error}</p>}
      <Button type="submit" size="lg" className="group w-full" disabled={pending}>
        {pending ? (
          <>
            <Spinner /> Entrando...
          </>
        ) : (
          <>
            Entrar <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </>
        )}
      </Button>
      {!compact && <p className="pt-2 text-center text-xs text-muted">Super admin: use seu email no campo usuário.</p>}
    </form>
  );
}
