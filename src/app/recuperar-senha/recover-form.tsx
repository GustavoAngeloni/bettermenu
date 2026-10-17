"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { Button, Field, inputClass, Spinner } from "@/components/ui";
import { requestPasswordReset } from "./actions";

export function RecoverForm({ defaults }: { defaults: { codigo: string; usuario: string } }) {
  const [state, action, pending] = useActionState(requestPasswordReset, null);
  if (state === "ok")
    return (
      <div className="space-y-4">
        <p className="flex gap-3 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">
          <MailCheck className="size-5 shrink-0" />
          Se encontrarmos a sua conta, o link chega em instantes no e-mail cadastrado. Ele vale por 1 hora. Confira também a caixa de spam.
        </p>
        <p className="text-sm text-muted">Garçons e cozinha sem e-mail cadastrado: o dono gera uma nova senha em Equipe, no painel.</p>
        <Link href="/login" className="inline-block text-sm font-semibold text-brand-fg">
          ← Voltar para o login
        </Link>
      </div>
    );
  return (
    <form action={action} className="space-y-4">
      <Field label="Código do restaurante" hint="Deixe vazio para buscar só pelo e-mail.">
        <input name="codigo" className={inputClass} defaultValue={defaults.codigo} placeholder="ex.: cantina-da-nonna" autoCapitalize="none" />
      </Field>
      <Field label="Usuário ou e-mail">
        <input name="usuario" className={inputClass} defaultValue={defaults.usuario} autoCapitalize="none" autoComplete="username" required />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Spinner /> : "Enviar link"}
      </Button>
      <Link href="/login" className="block text-center text-sm font-semibold text-muted hover:text-ink">
        Lembrei a senha
      </Link>
    </form>
  );
}
