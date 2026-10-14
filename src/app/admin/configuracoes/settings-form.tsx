"use client";

import { Palette } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, inputClass, PageHeader, Spinner } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { Restaurant } from "@/lib/types";

export function SettingsForm({ restaurant }: { restaurant: Restaurant }) {
  const supabase = createClient();
  const router = useRouter();
  const [name, setName] = useState(restaurant.name);
  const [fee, setFee] = useState(String(restaurant.service_fee_pct).replace(".", ","));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const pct = Number.parseFloat(fee.replace(",", "."));
    if (!Number.isFinite(pct) || pct < 0 || pct > 30) return setMessage({ ok: false, text: "Taxa de serviço deve estar entre 0% e 30%" });
    setSaving(true);
    const { error } = await supabase.from("restaurants").update({ name: name.trim(), service_fee_pct: pct }).eq("id", restaurant.id);
    setSaving(false);
    setMessage(error ? { ok: false, text: error.message } : { ok: true, text: "Configurações salvas." });
    router.refresh();
  }

  return (
    <form onSubmit={save} className="max-w-2xl space-y-6">
      <PageHeader title="Configurações" description="Informações do restaurante que aparecem para os clientes e na conta." />

      <Link
        href="/admin/marca"
        className="group flex items-center gap-4 rounded-[1.4rem] border border-line bg-surface p-4 transition hover:border-brand/40"
      >
        <span className="flex size-12 items-center justify-center rounded-2xl bg-brand text-on-brand">
          <Palette className="size-5" />
        </span>
        <span className="flex-1">
          <span className="block font-bold">Logo, cores e capa do cardápio</span>
          <span className="text-sm text-muted">Estão na página Identidade visual, com prévia ao vivo.</span>
        </span>
        <span className="text-brand-fg transition-transform group-hover:translate-x-1">→</span>
      </Link>

      <div className="space-y-5 rounded-[1.4rem] border border-line bg-surface p-5 md:p-6">
        <Field label="Nome do restaurante">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Taxa de serviço (%)" hint="Aplicada sobre a parte de cada cliente na divisão da conta. Use 0 para não cobrar.">
          <input className={inputClass} inputMode="decimal" value={fee} onChange={(e) => setFee(e.target.value)} />
        </Field>
        <Field label="Código do restaurante" hint="Usado pela equipe para entrar. Não pode ser alterado.">
          <input className={inputClass} value={restaurant.slug} disabled />
        </Field>
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" size="lg" disabled={saving}>
          {saving ? <Spinner /> : "Salvar alterações"}
        </Button>
        {message && <p className={message.ok ? "text-sm font-medium text-emerald-700" : "text-sm text-red-600 dark:text-red-400"}>{message.text}</p>}
      </div>
    </form>
  );
}
