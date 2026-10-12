"use client";

import { ArrowDown, ArrowUp, Clock, ImagePlus, Pencil, Plus, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Button, cn, Field, inputClass, Sheet, Spinner } from "@/components/ui";
import type { Features } from "@/lib/features";
import { DAY_SHORT, describeWindow } from "@/lib/menu-rules";
import { centsToInput, formatBRL, parseBRL } from "@/lib/money";
import { createClient } from "@/lib/supabase/client";
import { TAG_LABEL, type Category, type ComboComponent, type ItemOption, type MenuItem, type Station, type Translations } from "@/lib/types";

interface Props {
  restaurantId: string;
  stations: Station[];
  categories: Category[];
  items: MenuItem[];
  options: ItemOption[];
  features: Features;
}

export function MenuEditor({ restaurantId, stations, categories, items, options, features }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [editing, setEditing] = useState<Partial<MenuItem> | null>(null);
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(promise: PromiseLike<{ error: { message: string } | null }>) {
    const { error } = await promise;
    if (error) setError(error.message);
    router.refresh();
  }

  async function deleteCategory(c: Category) {
    const count = items.filter((i) => i.category_id === c.id).length;
    if (!window.confirm(`Excluir "${c.name}"${count ? ` e seus ${count} prato(s)` : ""}?`)) return;
    await run(supabase.from("categories").delete().eq("id", c.id));
  }

  async function moveCategory(index: number, dir: -1 | 1) {
    const list = [...categories];
    const target = index + dir;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    await Promise.all(list.map((c, i) => supabase.from("categories").update({ sort: i }).eq("id", c.id)));
    router.refresh();
  }

  async function toggleAvailable(item: MenuItem) {
    await run(supabase.from("menu_items").update({ available: !item.available }).eq("id", item.id));
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Cardápio</h1>
          <p className="text-sm text-muted">Pratos, preços, fotos e adicionais. As mudanças aparecem na hora para os clientes.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/cardapio/importar" className="inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-semibold hover:bg-stone-50">
            <Upload className="size-4" /> Importar
          </Link>
          <Button onClick={() => setEditingCategory({ station_id: stations[0]?.id ?? null, sort: categories.length })}>
            <Plus className="size-4" /> Nova categoria
          </Button>
        </div>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" onClick={() => setError(null)}>
          {error}
        </p>
      )}

      <StationsEditor restaurantId={restaurantId} stations={stations} onChanged={() => router.refresh()} />

      {categories.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-line p-10 text-center text-muted">Comece criando uma categoria, como “Entradas” ou “Bebidas”.</div>
      )}

      {categories.map((c, idx) => {
        const list = items.filter((i) => i.category_id === c.id);
        const scheduled = features.scheduled_menu && (c.start_time || (c.days && c.days.length < 7));
        return (
          <section key={c.id} className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <header className="border-b border-line px-4 py-3">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold break-words">{c.name}</h2>
                  {scheduled && (
                    <p className="flex items-center gap-1 text-xs text-muted">
                      <Clock className="size-3.5 shrink-0" /> {describeWindow(c.days, c.start_time, c.end_time)}
                    </p>
                  )}
                </div>
                <div className="-mr-2 flex shrink-0 items-center">
                  <IconButton onClick={() => moveCategory(idx, -1)} disabled={idx === 0} label="Subir">
                    <ArrowUp className="size-4" />
                  </IconButton>
                  <IconButton onClick={() => moveCategory(idx, 1)} disabled={idx === categories.length - 1} label="Descer">
                    <ArrowDown className="size-4" />
                  </IconButton>
                  <IconButton onClick={() => setEditingCategory(c)} label="Editar categoria">
                    <Pencil className="size-4" />
                  </IconButton>
                  <IconButton onClick={() => deleteCategory(c)} label="Excluir" danger>
                    <Trash2 className="size-4" />
                  </IconButton>
                </div>
              </div>
              <label className="mt-1 flex items-center gap-2 text-sm text-muted">
                Preparado em
                <select
                  className="rounded-lg border border-line bg-white px-2 py-1 text-sm text-ink"
                  value={c.station_id ?? ""}
                  onChange={(e) => run(supabase.from("categories").update({ station_id: e.target.value || null }).eq("id", c.id))}
                >
                  <option value="">—</option>
                  {stations.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            </header>

            <div className="divide-y divide-line">
              {list.map((item) => (
                <div key={item.id} className="flex items-start gap-3 px-4 py-3 sm:items-center sm:gap-4">
                  {item.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image_url} alt="" className="size-14 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-400">
                      <ImagePlus className="size-5" />
                    </div>
                  )}
                  {/* Nome e preço na mesma coluna: no celular o preço quebra para baixo do nome em vez de sobrepor. */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <span className={cn("min-w-0 font-semibold break-words", !item.available && "text-muted")}>{item.name}</span>
                      <span className="shrink-0 font-semibold tabular-nums">{formatBRL(item.price_cents)}</span>
                    </div>
                    {item.description && <div className="line-clamp-2 text-sm text-muted sm:line-clamp-1">{item.description}</div>}
                    <div className="mt-1 flex flex-wrap gap-1">
                      {features.suggestions && item.featured && <Badge className="bg-brand-soft text-brand">Destaque</Badge>}
                      {features.combos && item.combo_items?.length > 0 && <Badge className="bg-violet-100 text-violet-800">Combo</Badge>}
                      {features.stock && item.stock_qty != null && (
                        <Badge className={item.stock_qty <= 5 ? "bg-red-100 text-red-700" : "bg-stone-100 text-stone-700"}>Estoque: {item.stock_qty}</Badge>
                      )}
                      {features.scheduled_menu && item.promo_price_cents != null && (
                        <Badge className="bg-emerald-100 text-emerald-800">Happy hour {formatBRL(item.promo_price_cents)}</Badge>
                      )}
                      {features.dietary &&
                        item.tags?.map((t) => (
                          <Badge key={t} className="bg-stone-100 text-stone-600">
                            {TAG_LABEL[t] ?? t}
                          </Badge>
                        ))}
                    </div>
                    <AvailabilityToggle available={item.available} onClick={() => toggleAvailable(item)} className="mt-2 sm:hidden" />
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <AvailabilityToggle available={item.available} onClick={() => toggleAvailable(item)} className="hidden sm:inline-flex" />
                    <IconButton onClick={() => setEditing(item)} label="Editar">
                      <Pencil className="size-4" />
                    </IconButton>
                  </div>
                </div>
              ))}
              <button
                onClick={() => setEditing({ category_id: c.id, available: true, sort: list.length })}
                className="flex w-full items-center gap-2 px-4 py-3 text-sm font-semibold text-brand hover:bg-brand-soft/50"
              >
                <Plus className="size-4" /> Adicionar prato em {c.name}
              </button>
            </div>
          </section>
        );
      })}

      {editing && (
        <ItemDialog
          restaurantId={restaurantId}
          item={editing}
          categories={categories}
          allItems={items}
          options={options.filter((o) => o.menu_item_id === editing.id)}
          features={features}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}

      {editingCategory && (
        <CategoryDialog
          restaurantId={restaurantId}
          category={editingCategory}
          features={features}
          onClose={() => setEditingCategory(null)}
          onSaved={() => {
            setEditingCategory(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function AvailabilityToggle({ available, onClick, className }: { available: boolean; onClick: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "items-center justify-center rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap sm:w-24",
        available ? "bg-emerald-100 text-emerald-800" : "bg-stone-200 text-stone-600",
        className,
      )}
      title="Toque para alternar"
    >
      {available ? "Disponível" : "Esgotado"}
    </button>
  );
}

function IconButton({ children, onClick, label, disabled, danger }: { children: React.ReactNode; onClick: () => void; label: string; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn("rounded-lg p-2 text-muted hover:bg-stone-100 disabled:opacity-30", danger && "hover:bg-red-50 hover:text-red-600")}
    >
      {children}
    </button>
  );
}

function StationsEditor({ restaurantId, stations, onChanged }: { restaurantId: string; stations: Station[]; onChanged: () => void }) {
  const supabase = createClient();
  async function add() {
    const name = window.prompt("Nome da estação (ex.: Cozinha, Bar, Sobremesas):");
    if (!name?.trim()) return;
    await supabase.from("stations").insert({ restaurant_id: restaurantId, name: name.trim(), sort: stations.length });
    onChanged();
  }
  async function remove(s: Station) {
    if (!window.confirm(`Remover a estação "${s.name}"? As categorias ligadas a ela ficarão sem estação.`)) return;
    await supabase.from("stations").delete().eq("id", s.id);
    onChanged();
  }
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="mb-2 font-semibold">Estações de preparo</div>
      <p className="mb-3 text-sm text-muted">Cada estação tem sua própria tela de pedidos. Ex.: bebidas vão para o Bar, pratos para a Cozinha.</p>
      <div className="flex flex-wrap gap-2">
        {stations.map((s) => (
          <span key={s.id} className="flex items-center gap-1 rounded-full bg-stone-100 py-1 pr-1 pl-3 text-sm font-medium">
            {s.name}
            <button onClick={() => remove(s)} className="rounded-full p-1 text-muted hover:bg-white hover:text-red-600" aria-label="Remover">
              <Trash2 className="size-3.5" />
            </button>
          </span>
        ))}
        <button onClick={add} className="flex items-center gap-1 rounded-full border border-dashed border-line px-3 py-1 text-sm text-brand">
          <Plus className="size-3.5" /> Estação
        </button>
      </div>
    </div>
  );
}

/** Seleção de dias da semana (0=domingo). Nenhum marcado = todos os dias. */
function DayPicker({ value, onChange }: { value: number[]; onChange: (d: number[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {DAY_SHORT.map((d, i) => {
        const on = value.includes(i);
        return (
          <button
            key={d}
            type="button"
            onClick={() => onChange(on ? value.filter((x) => x !== i) : [...value, i].sort())}
            className={cn("w-11 rounded-lg py-1.5 text-xs font-semibold", on ? "bg-brand text-white" : "bg-stone-100 text-muted")}
          >
            {d}
          </button>
        );
      })}
    </div>
  );
}

function TranslationFields({
  value,
  onChange,
  withDescription,
}: {
  value: Translations;
  onChange: (t: Translations) => void;
  withDescription?: boolean;
}) {
  const set = (lang: "en" | "es", field: "name" | "description", v: string) => onChange({ ...value, [lang]: { ...value[lang], [field]: v } });
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {(["en", "es"] as const).map((lang) => (
        <div key={lang} className="space-y-2 rounded-xl bg-canvas p-3">
          <div className="text-xs font-semibold text-muted">{lang === "en" ? "🇺🇸 Inglês" : "🇪🇸 Espanhol"}</div>
          <input className={inputClass} placeholder="Nome" value={value[lang]?.name ?? ""} onChange={(e) => set(lang, "name", e.target.value)} />
          {withDescription && (
            <textarea className={inputClass} rows={2} placeholder="Descrição" value={value[lang]?.description ?? ""} onChange={(e) => set(lang, "description", e.target.value)} />
          )}
        </div>
      ))}
    </div>
  );
}

function CategoryDialog({
  restaurantId,
  category,
  features,
  onClose,
  onSaved,
}: {
  restaurantId: string;
  category: Partial<Category>;
  features: Features;
  onClose: () => void;
  onSaved: () => void;
}) {
  const supabase = createClient();
  const [name, setName] = useState(category.name ?? "");
  const [days, setDays] = useState<number[]>(category.days ?? []);
  const [start, setStart] = useState(category.start_time?.slice(0, 5) ?? "");
  const [end, setEnd] = useState(category.end_time?.slice(0, 5) ?? "");
  const [translations, setTranslations] = useState<Translations>(category.translations ?? {});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!name.trim()) return setError("Informe o nome");
    if ((start && !end) || (!start && end)) return setError("Preencha início e fim do horário, ou deixe os dois vazios");
    setSaving(true);
    const row = {
      restaurant_id: restaurantId,
      name: name.trim(),
      station_id: category.station_id ?? null,
      sort: category.sort ?? 0,
      days: days.length && days.length < 7 ? days : null,
      start_time: start || null,
      end_time: end || null,
      translations,
    };
    const { error } = category.id ? await supabase.from("categories").update(row).eq("id", category.id) : await supabase.from("categories").insert(row);
    setSaving(false);
    if (error) return setError(error.message);
    onSaved();
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={category.id ? "Editar categoria" : "Nova categoria"}
      footer={
        <Button className="w-full" onClick={save} disabled={saving}>
          {saving ? <Spinner /> : "Salvar"}
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="Nome">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Entradas, Almoço executivo, Bebidas" autoFocus />
        </Field>
        {features.scheduled_menu && (
          <div className="space-y-2 rounded-2xl border border-line p-4">
            <div className="font-semibold">Horário em que aparece</div>
            <p className="text-xs text-muted">Ex.: “Almoço executivo” só de segunda a sexta, das 11:30 às 15:00. Vazio = sempre.</p>
            <DayPicker value={days} onChange={setDays} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Das">
                <input type="time" className={inputClass} value={start} onChange={(e) => setStart(e.target.value)} />
              </Field>
              <Field label="Até">
                <input type="time" className={inputClass} value={end} onChange={(e) => setEnd(e.target.value)} />
              </Field>
            </div>
          </div>
        )}
        {features.languages && (
          <div>
            <div className="mb-2 font-semibold">Traduções</div>
            <TranslationFields value={translations} onChange={setTranslations} />
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </Sheet>
  );
}

function ItemDialog({
  restaurantId,
  item,
  categories,
  allItems,
  options,
  features,
  onClose,
  onSaved,
}: {
  restaurantId: string;
  item: Partial<MenuItem>;
  categories: Category[];
  allItems: MenuItem[];
  options: ItemOption[];
  features: Features;
  onClose: () => void;
  onSaved: () => void;
}) {
  const supabase = createClient();
  const [name, setName] = useState(item.name ?? "");
  const [description, setDescription] = useState(item.description ?? "");
  const [price, setPrice] = useState(item.price_cents != null ? centsToInput(item.price_cents) : "");
  const [categoryId, setCategoryId] = useState(item.category_id ?? categories[0]?.id);
  const [imageUrl, setImageUrl] = useState(item.image_url ?? null);
  const [opts, setOpts] = useState(options.map((o) => ({ name: o.name, price: centsToInput(o.price_cents) })));
  const [tags, setTags] = useState<string[]>(item.tags ?? []);
  const [featured, setFeatured] = useState(item.featured ?? false);
  const [pairs, setPairs] = useState<string[]>(item.pairs_with ?? []);
  const [translations, setTranslations] = useState<Translations>(item.translations ?? {});
  const [stock, setStock] = useState(item.stock_qty != null ? String(item.stock_qty) : "");
  const [promoPrice, setPromoPrice] = useState(item.promo_price_cents != null ? centsToInput(item.promo_price_cents) : "");
  const [promoDays, setPromoDays] = useState<number[]>(item.promo_days ?? []);
  const [promoStart, setPromoStart] = useState(item.promo_start?.slice(0, 5) ?? "");
  const [promoEnd, setPromoEnd] = useState(item.promo_end?.slice(0, 5) ?? "");
  const [combo, setCombo] = useState<ComboComponent[]>(item.combo_items ?? []);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const others = allItems.filter((i) => i.id !== item.id);

  async function upload(file: File) {
    setUploading(true);
    setError(null);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${restaurantId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("menu").upload(path, file, { cacheControl: "31536000", contentType: file.type });
    setUploading(false);
    if (error) return setError(`Erro ao enviar foto: ${error.message}`);
    setImageUrl(supabase.storage.from("menu").getPublicUrl(path).data.publicUrl);
  }

  async function save() {
    if (!name.trim()) return setError("Informe o nome do prato");
    const hasPromo = features.scheduled_menu && promoPrice.trim() !== "";
    if (hasPromo && (!promoStart || !promoEnd)) return setError("Happy hour: informe o horário de início e fim");
    setSaving(true);
    const stockQty = stock.trim() === "" ? null : Math.max(0, Number.parseInt(stock) || 0);
    const row = {
      restaurant_id: restaurantId,
      category_id: categoryId,
      name: name.trim(),
      description: description.trim() || null,
      price_cents: parseBRL(price),
      image_url: imageUrl,
      // Estoque zerado tira do cardápio; repor estoque devolve.
      available: features.stock && stockQty != null ? stockQty > 0 : (item.available ?? true),
      sort: item.sort ?? 0,
      tags,
      featured,
      pairs_with: pairs,
      translations,
      stock_qty: stockQty,
      promo_price_cents: hasPromo ? parseBRL(promoPrice) : null,
      promo_days: hasPromo && promoDays.length && promoDays.length < 7 ? promoDays : null,
      promo_start: hasPromo ? promoStart : null,
      promo_end: hasPromo ? promoEnd : null,
      combo_items: combo.filter((c) => c.menu_item_id && c.qty > 0),
    };
    const { data, error } = item.id
      ? await supabase.from("menu_items").update(row).eq("id", item.id).select("id").single()
      : await supabase.from("menu_items").insert(row).select("id").single();
    if (error || !data) {
      setSaving(false);
      return setError(error?.message ?? "Erro ao salvar");
    }
    // Adicionais: substitui a lista inteira (pedidos antigos guardam uma cópia, então é seguro).
    await supabase.from("item_options").delete().eq("menu_item_id", data.id);
    const validOpts = opts.filter((o) => o.name.trim());
    if (validOpts.length) {
      await supabase.from("item_options").insert(
        validOpts.map((o, i) => ({ restaurant_id: restaurantId, menu_item_id: data.id, name: o.name.trim(), price_cents: parseBRL(o.price), sort: i })),
      );
    }
    setSaving(false);
    onSaved();
  }

  async function remove() {
    if (!item.id || !window.confirm(`Excluir "${item.name}"? Para tirar do cardápio só hoje, prefira marcar como Esgotado.`)) return;
    await supabase.from("menu_items").delete().eq("id", item.id);
    onSaved();
  }

  return (
    <Sheet
      open
      wide
      onClose={onClose}
      title={item.id ? "Editar prato" : "Novo prato"}
      footer={
        <div className="flex gap-3">
          {item.id && (
            <Button variant="ghost" className="text-red-600" onClick={remove}>
              <Trash2 className="size-4" /> Excluir
            </Button>
          )}
          {error && <p className="self-center text-sm text-red-600">{error}</p>}
          <Button className="ml-auto" onClick={save} disabled={saving || uploading}>
            {saving ? <Spinner /> : "Salvar"}
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
        <label className="relative flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-line bg-stone-50 text-muted hover:border-brand">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="absolute inset-0 size-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-1 text-sm">
              <ImagePlus className="size-6" /> Adicionar foto
            </span>
          )}
          {uploading && (
            <span className="absolute inset-0 flex items-center justify-center bg-white/70 text-brand">
              <Spinner />
            </span>
          )}
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </label>

        <div className="space-y-4">
          <Field label="Nome">
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Picanha na chapa" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Preço (R$)">
              <input className={inputClass} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0,00" />
            </Field>
            <Field label="Categoria">
              <select className={inputClass} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {features.stock && (
            <Field label="Estoque (porções)" hint="Vazio = sem controle. Chegando a 0, o prato fica esgotado sozinho.">
              <input className={inputClass} type="number" min={0} value={stock} onChange={(e) => setStock(e.target.value)} placeholder="Sem controle" />
            </Field>
          )}
        </div>
      </div>

      <div className="mt-4">
        <Field label="Descrição">
          <textarea className={inputClass} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ingredientes, tamanho da porção, serve quantas pessoas..." />
        </Field>
      </div>

      <Section title="Adicionais">
        <div className="space-y-2">
          {opts.map((o, i) => (
            <div key={i} className="flex gap-2">
              <input className={inputClass} placeholder="Ex.: Bacon extra" value={o.name} onChange={(e) => setOpts(opts.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
              <input
                className={cn(inputClass, "w-28")}
                placeholder="+ 0,00"
                inputMode="decimal"
                value={o.price}
                onChange={(e) => setOpts(opts.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))}
              />
              <button className="rounded-lg p-2 text-muted hover:text-red-600" onClick={() => setOpts(opts.filter((_, j) => j !== i))} aria-label="Remover">
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          <button onClick={() => setOpts([...opts, { name: "", price: "" }])} className="flex items-center gap-1 text-sm font-semibold text-brand">
            <Plus className="size-4" /> Adicional
          </button>
        </div>
      </Section>

      {features.dietary && (
        <Section title="Alimentação e alérgenos">
          <div className="flex flex-wrap gap-2">
            {Object.entries(TAG_LABEL).map(([key, label]) => {
              const on = tags.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTags(on ? tags.filter((t) => t !== key) : [...tags, key])}
                  className={cn("rounded-full px-3 py-1.5 text-sm font-medium", on ? "bg-emerald-600 text-white" : "bg-stone-100 text-muted")}
                >
                  {on && "✓ "}
                  {label}
                </button>
              );
            })}
          </div>
        </Section>
      )}

      {features.suggestions && (
        <Section title="Destaque e sugestões">
          <label className="mb-3 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="size-4 accent-[var(--color-brand)]" />
            Marcar como <strong>Destaque</strong> da casa
          </label>
          <div className="mb-1 text-sm font-medium">“Combina com” (aparece ao abrir este prato)</div>
          <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
            {others.map((o) => {
              const on = pairs.includes(o.id);
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setPairs(on ? pairs.filter((x) => x !== o.id) : [...pairs, o.id].slice(0, 6))}
                  className={cn("rounded-full px-3 py-1 text-xs font-medium", on ? "bg-brand text-white" : "bg-stone-100 text-muted")}
                >
                  {on && "✓ "}
                  {o.name}
                </button>
              );
            })}
          </div>
        </Section>
      )}

      {features.scheduled_menu && (
        <Section title="Happy hour">
          <p className="mb-2 text-xs text-muted">Preço especial em dias e horários definidos. Deixe o preço vazio para não ter happy hour.</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Preço promocional">
              <input className={inputClass} inputMode="decimal" value={promoPrice} onChange={(e) => setPromoPrice(e.target.value)} placeholder="Sem promoção" />
            </Field>
            <Field label="Das">
              <input type="time" className={inputClass} value={promoStart} onChange={(e) => setPromoStart(e.target.value)} />
            </Field>
            <Field label="Até">
              <input type="time" className={inputClass} value={promoEnd} onChange={(e) => setPromoEnd(e.target.value)} />
            </Field>
          </div>
          <div className="mt-2">
            <DayPicker value={promoDays} onChange={setPromoDays} />
          </div>
        </Section>
      )}

      {features.combos && (
        <Section title="Combo">
          <p className="mb-2 text-xs text-muted">Se este prato é um combo, liste o que vem nele. A cozinha vê os itens e o estoque de cada um é baixado.</p>
          <div className="space-y-2">
            {combo.map((c, i) => (
              <div key={i} className="flex gap-2">
                <select
                  className={inputClass}
                  value={c.menu_item_id}
                  onChange={(e) => {
                    const target = others.find((o) => o.id === e.target.value);
                    setCombo(combo.map((x, j) => (j === i ? { ...x, menu_item_id: e.target.value, name: target?.name ?? "" } : x)));
                  }}
                >
                  <option value="">Escolha o item</option>
                  {others.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  className={cn(inputClass, "w-20")}
                  value={c.qty}
                  onChange={(e) => setCombo(combo.map((x, j) => (j === i ? { ...x, qty: Math.max(1, Number(e.target.value) || 1) } : x)))}
                />
                <button className="rounded-lg p-2 text-muted hover:text-red-600" onClick={() => setCombo(combo.filter((_, j) => j !== i))} aria-label="Remover">
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
            <button onClick={() => setCombo([...combo, { menu_item_id: "", name: "", qty: 1 }])} className="flex items-center gap-1 text-sm font-semibold text-brand">
              <Plus className="size-4" /> Item do combo
            </button>
          </div>
        </Section>
      )}

      {features.languages && (
        <Section title="Traduções">
          <TranslationFields value={translations} onChange={setTranslations} withDescription />
        </Section>
      )}
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5 border-t border-line pt-4">
      <div className="mb-2 text-sm font-semibold">{title}</div>
      {children}
    </div>
  );
}
