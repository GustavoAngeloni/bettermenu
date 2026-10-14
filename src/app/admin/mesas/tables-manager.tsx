"use client";

import { Download, ExternalLink, Plus, Printer, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Button, cn, inputClass, Spinner } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { Sector, Table } from "@/lib/types";

type TableRow = Table & { url: string; svg: string; busy: boolean };

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function TablesManager({
  restaurantId,
  tables,
  maxTables,
  sectors,
}: {
  restaurantId: string;
  tables: TableRow[];
  maxTables: number | null;
  /** null = função de setores desligada */
  sectors: Sector[] | null;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [count, setCount] = useState("1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = tables.filter((t) => t.active);
  const inactive = tables.filter((t) => !t.active);

  async function addTables() {
    const n = Math.min(Math.max(Number.parseInt(count) || 1, 1), 100);
    if (maxTables != null && active.length + n > maxTables) {
      return setError(`Seu plano permite até ${maxTables} mesas ativas (hoje: ${active.length}). Fale com o suporte para aumentar.`);
    }
    setBusy(true);
    setError(null);
    // Reaproveita números de mesas removidas antes de criar novos.
    const reuse = inactive.slice(0, n);
    if (reuse.length) {
      const { error } = await supabase.from("tables").update({ active: true }).in("id", reuse.map((t) => t.id));
      if (error) setError(error.message);
    }
    const next = tables.reduce((max, t) => Math.max(max, t.number), 0);
    const toCreate = Array.from({ length: n - reuse.length }, (_, i) => ({ restaurant_id: restaurantId, number: next + i + 1 }));
    if (toCreate.length) {
      const { error } = await supabase.from("tables").insert(toCreate);
      if (error) setError(error.message);
    }
    setBusy(false);
    router.refresh();
  }

  async function renumber(t: TableRow) {
    const value = window.prompt("Número da mesa:", String(t.number));
    const number = Number.parseInt(value ?? "");
    if (!number || number === t.number) return;
    const { error } = await supabase.from("tables").update({ number }).eq("id", t.id);
    if (error) setError(error.code === "23505" ? `Já existe uma mesa ${number}` : error.message);
    router.refresh();
  }

  async function remove(t: TableRow) {
    if (t.busy) return setError(`A mesa ${t.number} está ocupada. Feche a conta antes de removê-la.`);
    if (!window.confirm(`Remover a mesa ${t.number}? O QR Code dela deixa de funcionar. O histórico de vendas é mantido.`)) return;
    await supabase.from("tables").update({ active: false }).eq("id", t.id);
    router.refresh();
  }

  async function restore(t: TableRow) {
    const { error } = await supabase.from("tables").update({ active: true }).eq("id", t.id);
    if (error) setError(error.message);
    router.refresh();
  }

  async function addSector() {
    const name = window.prompt("Nome do setor (ex.: Salão, Varanda, Mezanino):");
    if (!name?.trim()) return;
    await supabase.from("sectors").insert({ restaurant_id: restaurantId, name: name.trim(), sort: sectors?.length ?? 0 });
    router.refresh();
  }

  async function removeSector(s: Sector) {
    if (!window.confirm(`Remover o setor "${s.name}"? As mesas e garçons dele ficam sem setor.`)) return;
    await supabase.from("sectors").delete().eq("id", s.id);
    router.refresh();
  }

  async function setTableSector(t: TableRow, sectorId: string) {
    await supabase.from("tables").update({ sector_id: sectorId || null }).eq("id", t.id);
    router.refresh();
  }

  async function regenerate(t: TableRow) {
    if (!window.confirm(`Gerar um novo QR Code para a mesa ${t.number}? O QR antigo para de funcionar e você precisará imprimir de novo.`)) return;
    await supabase.from("tables").update({ qr_token: randomToken() }).eq("id", t.id);
    router.refresh();
  }

  function download(t: TableRow) {
    const blob = new Blob([t.svg], { type: "image/svg+xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `mesa-${t.number}-qrcode.svg`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight md:text-[2.15rem]">Mesas e QR Codes</h1>
          <p className="text-sm text-muted">
            {active.length}
            {maxTables != null && ` de ${maxTables}`} mesas ativas. Cada QR Code abre o cardápio já na mesa certa.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className={cn(inputClass, "w-20")}
            type="number"
            min={1}
            max={100}
            value={count}
            onChange={(e) => setCount(e.target.value)}
            aria-label="Quantidade de mesas"
          />
          <Button onClick={addTables} disabled={busy}>
            {busy ? <Spinner /> : <Plus className="size-4" />} Adicionar mesa{count !== "1" && "s"}
          </Button>
          <Link href="/admin/mesas/imprimir" target="_blank">
            <Button variant="secondary">
              <Printer className="size-4" /> Imprimir todos
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" onClick={() => setError(null)}>
          {error}
        </p>
      )}

      {sectors && (
        <div className="rounded-[1.4rem] border border-line bg-surface p-4">
          <div className="mb-1 font-semibold">Setores</div>
          <p className="mb-3 text-sm text-muted">Agrupe as mesas por área. Em Equipe, escolha o setor de cada garçom: ele recebe os chamados só das mesas dele.</p>
          <div className="flex flex-wrap gap-2">
            {sectors.map((s) => (
              <span key={s.id} className="flex items-center gap-1 rounded-full bg-stone-100 py-1 pr-1 pl-3 text-sm font-medium">
                {s.name} <span className="text-muted">({active.filter((t) => t.sector_id === s.id).length})</span>
                <button onClick={() => removeSector(s)} className="rounded-full p-1 text-muted hover:bg-surface hover:text-red-600 dark:hover:text-red-400" aria-label="Remover setor">
                  <Trash2 className="size-3.5" />
                </button>
              </span>
            ))}
            <button onClick={addSector} className="flex items-center gap-1 rounded-full border border-dashed border-line px-3 py-1 text-sm text-brand-fg">
              <Plus className="size-3.5" /> Setor
            </button>
          </div>
        </div>
      )}

      {active.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-line p-10 text-center text-muted">Nenhuma mesa ainda. Adicione as mesas do salão.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {active.map((t) => (
            <div key={t.id} className="rounded-[1.4rem] border border-line bg-surface p-4">
              <div className="mb-3 flex items-center justify-between">
                <button onClick={() => renumber(t)} className="text-xl font-extrabold hover:text-brand-fg" title="Alterar número">
                  Mesa {t.number}
                </button>
                {t.busy ? <Badge className="bg-brand-soft text-brand-fg">Ocupada</Badge> : <Badge className="bg-stone-100 text-muted">Livre</Badge>}
              </div>
              {sectors && sectors.length > 0 && (
                <select
                  className="mb-3 w-full rounded-lg border border-line bg-surface px-2 py-1.5 text-sm"
                  value={t.sector_id ?? ""}
                  onChange={(e) => setTableSector(t, e.target.value)}
                  aria-label="Setor"
                >
                  <option value="">Sem setor</option>
                  {sectors.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
              <div className="mx-auto w-40 [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: t.svg }} />
              <div className="mt-3 flex justify-center gap-1">
                <IconLink href={t.url} label="Abrir como cliente">
                  <ExternalLink className="size-4" />
                </IconLink>
                <IconBtn onClick={() => download(t)} label="Baixar QR Code">
                  <Download className="size-4" />
                </IconBtn>
                <IconBtn onClick={() => regenerate(t)} label="Gerar novo QR Code">
                  <RefreshCw className="size-4" />
                </IconBtn>
                <IconBtn onClick={() => remove(t)} label="Remover mesa" danger>
                  <Trash2 className="size-4" />
                </IconBtn>
              </div>
            </div>
          ))}
        </div>
      )}

      {inactive.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-muted">Mesas removidas</h2>
          <div className="flex flex-wrap gap-2">
            {inactive.map((t) => (
              <button
                key={t.id}
                onClick={() => restore(t)}
                className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-sm text-muted shadow-sm hover:text-brand-fg"
              >
                <RotateCcw className="size-3.5" /> Mesa {t.number}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function IconBtn({ children, onClick, label, danger }: { children: React.ReactNode; onClick: () => void; label: string; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn("rounded-lg p-2 text-muted hover:bg-stone-100 hover:text-ink", danger && "hover:bg-red-50 hover:text-red-600 dark:hover:text-red-400")}
    >
      {children}
    </button>
  );
}

function IconLink({ children, href, label }: { children: React.ReactNode; href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" title={label} aria-label={label} className="rounded-lg p-2 text-muted hover:bg-stone-100 hover:text-ink">
      {children}
    </a>
  );
}
