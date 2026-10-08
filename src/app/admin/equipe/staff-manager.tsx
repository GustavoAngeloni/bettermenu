"use client";

import { KeyRound, UserPlus } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { Badge, Button, cn, Field, inputClass, Spinner } from "@/components/ui";
import { ROLE_LABEL, type Profile, type Sector, type StaffRole } from "@/lib/types";
import { createStaff, resetPassword, setActive, setSector } from "./actions";

export function StaffManager({ staff, me, slug, sectors }: { staff: Profile[]; me: Profile; slug: string; sectors: Sector[] }) {
  const [result, action, pending] = useActionState(createStaff, null);
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (result === "ok") formRef.current?.reset();
  }, [result]);

  const roles: StaffRole[] = me.role === "owner" ? ["waiter", "kitchen", "manager", "owner"] : ["waiter", "kitchen", "manager"];

  async function changePassword(p: Profile) {
    const password = window.prompt(`Nova senha para ${p.name} (mínimo 6 caracteres):`);
    if (!password) return;
    setMessage((await resetPassword(p.id, password)) ?? `Senha de ${p.name} alterada.`);
  }

  async function toggle(p: Profile) {
    if (p.active && !window.confirm(`Desativar ${p.name}? Essa pessoa não conseguirá mais entrar.`)) return;
    const error = await setActive(p.id, !p.active);
    if (error) setMessage(error);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Equipe</h1>
        <p className="text-sm text-muted">
          Cada pessoa entra em <strong>/login</strong> com o código <code className="rounded bg-stone-100 px-1.5 py-0.5">{slug}</code>, o usuário e a senha.
        </p>
      </div>

      {message && (
        <p className="rounded-xl bg-sky-50 p-3 text-sm text-sky-800" onClick={() => setMessage(null)}>
          {message}
        </p>
      )}

      <form ref={formRef} action={action} className="grid gap-3 rounded-2xl bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
        <Field label="Nome">
          <input name="name" className={inputClass} placeholder="João Silva" required />
        </Field>
        <Field label="Usuário">
          <input name="username" className={inputClass} placeholder="joao" autoCapitalize="none" required />
        </Field>
        <Field label="Senha">
          <input name="password" className={inputClass} placeholder="mín. 6 caracteres" required minLength={6} />
        </Field>
        <Field label="Função">
          <select name="role" className={inputClass} defaultValue="waiter">
            {roles.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </Field>
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner /> : <UserPlus className="size-4" />} Adicionar
        </Button>
        {result && result !== "ok" && <p className="text-sm text-red-600 sm:col-span-2 lg:col-span-5">{result}</p>}
      </form>

      <div className="divide-y divide-line overflow-hidden rounded-2xl bg-white shadow-sm">
        {staff.map((p) => (
          <div key={p.id} className={cn("flex flex-wrap items-center gap-3 px-4 py-3", !p.active && "opacity-50")}>
            <div className="flex size-10 items-center justify-center rounded-full bg-stone-100 font-bold text-muted">{p.name.charAt(0)}</div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold">
                {p.name} {p.id === me.id && <span className="text-muted">(você)</span>}
              </div>
              <div className="text-sm text-muted">usuário: {p.username}</div>
            </div>
            {sectors.length > 0 && p.role === "waiter" && (
              <select
                className="rounded-lg border border-line bg-white px-2 py-1 text-sm"
                value={p.sector_id ?? ""}
                onChange={async (e) => {
                  const error = await setSector(p.id, e.target.value || null);
                  if (error) setMessage(error);
                }}
                aria-label="Setor"
              >
                <option value="">Todos os setores</option>
                {sectors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
            <Badge className="bg-brand-soft text-brand">{p.role ? ROLE_LABEL[p.role] : "—"}</Badge>
            {(me.role === "owner" || p.role !== "owner") && (
              <>
                <Button size="sm" variant="ghost" onClick={() => changePassword(p)}>
                  <KeyRound className="size-4" /> Senha
                </Button>
                {p.id !== me.id && (
                  <Button size="sm" variant="secondary" onClick={() => toggle(p)}>
                    {p.active ? "Desativar" : "Reativar"}
                  </Button>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
