"use client";

import {
  ArrowRightLeft,
  Bell,
  Check,
  CheckCircle2,
  Circle,
  Gift,
  MoveRight,
  Plus,
  Receipt,
  Users,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, cn, Sheet, Spinner } from "@/components/ui";
import { playCall, playChime } from "@/lib/alerts";
import { computeBill, itemTotal } from "@/lib/bill";
import type { Features } from "@/lib/features";
import { loadFloor, type FloorData } from "@/lib/floor";
import { useRestaurantLive } from "@/lib/live";
import { formatBRL, parseBRL } from "@/lib/money";
import { STATUS_CLASS } from "@/lib/status-style";
import { createClient } from "@/lib/supabase/client";
import { formatElapsed } from "@/lib/time";
import { PAYMENT_LABEL, STATUS_LABEL, type OrderItem, type PaymentMethod, type Sector, type StaffRole, type Table } from "@/lib/types";
import { cancelItem, markPaid, moveItem, setDiscount, transferTable } from "./actions";
import { OrderComposer, type StaffMenu } from "./order-composer";
import { PushToggle } from "./push-toggle";

interface Props {
  restaurantId: string;
  serviceFeePct: number;
  userId: string;
  role: StaffRole | null;
  features: Features;
  menu: StaffMenu;
  sectors: Sector[];
  mySectorId: string | null;
}

