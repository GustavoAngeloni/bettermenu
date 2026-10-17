"use client";

import { useActionState } from "react";
import { Button, Field, inputClass, Spinner } from "@/components/ui";
import { setNewPassword } from "./actions";

export function NewPasswordForm({ token, submitLabel }: { token: string; submitLabel: string }) {
  const [error, action, pending] = useActionState(setNewPassword, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <Field label="Nova senha" hint="Mínimo de 6 caracteres.">
        <input name="password" type="password" className={inputClass} autoComplete="new-password" minLength={6} required />
      </Field>
      <Field label="Repita a senha">
        <input name="confirm" type="password" className={inputClass} autoComplete="new-password" minLength={6} required />
      </Field>
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Spinner /> : submitLabel}
      </Button>
    </form>
  );
}
