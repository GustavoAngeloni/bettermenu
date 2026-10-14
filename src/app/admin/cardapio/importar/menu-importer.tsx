"use client";

import { Camera, Download, FileSpreadsheet, Sparkles, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, cn, inputClass, Spinner } from "@/components/ui";
import type { ImportedMenu } from "@/lib/menu-import";
import { readMenuPhotos, saveImportedMenu } from "./actions";

type Row = { key: string; category: string; name: string; description: string; price: string };

const toRows = (menu: ImportedMenu): Row[] =>
  menu.categories.flatMap((c) =>
    c.items.map((i) => ({
      key: crypto.randomUUID(),
      category: c.name,
      name: i.name,
      description: i.description ?? "",
      price: i.price == null ? "" : i.price.toFixed(2).replace(".", ","),
    })),
  );

const toMenu = (rows: Row[]): ImportedMenu => {
  const cats = new Map<string, ImportedMenu["categories"][number]>();
  for (const r of rows) {
    const name = r.category.trim() || "Sem categoria";
    const cat = cats.get(name) ?? { name, items: [] };
    const price = Number.parseFloat(r.price.replace(/[^\d,.-]/g, "").replace(",", "."));
    cat.items.push({ name: r.name, description: r.description || null, price: Number.isFinite(price) ? price : null });
    cats.set(name, cat);
  }
  return { categories: [...cats.values()] };
};

/** Reduz a foto no navegador (lado maior 1600px, JPEG) para caber no envio e ler bem. */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.82));
}

