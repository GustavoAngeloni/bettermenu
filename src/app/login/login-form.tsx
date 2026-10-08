"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button, Field, inputClass, Spinner } from "@/components/ui";
import { login } from "./actions";

export function LoginForm() {
  const [error, action, pending] = useActionState(login, null);
  const restaurantRef = useRef<HTMLInputElement>(null);

  // Lembra o código do restaurante no aparelho (tablet da cozinha, celular do garçom).
  useEffect(() => {
    try {
      const saved = localStorage.getItem("bm_restaurant");
      if (saved && restaurantRef.current && !restaurantRef.current.value) restaurantRef.current.value = saved;
    } catch {}
  }, []);

  return (
    <form
      action={action}
      onSubmit={() => {
        try {
          localStorage.setItem("bm_restaurant", restaurantRef.current?.value ?? "");
        } catch {}
      }}
      className="space-y-4 rounded-3xl bg-white p-6 shadow-sm"
    >
      <Field label="Código do restaurante">
        <input ref={restaurantRef} name="restaurant" className={inputClass} placeholder="ex.: cantina-da-nonna" autoCapitalize="none" />
      </Field>
      <Field label="Usuário">
        <input name="username" className={inputClass} autoCapitalize="none" autoComplete="username" required />
      </Field>
      <Field label="Senha">
        <input name="password" type="password" className={inputClass} autoComplete="current-password" required />
      </Field>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? (
          <>
            <Spinner /> Entrando...
          </>
        ) : (
          "Entrar"
        )}
      </Button>
    </form>
  );
}
