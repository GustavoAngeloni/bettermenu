"use client";

import { ImagePlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, inputClass, Spinner } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { Restaurant } from "@/lib/types";

export function SettingsForm({ restaurant }: { restaurant: Restaurant }) {
  const supabase = createClient();
  const router = useRouter();
  const [name, setName] = useState(restaurant.name);
  const [fee, setFee] = useState(String(restaurant.service_fee_pct).replace(".", ","));
  const [logoUrl, setLogoUrl] = useState(restaurant.logo_url);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function uploadLogo(file: File) {
    const path = `${restaurant.id}/logo-${crypto.randomUUID()}.${file.name.split(".").pop() || "png"}`;
    const { error } = await supabase.storage.from("menu").upload(path, file, { contentType: file.type });
    if (error) return setMessage(`Erro ao enviar logo: ${error.message}`);
    setLogoUrl(supabase.storage.from("menu").getPublicUrl(path).data.publicUrl);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const pct = Number.parseFloat(fee.replace(",", "."));
    if (!Number.isFinite(pct) || pct < 0 || pct > 30) return setMessage("Taxa de serviço deve estar entre 0% e 30%");
    setSaving(true);
    const { error } = await supabase
      .from("restaurants")
      .update({ name: name.trim(), service_fee_pct: pct, logo_url: logoUrl })
      .eq("id", restaurant.id);
    setSaving(false);
    setMessage(error ? error.message : "Configurações salvas.");
    router.refresh();
  }

  return (
    <form onSubmit={save} className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted">Informações que aparecem para os clientes.</p>
      </div>

      <div className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <label className="relative flex size-20 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-line text-muted hover:border-brand">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="absolute inset-0 size-full object-cover" />
            ) : (
              <ImagePlus className="size-6" />
            )}
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
          </label>
          <div className="text-sm text-muted">Logo do restaurante (quadrada)</div>
        </div>
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

      {message && <p className="text-sm text-sky-800">{message}</p>}
      <Button type="submit" disabled={saving}>
        {saving ? <Spinner /> : "Salvar"}
      </Button>
    </form>
  );
}
