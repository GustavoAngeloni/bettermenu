"use client";

import { ArrowUpToLine, BookOpen, FileUp, Megaphone, Newspaper, Pencil, Pin, PlayCircle, Plus, Trash2 } from "lucide-react";
import { useActionState, useEffect, useState, useTransition } from "react";
import { Badge, Button, cn, Field, inputClass, Spinner } from "@/components/ui";
import { AUDIENCES, LEARNING_KINDS, type LearningItem, type LearningKind } from "@/lib/learning";
import { PLAN_KEYS, PLANS } from "@/lib/plans";
import { createClient } from "@/lib/supabase/client";
import { bumpLearningItem, deleteLearningItem, saveLearningItem } from "./actions";

const KIND_ICON = { manual: BookOpen, video: PlayCircle, novidade: Megaphone, artigo: Newspaper };

export function LearningEditor({ items }: { items: LearningItem[] }) {
  const [editing, setEditing] = useState<Partial<LearningItem> | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_26rem]">
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Publicados ({items.length})</h2>
          <Button size="sm" onClick={() => setEditing({ kind: "novidade", published: true, audience: [], plans: [] })}>
            <Plus className="size-4" /> Novo material
          </Button>
        </div>
        {items.length === 0 && <p className="rounded-2xl border-2 border-dashed border-line p-8 text-center text-sm text-muted">Nada publicado ainda. Comece pelos manuais em PDF.</p>}
        <ul className="space-y-2">
          {items.map((it) => {
            const Icon = KIND_ICON[it.kind];
            return (
              <li key={it.id} className={cn("flex items-start gap-3 rounded-2xl border border-line bg-surface p-4", !it.published && "opacity-60")}>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-fg">
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold">{it.title}</span>
                    {it.pinned && (
                      <Badge className="bg-amber-100 text-amber-800">
                        <Pin className="size-3" /> Fixado
                      </Badge>
                    )}
                    {!it.published && <Badge className="bg-stone-200 text-stone-600">Rascunho</Badge>}
                  </div>
                  <p className="text-xs text-muted">
                    {LEARNING_KINDS[it.kind].label} · {new Date(it.published_at).toLocaleDateString("pt-BR")}
                    {it.plans.length > 0 && ` · ${it.plans.map((p) => PLANS[p as keyof typeof PLANS]?.label ?? p).join(", ")}`}
                    {it.audience.length > 0 && ` · ${it.audience.map((a) => AUDIENCES[a as keyof typeof AUDIENCES] ?? a).join(", ")}`}
                  </p>
                  {it.summary && <p className="mt-1 line-clamp-2 text-sm text-muted">{it.summary}</p>}
                </div>
                <div className="flex shrink-0 gap-1">
                  <IconBtn label="Mostrar como novidade de novo" onClick={() => start(() => bumpLearningItem(it.id))} disabled={pending}>
                    <ArrowUpToLine className="size-4" />
                  </IconBtn>
                  <IconBtn label="Editar" onClick={() => setEditing(it)}>
                    <Pencil className="size-4" />
                  </IconBtn>
                  <IconBtn
                    label="Excluir"
                    danger
                    onClick={() => window.confirm(`Excluir "${it.title}"?`) && start(() => deleteLearningItem(it.id))}
                    disabled={pending}
                  >
                    <Trash2 className="size-4" />
                  </IconBtn>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        {editing ? (
          <ItemForm key={editing.id ?? "novo"} item={editing} onDone={() => setEditing(null)} />
        ) : (
          <div className="rounded-[1.4rem] border border-line bg-surface p-5 text-sm text-muted">
            <p className="font-semibold text-ink">Como usar</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <b>Manual</b>: envie o PDF; o dono baixa ou abre no celular.
              </li>
              <li>
                <b>Vídeo</b>: cole o link do YouTube, Vimeo ou Loom; ele toca dentro do painel.
              </li>
              <li>
                <b>Novidade</b>: o que lançamos; aparece com aviso no menu do dono.
              </li>
              <li>
                <b>Artigo</b>: dicas de operação, em texto.
              </li>
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}

function IconBtn({ label, onClick, children, danger, disabled }: { label: string; onClick: () => void; children: React.ReactNode; danger?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn("rounded-lg p-2 text-muted transition hover:bg-surface-2", danger ? "hover:text-red-600" : "hover:text-ink")}
    >
      {children}
    </button>
  );
}

function ItemForm({ item, onDone }: { item: Partial<LearningItem>; onDone: () => void }) {
  const [result, action, saving] = useActionState(saveLearningItem, null);
  const [kind, setKind] = useState<LearningKind>(item.kind ?? "novidade");
  const [url, setUrl] = useState(item.url ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (result?.startsWith("ok:")) onDone();
  }, [result, onDone]);

  async function upload(file: File) {
    setUploading(true);
    setUploadError(null);
    const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
    const path = `aprender/${crypto.randomUUID()}.${ext}`;
    const supabase = createClient();
    const { error } = await supabase.storage.from("menu").upload(path, file, { contentType: file.type || "application/octet-stream", cacheControl: "31536000" });
    setUploading(false);
    if (error) return setUploadError(`Falha no envio: ${error.message}`);
    setUrl(supabase.storage.from("menu").getPublicUrl(path).data.publicUrl);
  }

  return (
    <form action={action} className="space-y-4 rounded-[1.4rem] border border-line bg-surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">{item.id ? "Editar material" : "Novo material"}</h2>
        <button type="button" onClick={onDone} className="text-sm text-muted hover:text-ink">
          Cancelar
        </button>
      </div>
      {item.id && <input type="hidden" name="id" value={item.id} />}
      <Field label="Tipo">
        <select name="kind" className={inputClass} value={kind} onChange={(e) => setKind(e.target.value as LearningKind)}>
          {(Object.keys(LEARNING_KINDS) as LearningKind[]).map((k) => (
            <option key={k} value={k}>
              {LEARNING_KINDS[k].label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Título">
        <input name="title" className={inputClass} defaultValue={item.title ?? ""} required />
      </Field>
      <Field label="Resumo" hint="Uma ou duas frases, aparecem no cartão.">
        <textarea name="summary" rows={2} className={inputClass} defaultValue={item.summary ?? ""} />
      </Field>
      {(kind === "manual" || kind === "video") && (
        <Field label={kind === "manual" ? "Arquivo ou link do manual" : "Link do vídeo"} hint={kind === "video" ? "YouTube, Vimeo, Loom ou arquivo .mp4." : "Envie o PDF ou cole um link."}>
          <input name="url" className={inputClass} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
        </Field>
      )}
      {kind !== "manual" && kind !== "video" && <input type="hidden" name="url" value={url} />}
      {kind === "manual" && (
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line p-4 text-sm font-semibold text-brand-fg hover:border-brand">
          {uploading ? <Spinner className="size-4" /> : <FileUp className="size-4" />} {uploading ? "Enviando..." : "Enviar arquivo (PDF)"}
          <input type="file" accept="application/pdf,.pdf,.zip,.pptx,.docx" className="sr-only" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </label>
      )}
      {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
      {(kind === "novidade" || kind === "artigo") && (
        <Field label="Texto" hint="Parágrafos separados por linha em branco.">
          <textarea name="body" rows={6} className={inputClass} defaultValue={item.body ?? ""} />
        </Field>
      )}
      {kind !== "novidade" && kind !== "artigo" && <input type="hidden" name="body" value={item.body ?? ""} />}
      <Field label="Imagem de capa (opcional)" hint="Link de uma imagem. Vídeos do YouTube usam a miniatura do próprio vídeo.">
        <input name="cover_url" className={inputClass} defaultValue={item.cover_url ?? ""} placeholder="https://" />
      </Field>
      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">Para quem (nada marcado = todos)</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {Object.entries(AUDIENCES).map(([k, v]) => (
            <label key={k} className="flex items-center gap-1.5">
              <input type="checkbox" name="audience" value={k} defaultChecked={item.audience?.includes(k)} className="accent-[var(--brand)]" /> {v}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">Planos (nada marcado = todos)</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {PLAN_KEYS.map((p) => (
            <label key={p} className="flex items-center gap-1.5">
              <input type="checkbox" name="plans" value={p} defaultChecked={item.plans?.includes(p)} className="accent-[var(--brand)]" /> {PLANS[p].label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
        <label className="flex items-center gap-1.5">
          <input type="checkbox" name="pinned" defaultChecked={item.pinned} className="accent-[var(--brand)]" /> Fixar no topo
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" name="published" defaultChecked={item.published ?? true} className="accent-[var(--brand)]" /> Publicado
        </label>
      </div>
      {result && !result.startsWith("ok:") && <p className="text-sm text-red-600">{result}</p>}
      <Button type="submit" className="w-full" disabled={saving || uploading}>
        {saving ? <Spinner /> : item.id ? "Salvar alterações" : "Publicar"}
      </Button>
    </form>
  );
}
