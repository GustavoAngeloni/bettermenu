"use client";

import { Ban, Check, ChefHat, Flame, Printer, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, cn, Sheet, Spinner } from "@/components/ui";
import { playChime } from "@/lib/alerts";
import type { Features } from "@/lib/features";
import { printTicket } from "./print";
import { notifyReady, setAvailability } from "./actions";
import { useRestaurantLive } from "@/lib/live";
import { createClient } from "@/lib/supabase/client";
import { formatElapsed, formatTime, minutesSince } from "@/lib/time";
import type { OrderItem, Station } from "@/lib/types";

interface KitchenData {
  items: OrderItem[];
  tables: Map<string, number>;
  guests: Map<string, string>;
}

interface Ticket {
  orderId: string;
  tableId: string;
  guestId: string;
  createdAt: string;
  items: OrderItem[];
  stage: "new" | "preparing" | "ready";
}

const READY_WINDOW_MIN = 15;

export interface KitchenMenuItem {
  id: string;
  name: string;
  category: string;
  available: boolean;
}

export function KitchenApp({
  restaurantId,
  restaurantName,
  stations,
  features,
  menuItems,
}: {
  restaurantId: string;
  restaurantName: string;
  stations: Station[];
  features: Features;
  menuItems: KitchenMenuItem[];
}) {
  const supabase = createClient();
  const [data, setData] = useState<KitchenData | null>(null);
  // Só renderiza no cliente (depois do "Iniciar turno"), então pode ler o localStorage direto.
  const [station, setStation] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("bm_station");
      if (saved && stations.some((s) => s.id === saved)) return saved;
    } catch {}
    return "all";
  });
  const [, setTick] = useState(0);
  const [soldOutOpen, setSoldOutOpen] = useState(false);
  const [menuState, setMenuState] = useState(menuItems);
  const [autoPrint, setAutoPrint] = useState<boolean>(() => {
    try {
      return localStorage.getItem("bm_autoprint") === "1";
    } catch {
      return false;
    }
  });
  const autoPrintRef = useRef(autoPrint);
  const stationRef = useRef(station);
  useEffect(() => {
    autoPrintRef.current = autoPrint;
    stationRef.current = station;
  }, [autoPrint, station]);
  const seenOrders = useRef<Set<string> | null>(null);
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reload = useCallback(async () => {
    const since = new Date(Date.now() - READY_WINDOW_MIN * 60000).toISOString();
    const [{ data: active }, { data: ready }, { data: tables }] = await Promise.all([
      supabase.from("order_items").select("*").eq("restaurant_id", restaurantId).in("status", ["pending", "preparing"]).order("created_at"),
      supabase.from("order_items").select("*").eq("restaurant_id", restaurantId).eq("status", "ready").gte("ready_at", since),
      supabase.from("tables").select("id, number").eq("restaurant_id", restaurantId),
    ]);
    const items = [...((active ?? []) as OrderItem[]), ...((ready ?? []) as OrderItem[])];
    const guestIds = [...new Set(items.map((i) => i.guest_id))];
    const { data: guests } = guestIds.length
      ? await supabase.from("guests").select("id, name").in("id", guestIds)
      : { data: [] };

    const tableMap = new Map(((tables ?? []) as { id: string; number: number }[]).map((t) => [t.id, t.number]));
    const guestMap = new Map(((guests ?? []) as { id: string; name: string }[]).map((g) => [g.id, g.name]));

    const newOrderIds = new Set(items.filter((i) => i.status === "pending").map((i) => i.order_id));
    const fresh = seenOrders.current ? [...newOrderIds].filter((id) => !seenOrders.current!.has(id)) : [];
    if (fresh.length) {
      playChime();
      // Impressão automática das comandas novas (da estação selecionada).
      if (autoPrintRef.current && features.kitchen_print) {
        for (const orderId of fresh) {
          const its = items.filter((i) => i.order_id === orderId && (stationRef.current === "all" || i.station_id === stationRef.current));
          if (its.length) printTicket({ restaurantName, tableNumber: tableMap.get(its[0].table_id), guestName: guestMap.get(its[0].guest_id), items: its });
        }
      }
    }
    seenOrders.current = new Set([...(seenOrders.current ?? []), ...newOrderIds]);

    setData({ items, tables: tableMap, guests: guestMap });
  }, [supabase, restaurantId, restaurantName, features.kitchen_print]);

  const scheduleReload = useCallback(() => {
    if (reloadTimer.current) clearTimeout(reloadTimer.current);
    reloadTimer.current = setTimeout(reload, 250);
  }, [reload]);

  useRestaurantLive(restaurantId, ["order_items"], scheduleReload, reload);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 20000);
    return () => clearInterval(id);
  }, []);

  const tickets = useMemo(() => {
    if (!data) return [];
    const filtered = data.items.filter((i) => station === "all" || i.station_id === station);
    const byOrder = new Map<string, OrderItem[]>();
    for (const i of filtered) byOrder.set(i.order_id, [...(byOrder.get(i.order_id) ?? []), i]);
    return [...byOrder.entries()]
      .map(([orderId, items]): Ticket => ({
        orderId,
        tableId: items[0].table_id,
        guestId: items[0].guest_id,
        createdAt: items[0].created_at,
        items,
        stage: items.some((i) => i.status === "pending") ? "new" : items.some((i) => i.status === "preparing") ? "preparing" : "ready",
      }))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, [data, station]);

  async function setStatus(items: OrderItem[], status: "pending" | "preparing" | "ready") {
    const now = new Date().toISOString();
    const patch =
      status === "preparing" ? { status, started_at: now } : status === "ready" ? { status, ready_at: now } : { status, ready_at: null, started_at: null };
    // Atualização otimista: a tela responde na hora, o realtime confirma depois.
    setData((d) => d && { ...d, items: d.items.map((i) => (items.some((x) => x.id === i.id) ? { ...i, ...patch } : i)) });
    await supabase.from("order_items").update(patch).in("id", items.map((i) => i.id));
    if (status === "ready" && features.push) notifyReady(items.map((i) => i.id)).catch(() => {});
  }

  if (!data) {
    return (
      <div className="flex flex-1 items-center justify-center text-brand-fg">
        <Spinner className="size-8" />
      </div>
    );
  }

  async function toggleSoldOut(item: KitchenMenuItem) {
    setMenuState((list) => list.map((m) => (m.id === item.id ? { ...m, available: !m.available } : m)));
    const result = await setAvailability(item.id, !item.available);
    if (!result.ok) setMenuState((list) => list.map((m) => (m.id === item.id ? { ...m, available: item.available } : m)));
  }

  // Totais por prato (para produzir em lote): itens ainda não prontos da estação.
  const totals = new Map<string, number>();
  for (const t of tickets) for (const i of t.items) if (i.status !== "ready") totals.set(i.name, (totals.get(i.name) ?? 0) + i.qty);

  const columns: { stage: Ticket["stage"]; title: string; icon: React.ReactNode; accent: string }[] = [
    { stage: "new", title: "Novos", icon: <ChefHat className="size-5" />, accent: "text-amber-700" },
    { stage: "preparing", title: "Em preparo", icon: <Flame className="size-5" />, accent: "text-sky-800" },
    { stage: "ready", title: "Prontos", icon: <Check className="size-5" />, accent: "text-emerald-700" },
  ];

  return (
    <div className="flex flex-1 flex-col">
      {(features.kitchen_soldout || features.kitchen_print) && (
        <div className="flex flex-wrap items-center justify-end gap-2 px-4 pt-3">
          {features.kitchen_print && (
            <label className="flex h-10 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-semibold">
              <input
                type="checkbox"
                checked={autoPrint}
                onChange={(e) => {
                  setAutoPrint(e.target.checked);
                  try {
                    localStorage.setItem("bm_autoprint", e.target.checked ? "1" : "0");
                  } catch {}
                }}
                className="accent-[var(--brand)]"
              />
              <Printer className="size-4" /> Imprimir novos pedidos
            </label>
          )}
          {features.kitchen_soldout && (
            <button onClick={() => setSoldOutOpen(true)} className="flex h-10 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-semibold transition hover:border-line-strong">
              <Ban className="size-4" /> Esgotados ({menuState.filter((m) => !m.available).length})
            </button>
          )}
        </div>
      )}

      {features.kitchen_totals && totals.size > 0 && (
        <div className="no-scrollbar mx-4 mt-3 flex gap-2 overflow-x-auto rounded-2xl border border-line bg-surface p-2">
          <span className="shrink-0 self-center px-1 text-xs font-bold text-muted">A produzir</span>
          {[...totals.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([name, qty]) => (
              <span key={name} className="shrink-0 rounded-xl bg-surface-2 px-3 py-1.5 text-sm font-bold tabular-nums">
                {qty}× {name}
              </span>
            ))}
        </div>
      )}

      {stations.length > 0 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pt-3">
          {[{ id: "all", name: "Todas as estações" }, ...stations].map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setStation(s.id);
                try {
                  localStorage.setItem("bm_station", s.id);
                } catch {}
              }}
              className={cn(
                "h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors",
                station === s.id ? "bg-brand text-on-brand" : "bg-surface-2 text-muted hover:text-ink",
              )}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      <div className="grid flex-1 gap-4 p-4 lg:grid-cols-3">
        {columns.map((col) => {
          const list = tickets.filter((t) => t.stage === col.stage);
          return (
            <section key={col.stage} className="flex min-h-0 flex-col rounded-[1.6rem] bg-surface-2/60 p-3">
              <h2 className={cn("mb-3 flex items-center gap-2 px-1 font-display text-xl font-semibold", col.accent)}>
                {col.icon} {col.title}
                <span className="ml-auto rounded-full bg-surface px-2.5 py-0.5 font-sans text-sm font-bold text-ink tabular-nums">{list.length}</span>
              </h2>
              <div className="space-y-3">
                {list.length === 0 && <p className="py-10 text-center text-sm text-muted">Nada por aqui</p>}
                {list.map((t) => (
                  <TicketCard
                    key={t.orderId}
                    ticket={t}
                    tableNumber={data.tables.get(t.tableId)}
                    guestName={data.guests.get(t.guestId)}
                    onSetStatus={setStatus}
                    onPrint={
                      features.kitchen_print
                        ? () => printTicket({ restaurantName, tableNumber: data.tables.get(t.tableId), guestName: data.guests.get(t.guestId), items: t.items })
                        : undefined
                    }
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <Sheet open={soldOutOpen} onClose={() => setSoldOutOpen(false)} title="Esgotados" wide>
        <p className="mb-3 text-sm text-muted">Toque para tirar ou devolver um prato ao cardápio. Muda na hora para os clientes.</p>
        <div className="grid gap-1 sm:grid-cols-2">
          {menuState.map((m) => (
            <button
              key={m.id}
              onClick={() => toggleSoldOut(m)}
              className={cn(
                "flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm",
                m.available ? "hover:bg-stone-100" : "bg-red-50 text-red-700",
              )}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{m.name}</span>
                <span className="text-xs text-muted">{m.category}</span>
              </span>
              <span className="shrink-0 text-xs font-bold">{m.available ? "Disponível" : "ESGOTADO"}</span>
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  );
}

function TicketCard({
  ticket,
  tableNumber,
  guestName,
  onSetStatus,
  onPrint,
}: {
  ticket: Ticket;
  tableNumber?: number;
  guestName?: string;
  onSetStatus: (items: OrderItem[], status: "pending" | "preparing" | "ready") => void;
  onPrint?: () => void;
}) {
  const waited = minutesSince(ticket.createdAt);
  const late = ticket.stage !== "ready" && waited >= 20;
  const warn = ticket.stage !== "ready" && waited >= 10 && !late;
  const open = ticket.items.filter((i) => i.status !== "ready");

  return (
    <article
      className={cn(
        "overflow-hidden rounded-2xl border border-line bg-surface text-ink shadow-card animate-rise",
        late && "ring-4 ring-red-500",
        warn && "ring-4 ring-amber-400",
        ticket.stage === "ready" && "opacity-70",
      )}
    >
      <header className={cn("flex items-center justify-between px-4 py-2.5", late ? "bg-red-500 text-white" : warn ? "bg-amber-400 text-black" : "bg-surface-2")}>
        <div>
          <span className="font-display text-2xl font-semibold">Mesa {tableNumber ?? "?"}</span>
          <span className="ml-2 text-sm opacity-75">{guestName}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right text-sm leading-tight">
            <div className="font-bold">{formatElapsed(ticket.createdAt)}</div>
            <div className="opacity-70">{formatTime(ticket.createdAt)}</div>
          </div>
          {onPrint && (
            <button onClick={onPrint} className="rounded-lg p-1.5 opacity-70 hover:bg-black/10 hover:opacity-100" aria-label="Imprimir comanda" title="Imprimir comanda">
              <Printer className="size-5" />
            </button>
          )}
        </div>
      </header>

      <ul className="divide-y divide-line">
        {ticket.items.map((i) => {
          const done = i.status === "ready";
          return (
            <li key={i.id}>
              <button
                className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-surface-2"
                onClick={() => onSetStatus([i], done ? "preparing" : "ready")}
                title={done ? "Desmarcar" : "Marcar como pronto"}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border-2",
                    done ? "border-emerald-500 bg-emerald-500 text-white" : "border-line-strong",
                  )}
                >
                  {done && <Check className="size-4" />}
                </span>
                <span className={cn("min-w-0 flex-1", done && "text-muted line-through")}>
                  <span className="text-lg font-bold">
                    {i.qty}× {i.name}
                  </span>
                  {i.options.length > 0 && <span className="block text-sm text-muted">+ {i.options.map((o) => o.name).join(", ")}</span>}
                  {i.combo_items?.length > 0 && (
                    <span className="block text-sm text-muted">Combo: {i.combo_items.map((c) => `${c.qty * i.qty}× ${c.name}`).join(" + ")}</span>
                  )}
                  {i.note && (
                    <span className="mt-1 block rounded-lg bg-amber-100 px-2 py-1 text-sm font-semibold text-amber-900">⚠ {i.note}</span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <footer className="border-t border-line p-3">
        {ticket.stage === "new" && (
          <Button size="lg" className="w-full bg-sky-600 text-white hover:bg-sky-700" onClick={() => onSetStatus(ticket.items.filter((i) => i.status === "pending"), "preparing")}>
            <Flame className="size-4" /> Iniciar preparo
          </Button>
        )}
        {ticket.stage === "preparing" && (
          <Button variant="success" size="lg" className="w-full" onClick={() => onSetStatus(open, "ready")}>
            <Check className="size-4" /> Tudo pronto
          </Button>
        )}
        {ticket.stage === "ready" && (
          <Button variant="ghost" size="sm" className="w-full" onClick={() => onSetStatus(ticket.items, "preparing")}>
            <RotateCcw className="size-4" /> Voltar para preparo
          </Button>
        )}
      </footer>
    </article>
  );
}