export function WaiterApp({ restaurantId, serviceFeePct, userId, role, features, menu, sectors, mySectorId }: Props) {
  const supabase = createClient();
  const [floor, setFloor] = useState<FloorData | null>(null);
  const [openTableId, setOpenTableId] = useState<string | null>(null);
  const [composeFor, setComposeFor] = useState<string | null>(null);
  const [sectorFilter, setSectorFilter] = useState<string>(features.sectors && mySectorId ? mySectorId : "all");
  const [toast, setToast] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const seen = useRef<{ calls: Set<string>; ready: Set<string> } | null>(null);
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sectorRef = useRef(sectorFilter);
  useEffect(() => {
    sectorRef.current = sectorFilter;
  }, [sectorFilter]);

  const reload = useCallback(async () => {
    const data = await loadFloor(supabase, restaurantId);
    // Alertas só das mesas do setor que o garçom está vendo.
    const inSector = (tableId: string) =>
      sectorRef.current === "all" || data.tables.find((t) => t.id === tableId)?.sector_id === sectorRef.current;
    const calls = new Set(data.calls.filter((c) => inSector(c.table_id)).map((c) => c.id));
    const ready = new Set(data.items.filter((i) => i.status === "ready" && inSector(i.table_id)).map((i) => i.id));
    if (seen.current) {
      if ([...calls].some((id) => !seen.current!.calls.has(id))) playCall();
      else if ([...ready].some((id) => !seen.current!.ready.has(id))) playChime();
    }
    seen.current = { calls, ready };
    setFloor(data);
  }, [supabase, restaurantId]);

  const scheduleReload = useCallback(() => {
    if (reloadTimer.current) clearTimeout(reloadTimer.current);
    reloadTimer.current = setTimeout(reload, 250);
  }, [reload]);

  useRestaurantLive(restaurantId, ["table_sessions", "guests", "order_items", "waiter_calls"], scheduleReload, reload);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  const view = useMemo(() => (floor ? buildView(floor, serviceFeePct) : null), [floor, serviceFeePct]);

  const patch = useCallback((fn: (f: FloorData) => FloorData) => {
    setFloor((f) => {
      if (!f) return f;
      const next = fn(f);
      // Mantém a referência de alertas em dia, para não tocar som pelo que o próprio garçom fez.
      if (seen.current) seen.current.calls = new Set(next.calls.map((c) => c.id));
      return next;
    });
  }, []);

  if (!floor || !view) {
    return (
      <div className="flex flex-1 items-center justify-center text-brand-fg">
        <Spinner className="size-8" />
      </div>
    );
  }

  const tableById = new Map(floor.tables.map((t) => [t.id, t]));
  const inSector = (tableId: string) => sectorFilter === "all" || tableById.get(tableId)?.sector_id === sectorFilter;
  const tableNumber = (id: string) => tableById.get(id)?.number ?? "?";
  const guestName = (id: string | null) => floor.guests.find((g) => g.id === id)?.name ?? "";

  // Atualizações otimistas: a tela muda na hora; o banco e o realtime confirmam depois.
  async function resolveCall(id: string) {
    patch((f) => ({ ...f, calls: f.calls.filter((c) => c.id !== id) }));
    await supabase.from("waiter_calls").update({ status: "done", resolved_at: new Date().toISOString(), resolved_by: userId }).eq("id", id);
  }

  async function deliver(ids: string[]) {
    const now = new Date().toISOString();
    patch((f) => ({ ...f, items: f.items.map((i) => (ids.includes(i.id) ? { ...i, status: "delivered", delivered_at: now } : i)) }));
    await supabase.from("order_items").update({ status: "delivered", delivered_at: now }).in("id", ids);
  }

  const calls = floor.calls.filter((c) => inSector(c.table_id));
  const readyItems = floor.items.filter((i) => i.status === "ready" && inSector(i.table_id));
  const tables = floor.tables.filter((t) => inSector(t.id));
  const composeTable = composeFor ? tableById.get(composeFor) : null;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4">
      {features.push && <PushToggle />}
      {features.sectors && sectors.length > 0 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {[{ id: "all", name: "Todas as mesas" }, ...sectors].map((s) => (
            <button
              key={s.id}
              onClick={() => setSectorFilter(s.id)}
              className={cn(
                "h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors",
                sectorFilter === s.id ? "bg-ink text-canvas" : "bg-surface text-muted ring-1 ring-line",
              )}
            >
              {s.name}
              {s.id === mySectorId && " (meu)"}
            </button>
          ))}
        </div>
      )}

      {(calls.length > 0 || readyItems.length > 0) && (
        <section className="grid gap-3 md:grid-cols-2">
          {calls.map((c) => (
            <div key={c.id} className="flex animate-ring flex-wrap items-center gap-3 rounded-2xl border-2 border-red-500 bg-red-50 p-4">
              <div className="shrink-0 rounded-full bg-red-500 p-2.5 text-white">
                {c.type === "bill" ? <Receipt className="size-5" /> : <Bell className="size-5" />}
              </div>
              <div className="min-w-[10rem] flex-1">
                <div className="font-bold">
                  Mesa {tableNumber(c.table_id)} · {c.type === "bill" ? "Pediu a conta" : "Chamou o garçom"}
                </div>
                <div className="text-sm text-muted">
                  {guestName(c.guest_id)} · {formatElapsed(c.created_at) === "agora" ? "agora" : `há ${formatElapsed(c.created_at)}`}
                </div>
              </div>
              {c.type === "bill" && (
                <Button size="sm" variant="secondary" onClick={() => setOpenTableId(c.table_id)}>
                  Conta
                </Button>
              )}
              <Button size="sm" variant="danger" onClick={() => resolveCall(c.id)}>
                <Check className="size-4" /> Atendido
              </Button>
            </div>
          ))}
          {groupBy(readyItems, (i) => i.table_id).map(([tableId, items]) => (
            <div key={tableId} className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-emerald-500 bg-emerald-50 p-4">
              <div className="shrink-0 rounded-full bg-emerald-500 p-2.5 text-white">
                <UtensilsCrossed className="size-5" />
              </div>
              <div className="min-w-[10rem] flex-1">
                <div className="font-bold">Mesa {tableNumber(tableId)} · Pronto para servir</div>
                <div className="text-sm text-muted">{items.map((i) => `${i.qty}× ${i.name} (${guestName(i.guest_id)})`).join(" · ")}</div>
              </div>
              <Button size="sm" variant="success" onClick={() => deliver(items.map((i) => i.id))}>
                <Check className="size-4" /> Entregue
              </Button>
            </div>
          ))}
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold">Mesas</h2>
          <div className="flex gap-3 text-xs text-muted">
            <Legend className="bg-surface ring-1 ring-line" label="Livre" />
            <Legend className="bg-brand" label="Ocupada" />
            <Legend className="bg-red-500" label="Chamando" />
          </div>
        </div>
        {tables.length === 0 ? (
          <p className="rounded-2xl bg-surface p-8 text-center text-muted">Nenhuma mesa {sectorFilter === "all" ? "cadastrada" : "neste setor"}.</p>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {tables.map((t) => {
              const v = view.byTable.get(t.id);
              const calling = floor.calls.some((c) => c.table_id === t.id);
              const canOpen = !!v || features.waiter_ordering;
              return (
                <button
                  key={t.id}
                  onClick={() => (v ? setOpenTableId(t.id) : features.waiter_ordering && setComposeFor(t.id))}
                  disabled={!canOpen}
                  className={cn(
                    "flex aspect-square flex-col items-center justify-center gap-1 rounded-[1.4rem] p-2 text-center transition-transform duration-200 hover:-translate-y-0.5 active:scale-95",
                    !v && "bg-surface text-muted ring-1 ring-line",
                    v && !calling && "bg-brand text-on-brand shadow-md",
                    calling && "animate-ring bg-red-500 text-white shadow-md",
                  )}
                >
                  <span className="font-display text-4xl leading-none font-semibold">{t.number}</span>
                  {v ? (
                    <>
                      <span className="text-sm font-semibold">{formatBRL(v.bill.totalCents)}</span>
                      <span className="mt-0.5 flex items-center gap-1 text-xs opacity-80">
                        <Users className="size-3" /> {v.guests} · {formatElapsed(v.session.opened_at)}
                      </span>
                    </>
                  ) : (
                    <span className="flex items-center gap-1 text-xs">
                      {features.waiter_ordering ? (
                        <>
                          <Plus className="size-3" /> Abrir
                        </>
                      ) : (
                        "Livre"
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <TableSheet
        table={openTableId ? (tableById.get(openTableId) ?? null) : null}
        tables={floor.tables}
        floor={floor}
        view={openTableId ? view.byTable.get(openTableId) : undefined}
        userId={userId}
        role={role}
        features={features}
        onClose={() => setOpenTableId(null)}
        onPatch={patch}
        onCompose={(tableId) => {
          setOpenTableId(null);
          setComposeFor(tableId);
        }}
        onToast={setToast}
        onReload={reload}
      />

      {composeTable && (
        <OrderComposer
          key={composeTable.id}
          tableId={composeTable.id}
          tableNumber={composeTable.number}
          guests={floor.guests
            .filter((g) => g.session_id === view.byTable.get(composeTable.id)?.session.id)
            .map((g) => ({ id: g.id, name: g.name }))}
          menu={menu}
          features={features}
          onClose={() => setComposeFor(null)}
          onSent={(msg) => {
            setComposeFor(null);
            setToast(msg);
            reload();
          }}
        />
      )}

      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4">
          <div className="animate-slide-up rounded-full bg-ink px-5 py-3 text-sm font-medium text-canvas shadow-xl">{toast}</div>
        </div>
      )}
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("size-3 rounded", className)} /> {label}
    </span>
  );
}

function groupBy<T>(list: T[], key: (t: T) => string): [string, T[]][] {
  const map = new Map<string, T[]>();
  for (const item of list) map.set(key(item), [...(map.get(key(item)) ?? []), item]);
  return [...map.entries()];
}

type TableView = ReturnType<typeof buildView>["byTable"] extends Map<string, infer V> ? V : never;

function buildView(floor: FloorData, serviceFeePct: number) {
  const byTable = new Map<
    string,
    { session: FloorData["sessions"][number]; guests: number; items: OrderItem[]; bill: ReturnType<typeof computeBill> }
  >();
  for (const session of floor.sessions) {
    const guests = floor.guests.filter((g) => g.session_id === session.id);
    const items = floor.items.filter((i) => i.session_id === session.id);
    byTable.set(session.table_id, {
      session,
      guests: guests.length,
      items,
      bill: computeBill(guests, items, floor.shares, serviceFeePct),
    });
  }
  return { byTable };
}

const METHODS: PaymentMethod[] = ["credito", "debito", "pix", "dinheiro"];

function TableSheet({
  table,
  tables,
  floor,
  view,
  userId,
  role,
  features,
  onClose,
  onPatch,
  onCompose,
  onToast,
  onReload,
}: {
  table: Table | null;
  tables: Table[];
  floor: FloorData;
  view: TableView | undefined;
  userId: string;
  role: StaffRole | null;
  features: Features;
  onClose: () => void;
  onPatch: (fn: (f: FloorData) => FloorData) => void;
  onCompose: (tableId: string) => void;
  onToast: (msg: string) => void;
  onReload: () => void;
}) {
  const supabase = createClient();
  const [tab, setTab] = useState<"bill" | "items">("bill");
  const [busy, setBusy] = useState(false);
  const [payFor, setPayFor] = useState<string | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [moving, setMoving] = useState<OrderItem | null>(null);
  if (!table || !view) return null;

  const isManager = role === "owner" || role === "manager";
  const sessionGuests = floor.guests.filter((g) => g.session_id === view.session.id);
  const names = new Map(floor.guests.map((g) => [g.id, g.name]));
  const pendingItems = view.items.filter((i) => ["pending", "preparing", "ready"].includes(i.status)).length;
  const allPaid = view.bill.guests.every((g) => g.guest.paid_at || g.totalCents === 0);

  const patchItem = (id: string, changes: Partial<OrderItem>) =>
    onPatch((f) => ({ ...f, items: f.items.map((i) => (i.id === id ? { ...i, ...changes } : i)) }));

  async function run(action: Promise<{ ok: boolean; error?: string }>, success?: string) {
    const result = await action;
    if (!result.ok) onToast(result.error ?? "Erro");
    else if (success) onToast(success);
    onReload();
  }

  async function pay(guestId: string, method: PaymentMethod | null) {
    setPayFor(null);
    const paid_at = method ? new Date().toISOString() : null;
    onPatch((f) => ({ ...f, guests: f.guests.map((g) => (g.id === guestId ? { ...g, paid_at, payment_method: method } : g)) }));
    await run(markPaid(guestId, method));
  }

  function togglePaid(guestId: string, paid: boolean) {
    if (!paid) return pay(guestId, null);
    if (features.payments) return setPayFor(guestId);
    return pay(guestId, "outro");
  }

  async function cancel(item: OrderItem) {
    const reason = window.prompt(`Cancelar "${item.name}"? Informe o motivo:`);
    if (reason === null) return;
    patchItem(item.id, { status: "cancelled", cancelled_at: new Date().toISOString(), cancel_reason: reason || "Sem motivo" });
    await run(cancelItem(item.id, reason));
  }

  async function deliverItem(item: OrderItem) {
    const changes = { status: "delivered" as const, delivered_at: new Date().toISOString() };
    patchItem(item.id, changes);
    await supabase.from("order_items").update(changes).eq("id", item.id);
  }

  async function discount(item: OrderItem) {
    const full = item.unit_price_cents * item.qty;
    const input = window.prompt(
      `Desconto em "${item.name}" (${formatBRL(full)}).\nDigite o valor em R$, "cortesia" para zerar, ou 0 para remover:`,
      item.discount_cents ? (item.discount_cents / 100).toFixed(2).replace(".", ",") : "",
    );
    if (input === null) return;
    const isComp = input.trim().toLowerCase().startsWith("cort");
    const cents = isComp ? full : parseBRL(input);
    const reason = cents ? (isComp ? "Cortesia" : window.prompt("Motivo do desconto:", "") || "Desconto") : "";
    patchItem(item.id, { discount_cents: Math.min(cents, full), discount_reason: reason || null });
    await run(setDiscount(item.id, cents, reason));
  }

  async function closeTable() {
    const warnings = [];
    if (pendingItems) warnings.push(`${pendingItems} item(ns) ainda não entregue(s)`);
    if (!allPaid) warnings.push("nem todos estão marcados como pagos");
    const msg =
      `Confirmar que a Mesa ${table!.number} pagou ${formatBRL(view!.bill.totalCents)} e liberar a mesa?` +
      (warnings.length ? `\n\nAtenção: ${warnings.join(" e ")}.` : "");
    if (!window.confirm(msg)) return;
    setBusy(true);
    const now = new Date().toISOString();
    const sessionId = view!.session.id;
    await Promise.all([
      supabase.from("waiter_calls").update({ status: "done", resolved_at: now, resolved_by: userId }).eq("session_id", sessionId).eq("status", "open"),
      supabase.from("table_sessions").update({ status: "closed", closed_at: now, closed_by: userId }).eq("id", sessionId),
    ]);
    setBusy(false);
    onClose();
    onPatch((f) => ({
      ...f,
      sessions: f.sessions.filter((s) => s.id !== sessionId),
      calls: f.calls.filter((c) => c.session_id !== sessionId),
      items: f.items.filter((i) => i.session_id !== sessionId),
    }));
  }

  async function transfer(toTableId: string) {
    setTransferOpen(false);
    const target = tables.find((t) => t.id === toTableId);
    const occupied = floor.sessions.some((s) => s.table_id === toTableId);
    if (occupied && !window.confirm(`A Mesa ${target?.number} está ocupada. Juntar as duas contas na Mesa ${target?.number}?`)) return;
    setBusy(true);
    const result = await transferTable(view!.session.id, toTableId);
    setBusy(false);
    if (!result.ok) return onToast(result.error);
    onToast(result.merged ? `Mesas juntadas na Mesa ${target?.number}` : `Mesa ${table!.number} transferida para a ${target?.number}`);
    onClose();
    onReload();
  }

  return (
    <Sheet
      open
      wide
      onClose={onClose}
      title={
        <span>
          Mesa {table.number}
          <span className="ml-2 text-sm font-normal text-muted">aberta há {formatElapsed(view.session.opened_at)}</span>
        </span>
      }
      footer={
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-muted">Total{view.bill.serviceFeePct > 0 && ` (com ${view.bill.serviceFeePct}% de serviço)`}</span>
            <span className="text-2xl font-extrabold">{formatBRL(view.bill.totalCents)}</span>
          </div>
          <Button variant="success" size="lg" className="w-full" disabled={busy} onClick={closeTable}>
            {busy ? (
              <Spinner />
            ) : (
              <>
                <CheckCircle2 className="size-5" /> Mesa paga · liberar mesa
              </>
            )}
          </Button>
        </div>
      }
    >
      {(features.waiter_ordering || features.table_transfer) && (
        <div className="mb-4 flex flex-wrap gap-2">
          {features.waiter_ordering && (
            <Button size="sm" onClick={() => onCompose(table.id)}>
              <Plus className="size-4" /> Lançar pedido
            </Button>
          )}
          {features.table_transfer && (
            <Button size="sm" variant="secondary" onClick={() => setTransferOpen(!transferOpen)}>
              <ArrowRightLeft className="size-4" /> Transferir / juntar
            </Button>
          )}
        </div>
      )}

      {transferOpen && (
        <div className="mb-4 rounded-2xl border border-line p-3">
          <div className="mb-2 text-sm font-semibold">Mover para qual mesa?</div>
          <div className="flex flex-wrap gap-2">
            {tables
              .filter((t) => t.id !== table.id)
              .map((t) => {
                const occupied = floor.sessions.some((s) => s.table_id === t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => transfer(t.id)}
                    className={cn(
                      "min-w-12 rounded-xl px-3 py-2 text-sm font-bold",
                      occupied ? "bg-brand-soft text-brand-fg" : "bg-stone-100 hover:bg-stone-200",
                    )}
                    title={occupied ? "Ocupada: as contas serão juntadas" : "Livre"}
                  >
                    {t.number}
                  </button>
                );
              })}
          </div>
          <p className="mt-2 text-xs text-muted">Mesas em laranja estão ocupadas: as duas contas serão juntadas.</p>
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 rounded-xl bg-stone-100 p-1">
        {(["bill", "items"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn("rounded-lg py-2 text-sm font-semibold", tab === t ? "bg-surface shadow-sm" : "text-muted")}>
            {t === "bill" ? "Divisão da conta" : `Itens (${view.items.length})`}
          </button>
        ))}
      </div>

      {tab === "bill" ? (
        <div className="space-y-3">
          {view.bill.guests.map((g) => {
            const guest = floor.guests.find((x) => x.id === g.guest.id);
            return (
              <div key={g.guest.id} className={cn("rounded-2xl border p-4", g.guest.paid_at ? "border-emerald-300 bg-emerald-50/50" : "border-line")}>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                  <div className="min-w-0 font-bold break-words">{g.guest.name}</div>
                  <div className="ml-auto flex items-center gap-3">
                    <span className="text-lg font-extrabold">{formatBRL(g.totalCents)}</span>
                    <button
                      onClick={() => togglePaid(g.guest.id, !g.guest.paid_at)}
                      className={cn(
                        "flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold",
                        g.guest.paid_at ? "bg-emerald-600 text-white" : "bg-stone-100 text-muted hover:bg-stone-200",
                      )}
                    >
                      {g.guest.paid_at ? <CheckCircle2 className="size-4" /> : <Circle className="size-4" />}
                      {g.guest.paid_at
                        ? features.payments && guest?.payment_method && guest.payment_method !== "outro"
                          ? `Pago · ${PAYMENT_LABEL[guest.payment_method]}`
                          : "Pago"
                        : "Marcar pago"}
                    </button>
                  </div>
                </div>
                {payFor === g.guest.id && (
                  <div className="mt-3 flex flex-wrap gap-2 rounded-xl bg-canvas p-2">
                    <span className="w-full text-xs font-semibold text-muted">Forma de pagamento</span>
                    {METHODS.map((m) => (
                      <button key={m} onClick={() => pay(g.guest.id, m)} className="rounded-lg bg-surface px-3 py-1.5 text-sm font-semibold shadow-sm hover:text-brand-fg">
                        {PAYMENT_LABEL[m]}
                      </button>
                    ))}
                  </div>
                )}
                <div className="mt-2 space-y-0.5 text-sm">
                  {g.lines.map((l) => (
                    <div key={l.itemId} className="flex justify-between gap-3 text-muted">
                      <span>
                        {l.qty}× {l.name}
                        {l.splitCount > 1 && ` (÷${l.splitCount})`}
                      </span>
                      <span>{formatBRL(l.amountCents)}</span>
                    </div>
                  ))}
                  {view.bill.serviceFeePct > 0 && g.serviceCents > 0 && (
                    <div className="flex justify-between text-muted">
                      <span>Serviço {view.bill.serviceFeePct}%</span>
                      <span>{formatBRL(g.serviceCents)}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="divide-y divide-line">
          {view.items.map((i) => (
            <div key={i.id} className="py-3">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className={cn("font-semibold", i.status === "cancelled" && "text-muted line-through")}>
                    {i.qty}× {i.name}
                  </div>
                  {i.options.length > 0 && <div className="text-sm text-muted">+ {i.options.map((o) => o.name).join(", ")}</div>}
                  {i.note && <div className="text-sm text-amber-700">“{i.note}”</div>}
                  <div className="text-xs text-muted">
                    {names.get(i.guest_id)} · {formatBRL(itemTotal(i))}
                    {i.discount_cents > 0 && <span className="text-emerald-700"> ({i.discount_reason ?? "desconto"} −{formatBRL(i.discount_cents)})</span>}
                    {i.share_mode === "all" && " · dividido com todos"}
                    {i.share_mode === "custom" &&
                      ` · dividido: ${floor.shares.filter((s) => s.order_item_id === i.id).map((s) => names.get(s.guest_id)).join(", ")}`}
                    {i.created_by && " · lançado pelo garçom"}
                    {i.cancel_reason && ` · motivo: ${i.cancel_reason}`}
                  </div>
                </div>
                <Badge className={STATUS_CLASS[i.status]}>{STATUS_LABEL[i.status]}</Badge>
              </div>
              {i.status !== "cancelled" && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {i.status === "ready" && (
                    <ItemAction onClick={() => deliverItem(i)} icon={<Check className="size-3.5" />} label="Entregue" />
                  )}
                  {features.move_items && i.share_mode === "me" && sessionGuests.length > 1 && (
                    <ItemAction onClick={() => setMoving(moving?.id === i.id ? null : i)} icon={<MoveRight className="size-3.5" />} label="Mover" />
                  )}
                  {features.discounts && isManager && (
                    <ItemAction onClick={() => discount(i)} icon={<Gift className="size-3.5" />} label="Desconto" />
                  )}
                  <ItemAction onClick={() => cancel(i)} icon={<X className="size-3.5" />} label="Cancelar" danger />
                </div>
              )}
              {moving?.id === i.id && (
                <div className="mt-2 flex flex-wrap gap-2 rounded-xl bg-canvas p-2">
                  <span className="w-full text-xs font-semibold text-muted">Passar para:</span>
                  {sessionGuests
                    .filter((g) => g.id !== i.guest_id)
                    .map((g) => (
                      <button
                        key={g.id}
                        className="rounded-lg bg-surface px-3 py-1.5 text-sm font-semibold shadow-sm hover:text-brand-fg"
                        onClick={() => {
                          setMoving(null);
                          patchItem(i.id, { guest_id: g.id });
                          run(moveItem(i.id, g.id), `${i.name} passou para ${g.name}`);
                        }}
                      >
                        {g.name}
                      </button>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Sheet>
  );
}

function ItemAction({ onClick, icon, label, danger }: { onClick: () => void; icon: React.ReactNode; label: string; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-muted hover:bg-stone-100",
        danger ? "hover:text-red-600 dark:hover:text-red-400" : "hover:text-ink",
      )}
    >
      {icon} {label}
    </button>
  );
}
