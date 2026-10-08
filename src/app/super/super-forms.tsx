"use client";

import { LogIn } from "lucide-react";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { FeatureChecklist } from "@/components/feature-checklist";
import { Button, Field, inputClass, Spinner } from "@/components/ui";
import type { Features } from "@/lib/features";
import { PLANS, type PlanKey } from "@/lib/plans";
import type { Restaurant } from "@/lib/types";
import { createRestaurant, enterAs, setRestaurantActive, updateRestaurant } from "./actions";

function PlanFields({ plan: initialPlan = "profissional", maxTables, paidUntil }: { plan?: string; maxTables?: number | null; paidUntil?: string | null }) {
  const [plan, setPlan] = useState<PlanKey>((initialPlan in PLANS ? initialPlan : "profissional") as PlanKey);
  const [max, setMax] = useState<string>(maxTables === undefined ? String(PLANS[plan].maxTables ?? "") : String(maxTables ?? ""));
  return (
    <>
      <Field label="Plano">
        <select
          name="plan"
          className={inputClass}
          value={plan}
          onChange={(e) => {
            const p = e.target.value as PlanKey;
            setPlan(p);
            setMax(String(PLANS[p].maxTables ?? ""));
          }}
        >
          {(Object.keys(PLANS) as PlanKey[]).map((p) => (
            <option key={p} value={p}>
              {PLANS[p].label} · R$ {(PLANS[p].priceCents / 100).toFixed(0)}/mês
            </option>
          ))}
        </select>
      </Field>
      <Field label="Limite de mesas" hint="Vazio = ilimitado">
        <input name="max_tables" type="number" min={1} className={inputClass} value={max} onChange={(e) => setMax(e.target.value)} />
      </Field>
      <Field label="Pago até">
        <input name="paid_until" type="date" className={inputClass} defaultValue={paidUntil ?? ""} />
      </Field>
    </>
  );
}

export function CreateRestaurantForm() {
  const [result, action, pending] = useActionState(createRestaurant, null);
  const formRef = useRef<HTMLFormElement>(null);
  const created = result?.startsWith("ok:") ? result.slice(3) : null;
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (created) {
      formRef.current?.reset();
      // Remonta os campos controlados (plano, checks) com os valores padrão.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormKey((k) => k + 1);
    }
  }, [created]);

  return (
    <form ref={formRef} action={action} className="space-y-5 rounded-2xl bg-white p-5 shadow-sm" key={formKey}>
      <div className="grid gap-4 md:grid-cols-4">
        <Field label="Nome do restaurante">
          <input name="name" className={inputClass} placeholder="Cantina da Nonna" required />
        </Field>
        <Field label="Código (login da equipe)" hint="Vazio = gerado do nome">
          <input name="slug" className={inputClass} placeholder="cantina-da-nonna" autoCapitalize="none" />
        </Field>
        <Field label="Taxa de serviço (%)">
          <input name="fee" className={inputClass} defaultValue="10" inputMode="decimal" />
        </Field>
        <Field label="Quantidade de mesas">
          <input name="tables" type="number" min={0} max={200} className={inputClass} defaultValue="10" />
        </Field>
      </div>

      <div className="grid gap-4 border-t border-line pt-4 md:grid-cols-3">
        <PlanFields />
      </div>

      <div className="grid gap-4 border-t border-line pt-4 md:grid-cols-3">
        <Field label="Nome do dono">
          <input name="ownerName" className={inputClass} required />
        </Field>
        <Field label="Usuário do dono">
          <input name="ownerUsername" className={inputClass} defaultValue="dono" autoCapitalize="none" required />
        </Field>
        <Field label="Senha inicial">
          <input name="ownerPassword" className={inputClass} minLength={6} required />
        </Field>
      </div>

      <div className="border-t border-line pt-4">
        <div className="mb-1 font-semibold">Funções do restaurante</div>
        <p className="mb-3 text-sm text-muted">Desmarque o que o dono não quer usar. Dá para mudar depois.</p>
        <FeatureChecklist />
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner /> : "Criar restaurante"}
        </Button>
        {created && (
          <p className="text-sm text-emerald-700">
            Restaurante criado! O dono entra em <strong>/login</strong> com o código <strong>{created}</strong>.
          </p>
        )}
        {result && !created && <p className="text-sm text-red-600">{result}</p>}
      </div>
    </form>
  );
}

export function EditRestaurantForm({ restaurant, features }: { restaurant: Restaurant; features: Features }) {
  const [result, action, pending] = useActionState(updateRestaurant.bind(null, restaurant.id), null);
  return (
    <form action={action} className="space-y-5 rounded-2xl bg-white p-5 shadow-sm">
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Nome do restaurante">
          <input name="name" className={inputClass} defaultValue={restaurant.name} required />
        </Field>
        <Field label="Código (login da equipe)" hint="Não pode ser alterado">
          <input className={inputClass} value={restaurant.slug} disabled />
        </Field>
        <Field label="Taxa de serviço (%)">
          <input name="fee" className={inputClass} defaultValue={String(restaurant.service_fee_pct).replace(".", ",")} inputMode="decimal" />
        </Field>
        <PlanFields plan={restaurant.plan} maxTables={restaurant.max_tables} paidUntil={restaurant.paid_until} />
      </div>
      <Field label="Anotações internas" hint="Só você vê (contato, condições comerciais...)">
        <textarea name="notes" rows={2} className={inputClass} defaultValue={restaurant.notes ?? ""} />
      </Field>
      <div className="border-t border-line pt-4">
        <div className="mb-3 font-semibold">Funções do restaurante</div>
        <FeatureChecklist initial={features} />
      </div>
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner /> : "Salvar alterações"}
        </Button>
        {result === "ok" && <p className="text-sm text-emerald-700">Salvo. As telas do restaurante já refletem as mudanças.</p>}
        {result && result !== "ok" && <p className="text-sm text-red-600">{result}</p>}
      </div>
    </form>
  );
}

export function ToggleActive({ id, active }: { id: string; active: boolean }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="secondary"
      disabled={pending}
      onClick={() => {
        if (active && !window.confirm("Desativar este restaurante? Clientes e equipe perdem o acesso.")) return;
        start(() => setRestaurantActive(id, !active));
      }}
    >
      {active ? "Desativar" : "Reativar"}
    </Button>
  );
}

export function EnterAsButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <Button size="sm" disabled={pending} onClick={() => start(() => enterAs(id))}>
      {pending ? <Spinner /> : <LogIn className="size-4" />} Entrar como dono
    </Button>
  );
}