/** CSV simples: categoria;nome;descrição;preço (aceita ; ou , como separador e cabeçalho opcional). */
function parseCsv(text: string): Row[] {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const sep = (lines[0].match(/;/g)?.length ?? 0) >= (lines[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const split = (line: string) => {
    const out: string[] = [];
    let cur = "";
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (quoted && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else quoted = !quoted;
      } else if (ch === sep && !quoted) {
        out.push(cur);
        cur = "";
      } else cur += ch;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const rows = lines.map(split);
  const hasHeader = /categoria|nome|pre[cç]o/i.test(rows[0].join(" "));
  return (hasHeader ? rows.slice(1) : rows)
    .filter((r) => r[1])
    .map((r) => ({ key: crypto.randomUUID(), category: r[0] ?? "", name: r[1] ?? "", description: r[2] ?? "", price: r[3] ?? "" }));
}

const TEMPLATE = "﻿categoria;nome;descricao;preco\r\nEntradas;Bolinho de bacalhau;6 unidades;32,90\r\nBebidas;Suco de laranja;500ml;12,00\r\n";

export function MenuImporter({ aiEnabled }: { aiEnabled: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"photo" | "csv">(aiEnabled ? "photo" : "csv");
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function readPhotos(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    setDone(null);
    setBusy("Lendo o cardápio... pode levar até 1 minuto.");
    const form = new FormData();
    for (const f of [...files].slice(0, 6)) form.append("photos", await shrink(f), "foto.jpg");
    const result = await readMenuPhotos(form);
    setBusy(null);
    if (!result.ok) return setError(result.error);
    setRows([...rows, ...toRows(result.data)]);
  }

  async function readCsv(file: File | undefined) {
    if (!file) return;
    setError(null);
    setDone(null);
    const parsed = parseCsv(await file.text());
    if (!parsed.length) return setError("Não encontrei pratos na planilha. Confira o modelo.");
    setRows([...rows, ...parsed]);
  }

  async function save() {
    setBusy("Salvando...");
    const result = await saveImportedMenu(toMenu(rows.filter((r) => r.name.trim())));
    setBusy(null);
    if (!result.ok) return setError(result.error);
    setRows([]);
    setDone(`Pronto! ${result.data.items} pratos adicionados${result.data.categories ? ` em ${result.data.categories} categoria(s) nova(s)` : ""}. Confira fotos e detalhes no Cardápio.`);
    router.refresh();
  }

  const update = (key: string, field: keyof Row, value: string) => setRows(rows.map((r) => (r.key === key ? { ...r, [field]: value } : r)));

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <ModeCard
          active={mode === "photo"}
          disabled={!aiEnabled}
          onClick={() => setMode("photo")}
          icon={<Camera className="size-6" />}
          title="Foto do cardápio"
          text={aiEnabled ? "Tire fotos do cardápio impresso. A IA lê pratos, descrições e preços." : "Indisponível: falta configurar a chave da IA."}
        />
        <ModeCard
          active={mode === "csv"}
          onClick={() => setMode("csv")}
          icon={<FileSpreadsheet className="size-6" />}
          title="Planilha (Excel/CSV)"
          text="Preencha o modelo no Excel e salve como CSV."
        />
      </div>

      {mode === "photo" ? (
        <label className={cn("flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line bg-surface p-8 text-center hover:border-brand", busy && "pointer-events-none opacity-60")}>
          <Sparkles className="size-8 text-brand-fg" />
          <span className="font-semibold">Escolher fotos (até 6)</span>
          <span className="text-sm text-muted">Fotos nítidas, de frente e bem iluminadas funcionam melhor.</span>
          <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => readPhotos(e.target.files)} />
        </label>
      ) : (
        <div className="flex flex-wrap items-center gap-3 rounded-[1.4rem] border border-line bg-surface p-5">
          <a
            href={`data:text/csv;charset=utf-8,${encodeURIComponent(TEMPLATE)}`}
            download="modelo-cardapio.csv"
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-line px-4 text-sm font-semibold hover:bg-surface-2"
          >
            <Download className="size-4" /> Baixar modelo
          </a>
          <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-on-brand">
            <FileSpreadsheet className="size-4" /> Enviar planilha CSV
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => readCsv(e.target.files?.[0])} />
          </label>
          <p className="w-full text-xs text-muted">Colunas: categoria; nome; descrição; preço. No Excel: Arquivo → Salvar como → CSV.</p>
        </div>
      )}

      {busy && (
        <p className="flex items-center gap-2 text-sm font-medium text-brand-fg">
          <Spinner className="size-4" /> {busy}
        </p>
      )}
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {done && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{done}</p>}

      {rows.length > 0 && (
        <section className="rounded-[1.4rem] border border-line bg-surface p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-bold">Revise antes de salvar ({rows.length} pratos)</h2>
              <p className="text-xs text-muted">Corrija o que precisar. Categorias com o mesmo nome de uma já existente são reaproveitadas.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setRows([])}>
                Descartar
              </Button>
              <Button onClick={save} disabled={!!busy}>
                Adicionar ao cardápio
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th className="pb-2 font-medium">Categoria</th>
                  <th className="pb-2 font-medium">Prato</th>
                  <th className="pb-2 font-medium">Descrição</th>
                  <th className="pb-2 font-medium">Preço</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key} className="align-top">
                    <td className="pr-2 pb-2">
                      <input className={cn(inputClass, "min-w-32 py-1.5")} value={r.category} onChange={(e) => update(r.key, "category", e.target.value)} />
                    </td>
                    <td className="pr-2 pb-2">
                      <input className={cn(inputClass, "min-w-40 py-1.5")} value={r.name} onChange={(e) => update(r.key, "name", e.target.value)} />
                    </td>
                    <td className="pr-2 pb-2">
                      <input className={cn(inputClass, "min-w-56 py-1.5")} value={r.description} onChange={(e) => update(r.key, "description", e.target.value)} />
                    </td>
                    <td className="pr-2 pb-2">
                      <input
                        className={cn(inputClass, "w-24 py-1.5", !r.price && "border-amber-400")}
                        value={r.price}
                        inputMode="decimal"
                        onChange={(e) => update(r.key, "price", e.target.value)}
                      />
                    </td>
                    <td className="pb-2">
                      <button className="p-2 text-muted hover:text-red-600 dark:hover:text-red-400" onClick={() => setRows(rows.filter((x) => x.key !== r.key))} aria-label="Remover">
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function ModeCard({
  active,
  disabled,
  onClick,
  icon,
  title,
  text,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-start gap-3 rounded-2xl border-2 bg-surface p-4 text-left disabled:opacity-50",
        active ? "border-brand" : "border-transparent shadow-sm hover:border-line",
      )}
    >
      <span className="rounded-xl bg-brand-soft p-2.5 text-brand-fg">{icon}</span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="text-sm text-muted">{text}</span>
      </span>
    </button>
  );
}
