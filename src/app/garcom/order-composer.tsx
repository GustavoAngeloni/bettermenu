"use client";

import { ArrowLeft, Minus, Plus, Search, Trash2, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, cn, inputClass, Sheet, Spinner } from "@/components/ui";
import type { Features } from "@/lib/features";
import { effectivePrice, isCategoryOpen } from "@/lib/menu-rules";
import { formatBRL } from "@/lib/money";
import type { Category, ItemOption, MenuItem } from "@/lib/types";
import { waiterOrder } from "./actions";

export interface StaffMenu {
  categories: Category[];
  items: MenuItem[];
  options: ItemOption[];
}

type Share = "me" | "all" | string[];

interface Line {
  key: string;
  item: MenuItem;
  qty: number;
  optionIds: string[];
  note: string;
  share: Share;
  unitPrice: number;
}

/** Garçom monta o pedido de uma pessoa da mesa e envia para a cozinha. */
export function OrderComposer({
  tableId,
  tableNumber,
  guests,
  menu,
  features,
  onClose,
  onSent,
}: {
  tableId: string;
  tableNumber: number;
  guests: { id: string; name: string }[];
  menu: StaffMenu;
  features: Features;
  onClose: () => void;
  onSent: (msg: string) => void;
}) {
  const [guestId, setGuestId] = useState<string | null>(guests[0]?.id ?? null);
  const [newName, setNewName] = useState("");
  const [query, setQuery] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openCategories = useMemo(
    () => menu.categories.filter((c) => isCategoryOpen(c, features.scheduled_menu)),
    [menu.categories, features.scheduled_menu],
  );
  const q = query.trim().toLowerCase();
  const visible = menu.items.filter(
    (i) => openCategories.some((c) => c.id === i.category_id) && (!q || i.name.toLowerCase().includes(q)),
  );
  const total = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const isNewGuest = guestId === null;

  async function send() {
    setSending(true);
    setError(null);
    const result = await waiterOrder({
      tableId,
      guestId: guestId ?? undefined,
      newGuestName: isNewGuest ? newName : undefined,
      lines: lines.map((l) => ({ menu_item_id: l.item.id, qty: l.qty, option_ids: l.optionIds, note: l.note, share: l.share })),
    });
    setSending(false);
    if (!result.ok) return setError(result.error);
    onSent(`Pedido da Mesa ${tableNumber} enviado para a cozinha`);
  }

  if (editing) {
    return (
      <ItemConfig
        item={editing}
        options={menu.options.filter((o) => o.menu_item_id === editing.id)}
        others={guests.filter((g) => g.id !== guestId)}
        features={features}
        onBack={() => setEditing(null)}
        onAdd={(line) => {
          setLines([...lines, line]);
          setEditing(null);
        }}
      />
    );
  }

  return (
    <Sheet
      open
      wide
      onClose={onClose}
      title={`Lançar pedido · Mesa ${tableNumber}`}
      footer={
        <div className="space-y-2">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button size="lg" className="w-full justify-between" disabled={sending || lines.length === 0 || (isNewGuest && guests.length > 0 && !newName.trim())} onClick={send}>
            {sending ? <Spinner /> : <span>Enviar para a cozinha</span>}
            <span>{formatBRL(total)}</span>
          </Button>
        </div>
      }
    >
      <div className="mb-4">
        <div className="mb-2 text-sm font-semibold">Para quem?</div>
        <div className="flex flex-wrap gap-2">
          {guests.map((g) => (
            <button
              key={g.id}
              onClick={() => setGuestId(g.id)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-medium",
                guestId === g.id ? "border-brand bg-brand text-white" : "border-line hover:border-brand",
              )}
            >
              {g.name}
            </button>
          ))}
          <button
            onClick={() => setGuestId(null)}
            className={cn(
              "flex items-center gap-1 rounded-full border px-3.5 py-1.5 text-sm font-medium",
              isNewGuest ? "border-brand bg-brand text-white" : "border-dashed border-line text-brand",
            )}
          >
            <UserPlus className="size-4" /> Nova pessoa
          </button>
        </div>
        {isNewGuest && (
          <input
            className={cn(inputClass, "mt-2")}
            placeholder={guests.length ? "Nome da pessoa" : "Nome (opcional)"}
            value={newName}
            maxLength={30}
            onChange={(e) => setNewName(e.target.value)}
          />
        )}
      </div>

      {lines.length > 0 && (
        <div className="mb-4 divide-y divide-line rounded-2xl border border-line">
          {lines.map((l) => (
            <div key={l.key} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className="font-semibold">{l.qty}×</span>
              <span className="min-w-0 flex-1">
                {l.item.name}
                {l.note && <span className="block text-xs text-amber-700">“{l.note}”</span>}
                {l.share !== "me" && <span className="block text-xs text-brand">{l.share === "all" ? "Dividido com todos" : "Dividido"}</span>}
              </span>
              <span>{formatBRL(l.unitPrice * l.qty)}</span>
              <button className="p-1 text-muted hover:text-red-600" onClick={() => setLines(lines.filter((x) => x.key !== l.key))} aria-label="Remover">
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="relative mb-3">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
        <input className={cn(inputClass, "pl-9")} placeholder="Buscar prato..." value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <div className="space-y-4">
        {openCategories.map((c) => {
          const items = visible.filter((i) => i.category_id === c.id);
          if (!items.length) return null;
          return (
            <div key={c.id}>
              <div className="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">{c.name}</div>
              <div className="grid gap-1 sm:grid-cols-2">
                {items.map((i) => {
                  const { price, promo } = effectivePrice(i, features.scheduled_menu);
                  return (
                    <button
                      key={i.id}
                      disabled={!i.available}
                      onClick={() => setEditing(i)}
                      className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-stone-100 disabled:opacity-40"
                    >
                      <span className="min-w-0 truncate font-medium">{i.name}</span>
                      <span className={cn("shrink-0", promo && "font-semibold text-emerald-700")}>
                        {i.available ? formatBRL(price) : "Esgotado"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}

function ItemConfig({
  item,
  options,
  others,
  features,
  onBack,
  onAdd,
}: {
  item: MenuItem;
  options: ItemOption[];
  others: { id: string; name: string }[];
  features: Features;
  onBack: () => void;
  onAdd: (line: Line) => void;
}) {
  const [qty, setQty] = useState(1);
  const [optionIds, setOptionIds] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [share, setShare] = useState<Share>("me");
  const unitPrice = effectivePrice(item, features.scheduled_menu).price + options.filter((o) => optionIds.includes(o.id)).reduce((s, o) => s + o.price_cents, 0);
  const pill = (on: boolean) => cn("rounded-full border px-3 py-1.5 text-sm font-medium", on ? "border-brand bg-brand text-white" : "border-line");

  return (
    <Sheet
      open
      onClose={onBack}
      title={
        <button onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft className="size-5" /> {item.name}
        </button>
      }
      footer={
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-xl border border-line">
            <button className="p-3 text-brand disabled:text-stone-300" disabled={qty <= 1} onClick={() => setQty(qty - 1)} aria-label="Menos">
              <Minus className="size-4" />
            </button>
            <span className="w-6 text-center font-semibold">{qty}</span>
            <button className="p-3 text-brand" onClick={() => setQty(Math.min(qty + 1, 50))} aria-label="Mais">
              <Plus className="size-4" />
            </button>
          </div>
          <Button
            size="lg"
            className="flex-1 justify-between"
            onClick={() =>
              onAdd({ key: crypto.randomUUID(), item, qty, optionIds, note: note.trim(), share: Array.isArray(share) && !share.length ? "me" : share, unitPrice })
            }
          >
            <span>Adicionar</span>
            <span>{formatBRL(unitPrice * qty)}</span>
          </Button>
        </div>
      }
    >
      {options.length > 0 && (
        <div className="mb-4 divide-y divide-line rounded-2xl border border-line">
          {options.map((o) => (
            <label key={o.id} className="flex items-center gap-3 px-4 py-2.5">
              <input
                type="checkbox"
                className="size-5 accent-[var(--color-brand)]"
                checked={optionIds.includes(o.id)}
                onChange={(e) => setOptionIds(e.target.checked ? [...optionIds, o.id] : optionIds.filter((x) => x !== o.id))}
              />
              <span className="flex-1">{o.name}</span>
              {o.price_cents > 0 && <span className="text-sm text-muted">+ {formatBRL(o.price_cents)}</span>}
            </label>
          ))}
        </div>
      )}
      <textarea className={inputClass} rows={2} maxLength={200} placeholder="Observação (sem cebola, ponto da carne...)" value={note} onChange={(e) => setNote(e.target.value)} />
      {features.item_sharing && (
        <div className="mt-4">
          <div className="mb-2 text-sm font-semibold">Dividir?</div>
          <div className="flex flex-wrap gap-2">
            <button className={pill(share === "me")} onClick={() => setShare("me")}>
              Só essa pessoa
            </button>
            <button className={pill(share === "all")} onClick={() => setShare("all")}>
              Todos da mesa
            </button>
            {others.map((g) => {
              const on = Array.isArray(share) && share.includes(g.id);
              return (
                <button
                  key={g.id}
                  className={pill(on)}
                  onClick={() => {
                    const list = Array.isArray(share) ? share : [];
                    setShare(on ? list.filter((x) => x !== g.id) : [...list, g.id]);
                  }}
                >
                  {on ? "✓ " : "+ "}
                  {g.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </Sheet>
  );
}
