"use client";

import {
  Bell,
  Check,
  ChefHat,
  ClipboardList,
  Clock,
  Flame,
  Minus,
  Plus,
  Receipt,
  RotateCcw,
  Search,
  ShoppingBag,
  Sparkles,
  Star,
  Trash2,
  Users,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { PoweredBy, RestaurantLogo } from "@/components/brand";
import { ThemeToggle } from "@/components/theme";
import { Badge, Button, cn, inputClass, Segmented, Sheet, Spinner } from "@/components/ui";
import type { Features } from "@/lib/features";
import { formatBRL } from "@/lib/money";
import type { PublicMenu, PublicMenuItem, PublicState, SessionState } from "@/lib/public-table";
import { DICTS, detectLang, tr, type Dict, type Lang } from "./i18n";

type Share = "me" | "all" | string[];

interface CartLine {
  key: string;
  menuItemId: string;
  name: string;
  qty: number;
  optionIds: string[];
  optionNames: string[];
  unitPrice: number;
  note: string;
  share: Share;
}

type Tab = "menu" | "orders" | "bill";

/** Chamadas ao servidor da mesa. No modo demonstração, são simuladas no navegador. */
export type TableApi = (
  action: "state" | "join" | "order" | "call" | "cancel" | "rate",
  body?: unknown,
) => Promise<{ ok: boolean; data: Record<string, unknown> }>;

export interface CustomerRestaurant {
  name: string;
  logoUrl: string | null;
  serviceFeePct: number;
  coverUrl?: string | null;
  tagline?: string | null;
}

interface Props {
  token: string;
  tableNumber: number;
  restaurant: CustomerRestaurant;
  menu: PublicMenu;
  features: Features;
  initialState: PublicState;
  api?: TableApi;
}

interface Ctx {
  t: Dict;
  lang: Lang;
  features: Features;
  setLang?: (l: Lang) => void;
}
const AppCtx = createContext<Ctx>(null!);
const useApp = () => useContext(AppCtx);

function httpApi(token: string): TableApi {
  return async (action, body) => {
    const res = await fetch(
      `/api/m/${token}/${action}`,
      body === undefined ? { cache: "no-store" } : { method: "POST", body: JSON.stringify(body) },
    );
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  };
}

const reduceMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function CustomerApp({ token, tableNumber, restaurant, menu, features, initialState, api: apiOverride }: Props) {
  const api = useMemo(() => apiOverride ?? httpApi(token), [apiOverride, token]);
  const [data, setData] = useState<PublicState>(initialState);
  const [tab, setTab] = useState<Tab>("menu");
  const [cart, setCart] = useCart(token);
  const [selected, setSelected] = useState<PublicMenuItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cancelling, setCancelling] = useState<SessionState["items"][number] | null>(null);
  const [rejoin, setRejoin] = useState(false);
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const [sent, setSent] = useState(false);
  const [lang, setLangState] = useState<Lang>("pt");
  const cartButton = useRef<HTMLButtonElement>(null);

  // Idioma: lido depois da hidratação (o servidor sempre renderiza em português).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (features.languages) setLangState(detectLang());
  }, [features.languages]);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("bm_lang", l);
    } catch {}
  }, []);
  const t = DICTS[lang];
  const ctx = useMemo(() => ({ t, lang, features, setLang: features.languages ? setLang : undefined }), [t, lang, features, setLang]);

  const allItems = useMemo(() => menu.categories.flatMap((c) => c.items), [menu]);
  const notify = useCallback((text: string) => setToast({ id: Date.now(), text }), []);

  const refresh = useCallback(async () => {
    const res = await api("state");
    if (res.ok) setData(res.data as unknown as PublicState);
  }, [api]);

  // Estado inicial vem do servidor; depois atualiza a cada 4s (pedidos, status, conta).
  useEffect(() => {
    const id = setInterval(() => document.visibilityState === "visible" && refresh(), 4000);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(id);
  }, [toast]);

  const state = data?.joined ? data.state : null;
  const cartCount = cart.reduce((n, l) => n + l.qty, 0);
  const cartTotal = cart.reduce((n, l) => n + l.qty * l.unitPrice, 0);

  if (!data.joined || rejoin) {
    return (
      <AppCtx.Provider value={ctx}>
        <JoinScreen
          api={api}
          tableNumber={tableNumber}
          restaurant={restaurant}
          menu={menu}
          others={data.joined ? [] : data.guests}
          onJoined={async () => {
            setRejoin(false);
            await refresh();
          }}
        />
      </AppCtx.Provider>
    );
  }

  if (data.closed) {
    return (
      <AppCtx.Provider value={ctx}>
        <ClosedScreen api={api} restaurant={restaurant} state={data.state} onNewVisit={() => setRejoin(true)} onRated={refresh} />
      </AppCtx.Provider>
    );
  }

  const me = state!.guests.find((g) => g.id === state!.meId);
  const others = state!.guests.filter((g) => g.id !== state!.meId);
  const activeCalls = new Set(state!.openCalls.map((c) => c.type));
  const myActiveItems = state!.items.filter(
    (i) => i.guest_id === state!.meId && (i.status === "pending" || i.status === "preparing" || i.status === "ready"),
  ).length;
  const canCall = features.call_waiter || features.request_bill;

  async function call(type: "waiter" | "bill") {
    const res = await api("call", { type });
    setCallOpen(false);
    if (!res.ok) return notify(String(res.data.error ?? "Erro"));
    notify(res.data.already ? t.waiterNotified : type === "bill" ? t.billRequested : t.waiterOnWay);
    refresh();
  }

  function goTab(next: Tab) {
    setTab(next);
    window.scrollTo({ top: 0, behavior: reduceMotion() ? "auto" : "smooth" });
  }

  /** Prato sem adicionais entra direto no carrinho, com uma bolinha "voando" até o botão do pedido. */
  function quickAdd(item: PublicMenuItem, from?: HTMLElement) {
    if (item.options.length > 0 || !features.customer_ordering) return setSelected(item);
    const { name } = tr(lang, item);
    setCart([
      ...cart,
      { key: crypto.randomUUID(), menuItemId: item.id, name, qty: 1, optionIds: [], optionNames: [], unitPrice: item.price_cents, note: "", share: "me" },
    ]);
    fly(from, cartButton.current);
    notify(`${name} ${t.added}`);
  }

  /** "Pedir de novo": recoloca o item no carrinho com os mesmos adicionais e observação. */
  function reorder(item: SessionState["items"][number]) {
    const menuItem = allItems.find((m) => m.id === item.menu_item_id);
    if (!menuItem || !menuItem.available) return notify(t.soldOut);
    const optionIds = menuItem.options.filter((o) => item.options.some((x) => x.name === o.name)).map((o) => o.id);
    const unitPrice = menuItem.price_cents + menuItem.options.filter((o) => optionIds.includes(o.id)).reduce((s, o) => s + o.price_cents, 0);
    setCart([
      ...cart,
      {
        key: crypto.randomUUID(),
        menuItemId: menuItem.id,
        name: menuItem.name,
        qty: item.qty,
        optionIds,
        optionNames: menuItem.options.filter((o) => optionIds.includes(o.id)).map((o) => o.name),
        unitPrice,
        note: item.note ?? "",
        share: item.share_mode === "all" ? "all" : item.share_mode === "custom" ? item.share_guest_ids.filter((id) => id !== state!.meId) : "me",
      },
    ]);
    setTab("menu");
    setCartOpen(true);
  }

  async function cancelItem(item: SessionState["items"][number]) {
    setCancelling(null);
    const res = await api("cancel", { item_id: item.id });
    notify(res.ok ? t.cancelled : String(res.data.error ?? "Erro"));
    refresh();
  }

  return (
    <AppCtx.Provider value={ctx}>
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col pb-44">
        {tab === "menu" ? (
          <MenuTab
            restaurant={restaurant}
            tableNumber={tableNumber}
            meName={me?.name}
            guestCount={state!.guests.length}
            menu={menu}
            canCall={canCall}
            called={activeCalls.size > 0}
            onCall={() => setCallOpen(true)}
            onSearch={() => setSearchOpen(true)}
            onSelect={setSelected}
            onQuickAdd={quickAdd}
          />
        ) : (
          <CompactHeader restaurant={restaurant} tableNumber={tableNumber} canCall={canCall} called={activeCalls.size > 0} onCall={() => setCallOpen(true)} />
        )}

        {tab === "orders" && <OrdersTab state={state!} onReorder={reorder} onCancel={setCancelling} />}
        {tab === "bill" && features.bill_view && (
          <BillTab
            state={state!}
            tableNumber={tableNumber}
            onRequestBill={features.request_bill ? () => call("bill") : undefined}
            billRequested={activeCalls.has("bill")}
          />
        )}

        <PoweredBy className="mx-auto mt-14" />

        {/* Barra do carrinho */}
        <div
          className={cn(
            "fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-xl px-4 transition-all duration-500 ease-out-expo",
            cartCount > 0 && tab === "menu" && features.customer_ordering ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0",
          )}
        >
          <button
            ref={cartButton}
            onClick={() => setCartOpen(true)}
            className="flex h-16 w-full items-center gap-3 rounded-[1.4rem] bg-brand pr-5 pl-2.5 text-on-brand shadow-float transition-transform active:scale-[0.98]"
          >
            <span key={cartCount} className="flex size-11 items-center justify-center rounded-2xl bg-black/15 text-base font-bold animate-pop">
              {cartCount}
            </span>
            <span className="flex-1 text-left">
              <span className="block text-[0.95rem] leading-tight font-bold">{t.viewOrder}</span>
              <span className="block text-xs opacity-80">
                {cartCount} {cartCount === 1 ? t.item : t.items}
              </span>
            </span>
            <span className="text-lg font-bold tabular-nums">{formatBRL(cartTotal)}</span>
          </button>
        </div>

        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl backdrop-saturate-150">
          <div className={cn("mx-auto grid max-w-xl px-2", features.bill_view ? "grid-cols-3" : "grid-cols-2")}>
            <NavButton active={tab === "menu"} onClick={() => goTab("menu")} icon={<UtensilsCrossed />} label={t.menu} />
            <NavButton active={tab === "orders"} onClick={() => goTab("orders")} icon={<ClipboardList />} label={t.orders} badge={myActiveItems || undefined} />
            {features.bill_view && <NavButton active={tab === "bill"} onClick={() => goTab("bill")} icon={<Receipt />} label={t.bill} />}
          </div>
        </nav>

        {selected && (
          <ItemSheet
            key={selected.id}
            item={selected}
            allItems={allItems}
            others={others}
            canOrder={features.customer_ordering}
            onSelect={setSelected}
            onClose={() => setSelected(null)}
            onAdd={(line) => {
              setCart([...cart, line]);
              setSelected(null);
              notify(`${line.name} ${t.added}`);
            }}
          />
        )}

        <SearchSheet open={searchOpen} menu={menu} onClose={() => setSearchOpen(false)} onSelect={(i) => setSelected(i)} />

        <CartSheet
          open={cartOpen && features.customer_ordering}
          cart={cart}
          allItems={allItems}
          guests={state!.guests}
          api={api}
          onClose={() => setCartOpen(false)}
          onChange={setCart}
          onConfirmed={() => {
            setCart([]);
            setCartOpen(false);
            setSent(true);
            goTab("orders");
            refresh();
          }}
          onError={notify}
        />

        <Sheet open={callOpen} onClose={() => setCallOpen(false)} title={t.howHelp}>
          <div className="grid gap-3 pt-1">
            {features.call_waiter && (
              <CallOption
                icon={<Bell className="size-6" />}
                title={t.callWaiter}
                hint={activeCalls.has("waiter") ? t.alreadyCalled : t.waiterComing}
                active={activeCalls.has("waiter")}
                onClick={() => call("waiter")}
              />
            )}
            {features.request_bill && (
              <CallOption
                icon={<Receipt className="size-6" />}
                title={t.askBill}
                hint={activeCalls.has("bill") ? t.billAlready : t.billComing}
                active={activeCalls.has("bill")}
                onClick={() => call("bill")}
              />
            )}
          </div>
        </Sheet>

        <Sheet open={!!cancelling} onClose={() => setCancelling(null)} title={cancelling ? t.cancelConfirm(cancelling.name) : ""}>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" size="lg" className="flex-1" onClick={() => setCancelling(null)} aria-label="Voltar">
              <X className="size-5" />
            </Button>
            <Button variant="danger" size="lg" className="flex-[2]" onClick={() => cancelling && cancelItem(cancelling)}>
              {t.cancel}
            </Button>
          </div>
        </Sheet>

        {sent && <OrderSentOverlay onDone={() => setSent(false)} />}

        {toast && (
          <div className="pointer-events-none fixed inset-x-0 top-[max(1rem,env(safe-area-inset-top))] z-[60] flex justify-center px-4" role="status">
            <div
              key={toast.id}
              className="flex max-w-full items-center gap-2 rounded-full bg-ink py-2.5 pr-5 pl-2.5 text-sm font-semibold text-canvas shadow-float animate-slide-up"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand text-on-brand">
                <Check className="size-3.5" strokeWidth={3} />
              </span>
              <span className="truncate">{toast.text}</span>
            </div>
          </div>
        )}
      </div>
    </AppCtx.Provider>
  );
}

/** Bolinha na cor da marca que voa do botão "+" até a barra do carrinho. */
function fly(from?: HTMLElement | null, to?: HTMLElement | null) {
  if (!from || reduceMotion()) return;
  const a = from.getBoundingClientRect();
  const b = to?.getBoundingClientRect();
  const endX = b && b.width ? b.left + 32 : window.innerWidth / 2;
  const endY = b && b.width ? b.top + 32 : window.innerHeight - 120;
  const dot = document.createElement("div");
  dot.style.cssText = `position:fixed;z-index:70;left:${a.left + a.width / 2 - 10}px;top:${a.top + a.height / 2 - 10}px;width:20px;height:20px;border-radius:9999px;background:var(--brand);box-shadow:0 6px 20px var(--brand-glow);pointer-events:none`;
  document.body.appendChild(dot);
  const dx = endX - (a.left + a.width / 2);
  const dy = endY - (a.top + a.height / 2);
  dot
    .animate(
      [
        { transform: "translate(0,0) scale(1)", opacity: 1 },
        { transform: `translate(${dx * 0.55}px, ${dy * 0.25 - 90}px) scale(1.15)`, opacity: 1, offset: 0.45 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.4)`, opacity: 0.2 },
      ],
      { duration: 650, easing: "cubic-bezier(0.5, 0, 0.3, 1)" },
    )
    .finished.finally(() => dot.remove());
}

// ---------------------------------------------------------------------------

function useCart(token: string) {
  const key = `bm_cart_${token}`;
  const [cart, setCartState] = useState<CartLine[]>([]);

  // O carrinho sobrevive a um refresh da página. Lido depois da hidratação,
  // pois o HTML do servidor não conhece o localStorage.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setCartState(JSON.parse(saved));
    } catch {}
  }, [key]);

  const setCart = useCallback(
    (next: CartLine[]) => {
      setCartState(next);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {}
    },
    [key],
  );
  return [cart, setCart] as const;
}

const LANGS: { value: Lang; label: string }[] = [
  { value: "pt", label: "PT" },
  { value: "en", label: "EN" },
  { value: "es", label: "ES" },
];

function LangSwitch({ className }: { className?: string }) {
  const { lang, setLang } = useApp();
  if (!setLang) return null;
  return (
    <label className={cn("relative inline-flex h-10 items-center rounded-full", className)}>
      <span className="sr-only">Idioma / Language</span>
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as Lang)}
        className="h-full cursor-pointer appearance-none rounded-full bg-transparent px-3.5 text-xs font-bold tracking-wide outline-none"
      >
        {LANGS.map((l) => (
          <option key={l.value} value={l.value} className="text-black">
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function CallOption({ icon, title, hint, active, onClick }: { icon: React.ReactNode; title: string; hint: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex items-center gap-4 rounded-2xl border p-4 text-left transition-all active:scale-[0.98]",
        active ? "border-brand/40 bg-brand-soft" : "border-line hover:border-brand/50 hover:bg-surface-2",
      )}
    >
      <span className={cn("relative rounded-2xl p-3", active ? "bg-brand text-on-brand animate-pulse-dot" : "bg-brand-soft text-brand-fg")}>{icon}</span>
      <span>
        <span className="block font-bold">{title}</span>
        <span className="text-sm text-muted">{hint}</span>
      </span>
    </button>
  );
}

function NavButton({ active, onClick, icon, label, badge }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; badge?: number }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex flex-col items-center gap-1 pt-2 pb-2.5 text-[0.7rem] font-semibold transition-colors [&_svg]:size-[22px]",
        active ? "text-brand-fg" : "text-muted hover:text-ink",
      )}
    >
      <span className={cn("flex h-8 w-14 items-center justify-center rounded-full transition-all duration-300 ease-out-expo", active ? "bg-brand-soft" : "scale-90")}>
        {icon}
      </span>
      {label}
      {badge ? (
        <span className="absolute top-1 left-1/2 ml-3 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold text-on-brand ring-2 ring-surface animate-pop">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

/** Fundo artístico na cor da marca, para restaurantes sem foto de capa. */
export function BrandArt({ name, className }: { name: string; className?: string }) {
  return (
    <div
      className={cn("grain relative overflow-hidden", className)}
      style={{
        background:
          "radial-gradient(120% 90% at 85% 10%, color-mix(in oklch, var(--brand) 70%, white) 0%, transparent 55%), radial-gradient(90% 80% at 0% 100%, color-mix(in oklch, var(--brand) 60%, black) 0%, transparent 60%), var(--brand)",
      }}
    >
      <span className="absolute -right-6 -bottom-16 font-display text-[16rem] leading-none text-white/12 select-none" aria-hidden>
        {name.trim().charAt(0)}
      </span>
    </div>
  );
}

function coverFor(restaurant: CustomerRestaurant, menu: PublicMenu) {
  if (restaurant.coverUrl) return restaurant.coverUrl;
  const items = menu.categories.flatMap((c) => c.items).filter((i) => i.image_url);
  return (items.find((i) => i.badges.includes("featured")) ?? items[0])?.image_url ?? null;
}

// ---------------------------------------------------------------------------

function JoinScreen({
  api,
  tableNumber,
  restaurant,
  menu,
  others,
  onJoined,
}: {
  api: TableApi;
  tableNumber: number;
  restaurant: CustomerRestaurant;
  menu: PublicMenu;
  others: string[];
  onJoined: () => void;
}) {
  const { t } = useApp();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cover = coverFor(restaurant, menu);
  const nameInput = useRef<HTMLInputElement>(null);

  // Foca o nome, exceto quando o cardápio está embutido (vitrine), para não rolar a página de fora.
  useEffect(() => {
    if (window.self === window.top) nameInput.current?.focus({ preventScroll: true });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await api("join", { name });
    setLoading(false);
    if (!res.ok) return setError(String(res.data.error ?? "Erro"));
    onJoined();
  }

  return (
    <div className="relative flex min-h-dvh flex-1 flex-col bg-black text-white">
      <div className="absolute inset-0 overflow-hidden">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="size-full object-cover opacity-85 [animation:hero-zoom_14s_var(--ease-out-quart)_both]" />
        ) : (
          <BrandArt name={restaurant.name} className="size-full" />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(0_0_0/0.45)_0%,rgb(0_0_0/0.05)_30%,rgb(0_0_0/0.55)_60%,rgb(0_0_0/0.92)_100%)]" />
      </div>

      <div className="relative z-10 flex items-center justify-end gap-1 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <LangSwitch className="bg-white/15 text-white backdrop-blur-md" />
        <ThemeToggle className="text-white/85 hover:bg-white/15 hover:text-white" />
      </div>

      <div className="relative z-10 mx-auto mt-auto flex w-full max-w-md flex-col px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="animate-rise">
          <RestaurantLogo name={restaurant.name} url={restaurant.logoUrl} className="size-16 rounded-2xl text-2xl ring-1 ring-white/25" />
        </div>
        <p className="mt-5 text-sm font-medium text-white/75 animate-rise [animation-delay:80ms]">{t.welcome}</p>
        <h1 className="font-display text-[2.6rem] leading-[1.02] font-semibold tracking-tight animate-rise [animation-delay:140ms]">{restaurant.name}</h1>
        {restaurant.tagline && <p className="mt-2 max-w-sm text-white/80 animate-rise [animation-delay:200ms]">{restaurant.tagline}</p>}

        <div className="mt-6 flex items-center gap-3 animate-rise [animation-delay:260ms]">
          <span className="inline-flex shrink-0 items-baseline gap-2 rounded-full bg-white/12 py-1.5 pr-4 pl-3 ring-1 ring-white/20 backdrop-blur-md">
            <span className="text-xs font-semibold tracking-wide text-white/70 uppercase">{t.table}</span>
            <span className="font-display text-2xl leading-none font-semibold">{tableNumber}</span>
          </span>
          {others.length > 0 && (
            <span className="flex min-w-0 items-center gap-2 text-sm text-white/75">
              <span className="flex shrink-0 -space-x-2">
                {others.slice(0, 4).map((n) => (
                  <span key={n} className="flex size-7 items-center justify-center rounded-full bg-brand text-xs font-bold text-on-brand ring-2 ring-black/60">
                    {n.charAt(0).toUpperCase()}
                  </span>
                ))}
              </span>
              <span className="line-clamp-1">
                {t.alreadyHere} {others.join(", ")}
              </span>
            </span>
          )}
        </div>

        <form onSubmit={submit} className="mt-7 rounded-[1.75rem] bg-surface p-5 text-ink shadow-float animate-rise [animation-delay:340ms]">
          <label className="block font-display text-xl font-semibold" htmlFor="name">
            {t.yourName}
          </label>
          <input
            id="name"
            ref={nameInput}
            autoComplete="given-name"
            className={cn(inputClass, "mt-3 h-13 text-base sm:text-base")}
            placeholder={t.namePlaceholder}
            value={name}
            maxLength={30}
            onChange={(e) => setName(e.target.value)}
          />
          {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
          <Button type="submit" size="lg" className="mt-3 w-full" disabled={loading || name.trim().length < 2}>
            {loading ? <Spinner /> : t.seeMenu}
          </Button>
        </form>
        <PoweredBy tone="light" className="mx-auto mt-5" />
      </div>
      <style>{`@keyframes hero-zoom{from{transform:scale(1.15)}to{transform:scale(1.03)}}`}</style>
    </div>
  );
}

function ClosedScreen({
  api,
  restaurant,
  state,
  onNewVisit,
  onRated,
}: {
  api: TableApi;
  restaurant: CustomerRestaurant;
  state: SessionState;
  onNewVisit: () => void;
  onRated: () => void;
}) {
  const { t, features } = useApp();
  const mine = state.bill.guests.find((g) => g.guest.id === state.meId);
  return (
    <div className="relative flex flex-1 flex-col items-center overflow-hidden px-6 pt-16 pb-10 text-center">
      <div className="pointer-events-none absolute -top-48 left-1/2 size-[34rem] -translate-x-1/2 rounded-full bg-brand/20 blur-3xl" aria-hidden />
      <div className="relative animate-rise">
        <RestaurantLogo name={restaurant.name} url={restaurant.logoUrl} className="mx-auto size-16 rounded-2xl text-2xl" />
      </div>
      <h1 className="relative mt-6 font-display text-4xl font-semibold tracking-tight animate-rise [animation-delay:80ms]">{t.thanks}</h1>
      <p className="relative mt-2 max-w-xs text-muted animate-rise [animation-delay:140ms]">{t.closedAt(restaurant.name)}</p>
      {mine && mine.totalCents > 0 && features.bill_view && (
        <div className="relative mt-6 rounded-2xl border border-line bg-surface px-6 py-4 animate-rise [animation-delay:200ms]">
          <div className="text-xs font-semibold text-muted">{t.yourShare}</div>
          <div className="font-display text-3xl font-semibold tabular-nums">{formatBRL(mine.totalCents)}</div>
        </div>
      )}
      {features.ratings && <RatingCard api={api} rated={state.rated} onRated={onRated} />}
      <Button variant="secondary" className="relative mt-8" onClick={onNewVisit}>
        {t.newVisit}
      </Button>
      <PoweredBy className="mt-auto pt-12" />
    </div>
  );
}

function Stars({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-semibold">{label}</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => onChange(n)} aria-label={`${n}`} className="p-0.5">
            <Star
              key={`${n}-${n <= value}`}
              className={cn("size-8 transition-colors", n <= value ? "fill-amber-400 text-amber-400 animate-pop" : "text-line-strong")}
              style={{ animationDelay: `${n * 40}ms` }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function RatingCard({ api, rated, onRated }: { api: TableApi; rated: boolean; onRated: () => void }) {
  const { t } = useApp();
  const [food, setFood] = useState(0);
  const [service, setService] = useState(0);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(rated);

  if (done)
    return (
      <p className="relative mt-8 flex items-center gap-2 font-semibold text-emerald-700 animate-rise">
        <Check className="size-5" /> {t.rateThanks}
      </p>
    );

  async function send() {
    setSending(true);
    const res = await api("rate", { food, service, comment });
    setSending(false);
    if (res.ok) {
      setDone(true);
      onRated();
    }
  }

  return (
    <div className="relative mt-8 w-full max-w-sm space-y-4 rounded-[1.75rem] border border-line bg-surface p-5 text-left shadow-card animate-rise [animation-delay:260ms]">
      <div className="font-display text-xl font-semibold">{t.rateTitle}</div>
      <Stars label={t.rateFood} value={food} onChange={setFood} />
      <Stars label={t.rateService} value={service} onChange={setService} />
      <textarea className={inputClass} rows={2} maxLength={500} placeholder={t.rateComment} value={comment} onChange={(e) => setComment(e.target.value)} />
      <Button className="w-full" size="lg" disabled={!food || !service || sending} onClick={send}>
        {sending ? <Spinner /> : t.rateSend}
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------

function CompactHeader({
  restaurant,
  tableNumber,
  canCall,
  called,
  onCall,
}: {
  restaurant: CustomerRestaurant;
  tableNumber: number;
  canCall: boolean;
  called: boolean;
  onCall: () => void;
}) {
  const { t } = useApp();
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="flex items-center gap-3 px-4 py-3">
        <RestaurantLogo name={restaurant.name} url={restaurant.logoUrl} className="size-9 text-base" />
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-lg leading-tight font-semibold">{restaurant.name}</div>
          <div className="text-xs text-muted">
            {t.table} {tableNumber}
          </div>
        </div>
        <ThemeToggle />
        {canCall && <CallButton called={called} onClick={onCall} compact />}
      </div>
    </header>
  );
}

function CallButton({ called, onClick, compact }: { called: boolean; onClick: () => void; compact?: boolean }) {
  const { t } = useApp();
  return (
    <button
      onClick={onClick}
      aria-label={t.callWaiter}
      className={cn(
        "relative inline-flex h-10 shrink-0 items-center gap-2 rounded-full text-sm font-bold transition-all active:scale-95",
        compact ? "px-3" : "px-4",
        called ? "bg-brand-soft text-brand-fg" : "bg-brand text-on-brand shadow-[0_8px_24px_-10px_var(--brand-glow)]",
      )}
    >
      <Bell className={cn("size-4", called && "origin-top animate-[swing_1.4s_ease-in-out_infinite]")} />
      {called ? t.called : t.waiter}
      {called && <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-brand animate-pulse-dot" />}
      <style>{`@keyframes swing{0%,60%,100%{transform:rotate(0)}15%{transform:rotate(14deg)}30%{transform:rotate(-10deg)}45%{transform:rotate(6deg)}}`}</style>
    </button>
  );
}

function MenuTab({
  restaurant,
  tableNumber,
  meName,
  guestCount,
  menu,
  canCall,
  called,
  onCall,
  onSearch,
  onSelect,
  onQuickAdd,
}: {
  restaurant: CustomerRestaurant;
  tableNumber: number;
  meName?: string;
  guestCount: number;
  menu: PublicMenu;
  canCall: boolean;
  called: boolean;
  onCall: () => void;
  onSearch: () => void;
  onSelect: (item: PublicMenuItem) => void;
  onQuickAdd: (item: PublicMenuItem, from?: HTMLElement) => void;
}) {
  const { t, lang, features } = useApp();
  const cover = coverFor(restaurant, menu);
  const sentinel = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(menu.categories[0]?.id ?? null);
  const chips = useRef<HTMLDivElement>(null);
  const tags = useMemo(() => [...new Set(menu.categories.flatMap((c) => c.items.flatMap((i) => i.tags)))], [menu]);
  const highlights = useMemo(() => {
    const all = menu.categories.filter((c) => c.open).flatMap((c) => c.items).filter((i) => i.available && i.image_url);
    const picked = all.filter((i) => i.badges.includes("featured") || i.badges.includes("popular"));
    return (picked.length >= 2 ? picked : []).slice(0, 8);
  }, [menu]);

  // Cabeçalho compacto aparece quando a capa sai da tela.
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setCompact(!e.isIntersecting && e.boundingClientRect.top < 0), { rootMargin: "-64px 0px 0px 0px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Categoria ativa acompanha a rolagem.
  useEffect(() => {
    const sections = menu.categories.map((c) => document.getElementById(`cat-${c.id}`)).filter(Boolean) as HTMLElement[];
    const obs = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setActive(hit.target.id.slice(4));
      },
      { rootMargin: "-140px 0px -60% 0px" },
    );
    sections.forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, [menu, filter]);

  useEffect(() => {
    const box = chips.current;
    const chip = box?.querySelector<HTMLElement>(`[data-cat="${active}"]`);
    if (box && chip) box.scrollTo({ left: chip.offsetLeft - box.clientWidth / 2 + chip.clientWidth / 2, behavior: reduceMotion() ? "auto" : "smooth" });
  }, [active]);

  function jump(id: string) {
    const el = document.getElementById(`cat-${id}`);
    if (!el) return;
    setActive(id);
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 118, behavior: reduceMotion() ? "auto" : "smooth" });
  }

  return (
    <>
      {/* Capa */}
      <div className="relative h-[17.5rem] overflow-hidden sm:h-80">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            className="size-full object-cover [mask-image:linear-gradient(to_bottom,black_55%,transparent)] [animation:hero-in_1.2s_var(--ease-out-expo)_both]"
          />
        ) : (
          <BrandArt name={restaurant.name} className="size-full [mask-image:linear-gradient(to_bottom,black_55%,transparent)]" />
        )}
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/45 to-transparent" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-end gap-1.5 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
          <LangSwitch className="bg-black/30 backdrop-blur-md" />
          <ThemeToggle className="bg-black/30 text-white backdrop-blur-md hover:bg-black/45 hover:text-white" />
        </div>
        <style>{`@keyframes hero-in{from{transform:scale(1.12);filter:blur(6px)}to{transform:scale(1);filter:blur(0)}}`}</style>
      </div>

      {/* Identidade */}
      <div className="relative -mt-24 px-5">
        <RestaurantLogo name={restaurant.name} url={restaurant.logoUrl} className="size-[4.5rem] rounded-[1.4rem] text-3xl shadow-float ring-4 ring-canvas animate-rise" />
        <h1 className="mt-4 font-display text-[2.35rem] leading-[1.02] font-semibold tracking-tight animate-rise [animation-delay:60ms]">
          {restaurant.name}
        </h1>
        {restaurant.tagline && <p className="mt-1.5 max-w-md text-[0.95rem] text-muted animate-rise [animation-delay:110ms]">{restaurant.tagline}</p>}
        <div className="mt-4 flex flex-wrap items-center gap-2 animate-rise [animation-delay:160ms]">
          <span className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line bg-surface px-4 text-sm">
            <span className="text-muted">{t.table}</span>
            <strong className="font-display text-lg leading-none">{tableNumber}</strong>
          </span>
          {meName && (
            <span className="inline-flex h-10 min-w-0 items-center gap-2 rounded-full border border-line bg-surface pr-4 pl-1.5 text-sm">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand-fg">{meName.charAt(0).toUpperCase()}</span>
              <span className="max-w-32 truncate">
                {t.hello}, <strong>{meName}</strong>
              </span>
              {guestCount > 1 && <span className="text-muted">+{guestCount - 1}</span>}
            </span>
          )}
          <span className="flex-1" />
          {canCall && <CallButton called={called} onClick={onCall} />}
        </div>
      </div>
      <div ref={sentinel} />

      {/* Barra fixa: identidade compacta + categorias */}
      <div className="sticky top-0 z-30 mt-5 bg-canvas/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className={cn("grid transition-[grid-template-rows] duration-400 ease-out-expo", compact ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
          <div className="overflow-hidden">
            <div className={cn("flex items-center gap-3 px-4 pt-3 transition-opacity duration-300", compact ? "opacity-100" : "opacity-0")} aria-hidden={!compact}>
              <RestaurantLogo name={restaurant.name} url={restaurant.logoUrl} className="size-8 rounded-lg text-sm" />
              <div className="min-w-0 flex-1 truncate font-display text-lg leading-tight font-semibold">{restaurant.name}</div>
              <span className="text-xs font-semibold text-muted">
                {t.table} {tableNumber}
              </span>
              {canCall && (
                <button
                  tabIndex={compact ? 0 : -1}
                  onClick={onCall}
                  aria-label={t.callWaiter}
                  className={cn("flex size-9 items-center justify-center rounded-full", called ? "bg-brand-soft text-brand-fg" : "bg-brand text-on-brand")}
                >
                  <Bell className="size-4" />
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 border-b border-line py-3 pl-4">
          <button
            onClick={onSearch}
            aria-label={t.search}
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink transition hover:border-line-strong"
          >
            <Search className="size-4" />
          </button>
          <div ref={chips} className="no-scrollbar relative flex flex-1 gap-1.5 overflow-x-auto pr-4">
            {menu.categories.map((c) => (
              <button
                key={c.id}
                data-cat={c.id}
                onClick={() => jump(c.id)}
                className={cn(
                  "h-9 shrink-0 rounded-full px-4 text-sm font-semibold whitespace-nowrap transition-all duration-300",
                  active === c.id ? "bg-ink text-canvas" : "text-muted hover:bg-surface-2 hover:text-ink",
                  !c.open && "opacity-50",
                )}
              >
                {tr(lang, c).name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!features.customer_ordering && (
        <p className="mx-4 mt-5 flex items-center gap-3 rounded-2xl bg-brand-soft px-4 py-3 text-sm font-semibold text-brand-fg">
          <Bell className="size-4 shrink-0" /> {t.askWaiterToOrder}
        </p>
      )}

      {/* Destaques */}
      {highlights.length > 0 && !filter && (
        <section className="mt-7">
          <h2 className="flex items-center gap-2 px-5 font-display text-2xl font-semibold tracking-tight">
            <Sparkles className="size-5 text-brand-fg" /> {t.highlights}
          </h2>
          <div className="no-scrollbar mt-3 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-2">
            {highlights.map((item, i) => {
              const { name } = tr(lang, item);
              return (
                <button
                  key={item.id}
                  onClick={() => onSelect(item)}
                  className="group relative aspect-[4/5] w-[68%] max-w-64 shrink-0 snap-start overflow-hidden rounded-[1.6rem] text-left text-white shadow-card animate-rise"
                  style={{ animationDelay: `${120 + i * 60}ms` }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image_url!}
                    alt=""
                    loading={i < 2 ? "eager" : "lazy"}
                    className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-105"
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
                  {item.badges.includes("popular") && (
                    <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[0.7rem] font-bold text-black">
                      <Flame className="size-3 text-orange-600" /> {t.popular}
                    </span>
                  )}
                  <span className="absolute inset-x-0 bottom-0 p-4">
                    <span className="block font-display text-xl leading-tight font-semibold">{name}</span>
                    <span className="mt-1.5 flex items-center justify-between gap-2">
                      <span className="font-semibold">
                        <Price item={item} light />
                      </span>
                      {features.customer_ordering && (
                        <span
                          role="button"
                          aria-label={`${t.add}: ${name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onQuickAdd(item, e.currentTarget);
                          }}
                          className="flex size-9 items-center justify-center rounded-full bg-white text-black transition-transform active:scale-90"
                        >
                          <Plus className="size-4" strokeWidth={2.75} />
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Filtros */}
      {features.dietary && tags.length > 0 && (
        <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto px-5">
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => setFilter(filter === tag ? null : tag)}
              className={cn(
                "inline-flex h-8 shrink-0 items-center gap-1 rounded-full border px-3 text-xs font-bold transition-all",
                filter === tag ? "border-emerald-600 bg-emerald-600 text-white" : "border-emerald-600/25 text-emerald-700 hover:border-emerald-600/50",
              )}
            >
              {filter === tag && <Check className="size-3.5" strokeWidth={3} />}
              {t.tags[tag] ?? tag}
            </button>
          ))}
        </div>
      )}

      <MenuList menu={menu} filter={filter} onSelect={onSelect} onQuickAdd={onQuickAdd} />
    </>
  );
}

const BADGE_CLASS = {
  popular: "bg-amber-100 text-amber-800",
  new: "bg-sky-100 text-sky-800",
  featured: "bg-brand-soft text-brand-fg",
};

function ItemBadges({ item, className }: { item: PublicMenuItem; className?: string }) {
  const { t } = useApp();
  if (!item.badges.length && !item.tags.length && item.original_price_cents == null && item.stock_left == null) return null;
  return (
    <div className={cn("mt-2 flex flex-wrap gap-1", className)}>
      {item.original_price_cents != null && <Badge className="bg-emerald-100 text-emerald-800">{t.happyHour}</Badge>}
      {item.badges.map((b) => (
        <Badge key={b} className={BADGE_CLASS[b]}>
          {b === "popular" && <Flame className="size-3" />}
          {b === "featured" && <Sparkles className="size-3" />}
          {t[b]}
        </Badge>
      ))}
      {item.tags.map((tag) => (
        <Badge key={tag} className="bg-stone-100 text-stone-700">
          {t.tags[tag] ?? tag}
        </Badge>
      ))}
      {item.stock_left != null && item.stock_left > 0 && <Badge className="bg-red-50 text-red-700">{t.lastUnits(item.stock_left)}</Badge>}
    </div>
  );
}

function Price({ item, light }: { item: PublicMenuItem; light?: boolean }) {
  return (
    <span className="tabular-nums">
      {item.original_price_cents != null && (
        <span className={cn("mr-1.5 text-sm font-normal line-through", light ? "text-white/60" : "text-muted")}>{formatBRL(item.original_price_cents)}</span>
      )}
      {formatBRL(item.price_cents)}
    </span>
  );
}

function MenuList({
  menu,
  filter,
  onSelect,
  onQuickAdd,
}: {
  menu: PublicMenu;
  filter: string | null;
  onSelect: (item: PublicMenuItem) => void;
  onQuickAdd: (item: PublicMenuItem, from?: HTMLElement) => void;
}) {
  const { t, lang } = useApp();
  if (menu.categories.length === 0)
    return (
      <div className="flex flex-col items-center px-8 py-20 text-center text-muted">
        <ChefHat className="size-10 text-line-strong" />
        <p className="mt-3">{t.menuSoon}</p>
      </div>
    );

  return (
    <div className="mt-4">
      {menu.categories.map((c) => {
        const items = c.items.filter((i) => !filter || i.tags.includes(filter));
        if (!items.length) return null;
        return (
          <section key={c.id} id={`cat-${c.id}`} className="pt-7">
            <div className="flex items-baseline justify-between gap-3 px-5">
              <h2 className="font-display text-[1.75rem] leading-tight font-semibold tracking-tight">{tr(lang, c).name}</h2>
              <span className="text-xs font-semibold text-muted tabular-nums">{items.length}</span>
            </div>
            {c.window && (
              <p className={cn("mt-1 flex items-center gap-1.5 px-5 text-xs", c.open ? "text-muted" : "font-semibold text-amber-700")}>
                <Clock className="size-3.5" /> {c.window}
              </p>
            )}
            <ul className={cn("mt-2", !c.open && "opacity-60")}>
              {items.map((item) => (
                <MenuRow key={item.id} item={item} open={c.open} onSelect={onSelect} onQuickAdd={onQuickAdd} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function MenuRow({
  item,
  open,
  onSelect,
  onQuickAdd,
}: {
  item: PublicMenuItem;
  open: boolean;
  onSelect: (item: PublicMenuItem) => void;
  onQuickAdd: (item: PublicMenuItem, from?: HTMLElement) => void;
}) {
  const { t, lang, features } = useApp();
  const { name, description } = tr(lang, item);
  const disabled = !item.available || !open;
  const plus = features.customer_ordering && !disabled && (
    <span
      role="button"
      tabIndex={0}
      aria-label={`${t.add}: ${name}`}
      onClick={(e) => {
        e.stopPropagation();
        onQuickAdd(item, e.currentTarget);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          onQuickAdd(item, e.currentTarget);
        }
      }}
      className="flex size-9 items-center justify-center rounded-full bg-surface text-ink shadow-[0_4px_14px_-4px_rgb(0_0_0/0.3)] ring-1 ring-line transition-transform hover:scale-105 active:scale-90"
    >
      <Plus className="size-[18px]" strokeWidth={2.5} />
    </span>
  );

  return (
    <li className="group relative px-2">
      <button
        disabled={disabled}
        onClick={() => onSelect(item)}
        className="flex w-full gap-4 rounded-[1.4rem] px-3 py-4 text-left transition-colors hover:bg-surface/70 disabled:cursor-not-allowed"
      >
        <div className="min-w-0 flex-1">
          <div className="text-[1.02rem] leading-snug font-bold">{name}</div>
          {description && <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted">{description}</p>}
          {item.combo.length > 0 && (
            <p className="mt-1 text-xs text-muted">
              {t.comboIncludes}: {item.combo.join(" + ")}
            </p>
          )}
          <ItemBadges item={item} />
          <div className="mt-2.5 flex items-center gap-3">
            {item.available ? (
              <span className="font-bold text-ink">
                <Price item={item} />
              </span>
            ) : (
              <Badge className="bg-stone-200 text-stone-600">{t.soldOut}</Badge>
            )}
            {item.eta_min && item.available && (
              <span className="flex items-center gap-1 text-xs text-muted">
                <Clock className="size-3.5" /> {t.eta(item.eta_min)}
              </span>
            )}
            {!item.image_url && <span className="ml-auto">{plus}</span>}
          </div>
        </div>
        {item.image_url && (
          <span className="relative shrink-0 self-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.image_url}
              alt=""
              loading="lazy"
              className={cn(
                "size-[6.75rem] rounded-[1.1rem] object-cover shadow-sm transition-transform duration-500 ease-out-expo group-hover:scale-[1.03]",
                disabled && "grayscale",
              )}
            />
            {plus && <span className="absolute -right-1.5 -bottom-1.5">{plus}</span>}
          </span>
        )}
      </button>
      <span className="absolute inset-x-5 bottom-0 h-px bg-line group-last:hidden" />
    </li>
  );
}

function SearchSheet({ open, menu, onClose, onSelect }: { open: boolean; menu: PublicMenu; onClose: () => void; onSelect: (i: PublicMenuItem) => void }) {
  const { t, lang } = useApp();
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
    const term = norm(q.trim());
    if (!term) return [];
    return menu.categories.flatMap((c) =>
      c.items
        .filter((i) => {
          const { name, description } = tr(lang, i);
          return norm(`${name} ${description ?? ""} ${tr(lang, c).name}`).includes(term);
        })
        .map((i) => ({ item: i, cat: tr(lang, c).name })),
    );
  }, [q, menu, lang]);

  return (
    <Sheet open={open} onClose={onClose} title={t.search}>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
        <input autoFocus className={cn(inputClass, "pl-10")} placeholder={t.searchPlaceholder} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="mt-3 min-h-48">
        {q.trim() && results.length === 0 && <p className="py-10 text-center text-sm text-muted">{t.noResults(q.trim())}</p>}
        {results.map(({ item, cat }) => (
          <button
            key={item.id}
            disabled={!item.available}
            onClick={() => {
              onClose();
              onSelect(item);
            }}
            className="flex w-full items-center gap-3 rounded-2xl p-2 text-left hover:bg-surface-2 disabled:opacity-50"
          >
            {item.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.image_url} alt="" className="size-12 rounded-xl object-cover" />
            ) : (
              <span className="flex size-12 items-center justify-center rounded-xl bg-brand-soft text-brand-fg">
                <UtensilsCrossed className="size-5" />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{tr(lang, item).name}</span>
              <span className="text-xs text-muted">{cat}</span>
            </span>
            <span className="text-sm font-bold tabular-nums">{formatBRL(item.price_cents)}</span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------

function ShareSelector({ others, value, onChange }: { others: { id: string; name: string }[]; value: Share; onChange: (s: Share) => void }) {
  const { t } = useApp();
  const custom = Array.isArray(value) ? value : [];
  const pill = (active: boolean) =>
    cn(
      "inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-all active:scale-95",
      active ? "border-ink bg-ink text-canvas" : "border-line-strong bg-surface text-ink hover:border-ink/40",
    );
  return (
    <div>
      <div className="mb-2.5 flex items-center gap-2 font-bold">
        <Users className="size-4 text-muted" /> {t.splitQuestion}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={pill(value === "me")} onClick={() => onChange("me")}>
          {t.onlyMe}
        </button>
        <button type="button" className={pill(value === "all")} onClick={() => onChange("all")}>
          {t.splitAll}
        </button>
        {others.length > 0 && (
          <button type="button" className={pill(Array.isArray(value))} onClick={() => onChange(Array.isArray(value) ? "me" : [])}>
            {t.choosePeople}
          </button>
        )}
      </div>
      {Array.isArray(value) && (
        <div className="mt-3 flex flex-wrap gap-2 rounded-2xl bg-surface-2 p-3 animate-fade-in">
          {others.map((g) => {
            const on = custom.includes(g.id);
            return (
              <button
                type="button"
                key={g.id}
                onClick={() => onChange(on ? custom.filter((id) => id !== g.id) : [...custom, g.id])}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-full border pr-4 pl-1.5 text-sm font-semibold transition-all active:scale-95",
                  on ? "border-brand bg-brand text-on-brand" : "border-line-strong bg-surface",
                )}
              >
                <span className={cn("flex size-7 items-center justify-center rounded-full text-xs font-bold", on ? "bg-black/15" : "bg-surface-2")}>
                  {on ? <Check className="size-3.5" strokeWidth={3} /> : g.name.charAt(0).toUpperCase()}
                </span>
                {g.name}
              </button>
            );
          })}
        </div>
      )}
      <p className="mt-2.5 text-xs leading-relaxed text-muted">
        {value === "all"
          ? t.splitAllHint
          : Array.isArray(value)
            ? custom.length
              ? t.splitWithN(custom.length)
              : t.tapNames
            : others.length === 0
              ? t.friendsLater
              : t.goesToYou}
      </p>
    </div>
  );
}

function ItemSheet({
  item,
  allItems,
  others,
  canOrder,
  onSelect,
  onClose,
  onAdd,
}: {
  item: PublicMenuItem;
  allItems: PublicMenuItem[];
  others: { id: string; name: string }[];
  canOrder: boolean;
  onSelect: (item: PublicMenuItem) => void;
  onClose: () => void;
  onAdd: (line: CartLine) => void;
}) {
  const { t, lang, features } = useApp();
  const [qty, setQty] = useState(1);
  const [optionIds, setOptionIds] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [share, setShare] = useState<Share>("me");
  const { name, description } = tr(lang, item);

  const chosen = item.options.filter((o) => optionIds.includes(o.id));
  const unitPrice = item.price_cents + chosen.reduce((s, o) => s + o.price_cents, 0);
  const pairs = item.pairs_with.map((id) => allItems.find((i) => i.id === id)).filter((i): i is PublicMenuItem => !!i && i.available);

  return (
    <Sheet
      open
      onClose={onClose}
      bleed={!!item.image_url}
      title={name}
      footer={
        canOrder ? (
          <div className="flex items-center gap-3">
            <QtyStepper value={qty} onChange={setQty} />
            <Button
              size="lg"
              className="flex-1 justify-between"
              onClick={() =>
                onAdd({
                  key: crypto.randomUUID(),
                  menuItemId: item.id,
                  name,
                  qty,
                  optionIds,
                  optionNames: chosen.map((o) => o.name),
                  unitPrice,
                  note: note.trim(),
                  share: Array.isArray(share) && share.length === 0 ? "me" : share,
                })
              }
            >
              <span>{t.add}</span>
              <span key={unitPrice * qty} className="tabular-nums animate-fade-in">
                {formatBRL(unitPrice * qty)}
              </span>
            </Button>
          </div>
        ) : undefined
      }
    >
      {item.image_url && (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.image_url} alt="" className="aspect-[4/3] w-full object-cover [animation:hero-in_0.9s_var(--ease-out-expo)_both]" />
          <span className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-surface to-transparent" />
          <style>{`@keyframes hero-in{from{transform:scale(1.12);filter:blur(6px)}to{transform:scale(1);filter:blur(0)}}`}</style>
        </div>
      )}
      <div className={cn(item.image_url && "-mt-6 px-5")}>
        {item.image_url && <h2 className="relative font-display text-[1.9rem] leading-tight font-semibold tracking-tight">{name}</h2>}
        {description && <p className="mt-2 leading-relaxed text-muted">{description}</p>}
        {item.combo.length > 0 && (
          <p className="mt-2 text-sm text-muted">
            {t.comboIncludes}: {item.combo.join(" + ")}
          </p>
        )}
        <ItemBadges item={item} className="mt-3" />
        <div className="mt-4 flex items-center gap-3 text-xl font-bold">
          <Price item={item} />
          {item.eta_min && (
            <span className="flex items-center gap-1 text-sm font-medium text-muted">
              <Clock className="size-4" /> {t.eta(item.eta_min)}
            </span>
          )}
        </div>

        {canOrder && item.options.length > 0 && (
          <div className="mt-6">
            <div className="mb-2.5 font-bold">{t.addons}</div>
            <div className="space-y-2">
              {item.options.map((o) => {
                const on = optionIds.includes(o.id);
                return (
                  <label
                    key={o.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3.5 transition-all",
                      on ? "border-brand bg-brand-soft" : "border-line hover:border-line-strong",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={on}
                      onChange={(e) => setOptionIds(e.target.checked ? [...optionIds, o.id] : optionIds.filter((id) => id !== o.id))}
                    />
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-lg border-2 transition-all",
                        on ? "border-brand bg-brand text-on-brand" : "border-line-strong",
                      )}
                    >
                      {on && <Check className="size-3.5 animate-pop" strokeWidth={3.5} />}
                    </span>
                    <span className="flex-1 font-medium">{o.name}</span>
                    {o.price_cents > 0 && <span className="text-sm font-semibold text-muted tabular-nums">+ {formatBRL(o.price_cents)}</span>}
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {canOrder && (
          <div className="mt-6">
            <label className="mb-2 block font-bold" htmlFor="note">
              {t.anyNote}
            </label>
            <textarea id="note" rows={2} maxLength={200} className={inputClass} placeholder={t.notePlaceholder} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        )}

        {canOrder && features.item_sharing && (
          <div className="mt-6">
            <ShareSelector others={others} value={share} onChange={setShare} />
          </div>
        )}

        {pairs.length > 0 && (
          <div className="mt-7">
            <div className="mb-2.5 font-bold">{t.pairsWith}</div>
            <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5">
              {pairs.map((p) => (
                <button key={p.id} onClick={() => onSelect(p)} className="w-36 shrink-0 overflow-hidden rounded-2xl border border-line text-left transition hover:border-line-strong">
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image_url} alt="" className="aspect-[4/3] w-full object-cover" />
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center bg-brand-soft text-brand-fg">
                      <UtensilsCrossed className="size-6" />
                    </div>
                  )}
                  <div className="p-2.5 text-sm">
                    <div className="line-clamp-2 font-semibold">{tr(lang, p).name}</div>
                    <div className="mt-0.5 text-muted tabular-nums">{formatBRL(p.price_cents)}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}

function QtyStepper({ value, onChange, min = 1, small }: { value: number; onChange: (n: number) => void; min?: number; small?: boolean }) {
  return (
    <div className={cn("flex items-center rounded-2xl bg-surface-2", small ? "h-9" : "h-14")}>
      <button
        className={cn("flex h-full items-center justify-center text-ink transition active:scale-90 disabled:text-line-strong", small ? "w-9" : "w-12")}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        aria-label="-"
      >
        <Minus className="size-4" strokeWidth={2.5} />
      </button>
      <span key={value} className={cn("text-center font-bold tabular-nums animate-pop", small ? "w-5 text-sm" : "w-6")}>
        {value}
      </span>
      <button
        className={cn("flex h-full items-center justify-center text-ink transition active:scale-90", small ? "w-9" : "w-12")}
        onClick={() => onChange(Math.min(value + 1, 50))}
        aria-label="+"
      >
        <Plus className="size-4" strokeWidth={2.5} />
      </button>
    </div>
  );
}

function shareLabel(t: Dict, share: Share, guests: { id: string; name: string }[]) {
  if (share === "all") return t.sharedAll;
  if (Array.isArray(share) && share.length) {
    const names = guests.filter((g) => share.includes(g.id)).map((g) => g.name);
    return `${t.sharedWith} ${names.join(", ")}`;
  }
  return null;
}

function CartSheet({
  open,
  cart,
  allItems,
  guests,
  api,
  onClose,
  onChange,
  onConfirmed,
  onError,
}: {
  open: boolean;
  cart: CartLine[];
  allItems: PublicMenuItem[];
  guests: { id: string; name: string }[];
  api: TableApi;
  onClose: () => void;
  onChange: (cart: CartLine[]) => void;
  onConfirmed: () => void;
  onError: (msg: string) => void;
}) {
  const { t } = useApp();
  const [sending, setSending] = useState(false);
  const total = cart.reduce((n, l) => n + l.qty * l.unitPrice, 0);

  async function confirm() {
    setSending(true);
    const res = await api("order", {
      items: cart.map((l) => ({ menu_item_id: l.menuItemId, qty: l.qty, option_ids: l.optionIds, note: l.note, share: l.share })),
    });
    setSending(false);
    if (!res.ok) return onError(String(res.data.error ?? "Erro"));
    onConfirmed();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t.yourOrder}
      footer={
        <div>
          <p className="mb-3 flex items-center gap-2 text-xs text-muted">
            <ChefHat className="size-4 shrink-0" />
            {t.goesToKitchen}
          </p>
          <Button size="lg" className="w-full justify-between" disabled={sending || cart.length === 0} onClick={confirm}>
            {sending ? <Spinner /> : <span>{t.confirm}</span>}
            <span className="tabular-nums">{formatBRL(total)}</span>
          </Button>
        </div>
      }
    >
      {cart.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center text-muted">
          <ShoppingBag className="size-10 text-line-strong" />
          <p className="mt-3">{t.emptyCart}</p>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {cart.map((line) => {
            const shared = shareLabel(t, line.share, guests);
            const img = allItems.find((i) => i.id === line.menuItemId)?.image_url;
            return (
              <li key={line.key} className="flex gap-3 py-4 animate-fade-in">
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img} alt="" className="size-16 shrink-0 rounded-2xl object-cover" />
                ) : (
                  <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-fg">
                    <UtensilsCrossed className="size-5" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-bold">{line.name}</div>
                    <div className="font-bold tabular-nums">{formatBRL(line.qty * line.unitPrice)}</div>
                  </div>
                  {line.optionNames.length > 0 && <div className="text-sm text-muted">+ {line.optionNames.join(", ")}</div>}
                  {line.note && <div className="text-sm text-amber-700">“{line.note}”</div>}
                  {shared && (
                    <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-brand-fg">
                      <Users className="size-3.5" /> {shared}
                    </div>
                  )}
                  <div className="mt-2 flex items-center gap-1">
                    <QtyStepper small value={line.qty} onChange={(qty) => onChange(cart.map((l) => (l.key === line.key ? { ...l, qty } : l)))} />
                    <button
                      className="flex size-9 items-center justify-center rounded-full text-muted transition hover:bg-red-50 hover:text-red-600 dark:hover:text-red-400"
                      onClick={() => onChange(cart.filter((l) => l.key !== line.key))}
                      aria-label="Remover"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Sheet>
  );
}

/** Momento de confirmação: tela na cor da marca com o check sendo desenhado. */
function OrderSentOverlay({ onDone }: { onDone: () => void }) {
  const { t } = useApp();
  useEffect(() => {
    const id = setTimeout(onDone, 2400);
    return () => clearTimeout(id);
  }, [onDone]);
  return (
    <button
      onClick={onDone}
      className="fixed inset-0 z-[65] flex flex-col items-center justify-center bg-brand px-8 text-center text-on-brand [animation:sent-out_2.4s_var(--ease-out-quart)_both]"
    >
      <span className="grain absolute inset-0" aria-hidden />
      <svg viewBox="0 0 80 80" className="size-28" aria-hidden>
        <circle cx="40" cy="40" r="36" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
        <circle
          cx="40"
          cy="40"
          r="36"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="227"
          className="origin-center -rotate-90 [animation:draw_0.9s_var(--ease-out-expo)_0.1s_both]"
        />
        <path
          d="M25 41 l10 10 l20 -22"
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="50"
          className="[animation:draw-check_0.5s_var(--ease-out-expo)_0.55s_both]"
        />
      </svg>
      <span className="mt-7 font-display text-4xl font-semibold animate-rise [animation-delay:350ms]">{t.orderSentTitle}</span>
      <span className="mt-2 max-w-xs opacity-85 animate-rise [animation-delay:450ms]">{t.orderSentText}</span>
      <style>{`
        @keyframes draw{from{stroke-dashoffset:227}to{stroke-dashoffset:0}}
        @keyframes draw-check{from{stroke-dashoffset:50}to{stroke-dashoffset:0}}
        @keyframes sent-out{0%{opacity:0;clip-path:circle(0% at 50% 85%)}15%{opacity:1;clip-path:circle(150% at 50% 85%)}85%{opacity:1}100%{opacity:0}}
      `}</style>
    </button>
  );
}

// ---------------------------------------------------------------------------

const STEPS = ["pending", "preparing", "ready", "delivered"] as const;

function OrderProgress({ status }: { status: string }) {
  const { t } = useApp();
  const idx = STEPS.indexOf(status as (typeof STEPS)[number]);
  if (status === "cancelled")
    return (
      <Badge className="mt-3 bg-red-100 text-red-700">
        <X className="size-3" /> {t.status.cancelled}
      </Badge>
    );
  return (
    <div className="mt-3.5">
      <div className="flex gap-1">
        {STEPS.map((s, i) => (
          <span key={s} className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
            <span
              className={cn(
                "absolute inset-y-0 left-0 rounded-full bg-brand transition-[width] duration-700 ease-out-expo",
                i <= idx ? "w-full" : "w-0",
                i === idx && idx < 3 && "animate-pulse",
              )}
            />
          </span>
        ))}
      </div>
      <div className="mt-1.5 grid grid-cols-4 gap-1 text-[0.68rem] font-semibold">
        {STEPS.map((s, i) => (
          <span key={s} className={cn("truncate", i === idx ? "text-brand-fg" : i < idx ? "text-ink" : "text-muted/70", i === 3 && "text-right")}>
            {t.status[s]}
          </span>
        ))}
      </div>
    </div>
  );
}

function OrdersTab({
  state,
  onReorder,
  onCancel,
}: {
  state: SessionState;
  onReorder: (item: SessionState["items"][number]) => void;
  onCancel: (item: SessionState["items"][number]) => void;
}) {
  const { t, features } = useApp();
  const [scope, setScope] = useState<"me" | "table">("me");
  const names = useMemo(() => new Map(state.guests.map((g) => [g.id, g.name])), [state.guests]);
  const items = state.items.filter((i) => scope === "table" || i.guest_id === state.meId).slice().reverse();

  return (
    <div className="px-4 pt-6">
      <h1 className="px-1 font-display text-3xl font-semibold tracking-tight">{t.progress}</h1>
      <Segmented
        className="mt-4"
        value={scope}
        onChange={setScope}
        options={[
          { value: "me", label: t.myOrders },
          { value: "table", label: t.wholeTable },
        ]}
      />
      {items.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center text-muted">
          <span className="flex size-16 items-center justify-center rounded-3xl bg-brand-soft text-brand-fg">
            <ClipboardList className="size-7" />
          </span>
          <p className="mt-4">{t.noOrders}</p>
        </div>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {items.map((i, n) => {
            const mine = i.guest_id === state.meId;
            return (
              <li key={i.id} className="rounded-[1.4rem] border border-line bg-surface p-4 animate-rise" style={{ animationDelay: `${Math.min(n, 8) * 40}ms` }}>
                <div className="flex items-start gap-3">
                  <span className="flex h-9 min-w-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 px-1.5 text-sm font-bold tabular-nums">{i.qty}×</span>
                  <div className="min-w-0 flex-1">
                    <div className={cn("font-bold", i.status === "cancelled" && "text-muted line-through")}>{i.name}</div>
                    {i.options.length > 0 && <div className="text-sm text-muted">+ {i.options.map((o) => o.name).join(", ")}</div>}
                    {i.note && <div className="text-sm text-amber-700">“{i.note}”</div>}
                    <div className="mt-0.5 text-xs text-muted">
                      {scope === "table" && (
                        <>
                          {t.orderedBy} {names.get(i.guest_id)}
                          {i.share_mode !== "me" && " · "}
                        </>
                      )}
                      {i.share_mode === "all" && t.sharedAll}
                      {i.share_mode === "custom" && `${t.sharedWith}: ${i.share_guest_ids.map((id) => names.get(id)).filter(Boolean).join(", ")}`}
                    </div>
                  </div>
                </div>
                <OrderProgress status={i.status} />
                {mine && features.customer_ordering && (
                  <div className="mt-3 flex gap-2">
                    {features.reorder && i.menu_item_id && i.status !== "cancelled" && (
                      <button
                        onClick={() => onReorder(i)}
                        className="flex h-8 items-center gap-1.5 rounded-full bg-brand-soft px-3 text-xs font-bold text-brand-fg transition active:scale-95"
                      >
                        <RotateCcw className="size-3.5" /> {t.orderAgain}
                      </button>
                    )}
                    {features.cancel_pending && i.status === "pending" && (
                      <button
                        onClick={() => onCancel(i)}
                        className="flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-bold text-muted transition hover:bg-red-50 hover:text-red-600 dark:hover:text-red-400"
                      >
                        <X className="size-3.5" /> {t.cancel}
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function BillTab({
  state,
  tableNumber,
  onRequestBill,
  billRequested,
}: {
  state: SessionState;
  tableNumber: number;
  onRequestBill?: () => void;
  billRequested: boolean;
}) {
  const { t } = useApp();
  const { bill } = state;
  const mine = bill.guests.find((g) => g.guest.id === state.meId);
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-5 px-4 pt-6">
      {mine && (
        <div className="receipt-edge rounded-t-[1.6rem] border border-b-0 border-line bg-surface px-6 pt-6 pb-9 shadow-card animate-rise">
          <div className="flex items-center justify-between text-xs font-semibold text-muted">
            <span>{t.receipt}</span>
            <span>
              {t.table} {tableNumber}
            </span>
          </div>
          <div className="mt-5 text-sm font-semibold text-muted">{t.yourShare}</div>
          <div className="font-display text-5xl font-semibold tracking-tight tabular-nums">{formatBRL(mine.totalCents)}</div>
          <div className="mt-5 space-y-2 border-t border-dashed border-line-strong pt-4 text-sm">
            {mine.lines.length === 0 && <div className="text-muted">{t.noItems}</div>}
            {mine.lines.map((l) => (
              <div key={l.itemId} className="flex items-baseline gap-2">
                <span className="min-w-0 truncate">
                  {l.qty}× {l.name}
                  {l.splitCount > 1 && <span className="text-muted"> ÷{l.splitCount}</span>}
                </span>
                <span className="min-w-4 flex-1 translate-y-[-3px] border-b border-dotted border-line-strong" />
                <span className="shrink-0 tabular-nums">{formatBRL(l.amountCents)}</span>
              </div>
            ))}
            {bill.serviceFeePct > 0 && (
              <div className="flex items-baseline gap-2 text-muted">
                <span className="shrink-0">
                  {t.service} ({bill.serviceFeePct}%)
                </span>
                <span className="min-w-4 flex-1 translate-y-[-3px] border-b border-dotted border-line-strong" />
                <span className="shrink-0 tabular-nums">{formatBRL(mine.serviceCents)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-[1.4rem] border border-line bg-surface animate-rise [animation-delay:80ms]">
        <div className="px-4 pt-4 pb-2 text-sm font-bold">{t.eachSpent}</div>
        {bill.guests.map((g) => {
          const open = expanded === g.guest.id;
          return (
            <div key={g.guest.id} className="border-t border-line first:border-0">
              <button className="flex w-full items-center gap-3 px-4 py-3 text-left" onClick={() => setExpanded(open ? null : g.guest.id)} aria-expanded={open}>
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    g.guest.id === state.meId ? "bg-brand text-on-brand" : "bg-surface-2",
                  )}
                >
                  {g.guest.name.charAt(0).toUpperCase()}
                </span>
                <span className="flex-1 font-semibold">
                  {g.guest.name}
                  {g.guest.id === state.meId && <span className="font-normal text-muted"> ({t.you})</span>}
                  {g.guest.paid_at && <Badge className="ml-2 bg-emerald-100 text-emerald-800">{t.paid}</Badge>}
                </span>
                <span className="font-bold tabular-nums">{formatBRL(g.totalCents)}</span>
              </button>
              <div className={cn("grid transition-[grid-template-rows] duration-400 ease-out-expo", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                <div className="overflow-hidden">
                  <div className="mx-4 mb-3 space-y-1 rounded-xl bg-surface-2 px-3 py-2.5 text-sm">
                    {g.lines.length === 0 && <div className="text-muted">{t.noItems}</div>}
                    {g.lines.map((l) => (
                      <div key={l.itemId} className="flex justify-between gap-3">
                        <span>
                          {l.qty}× {l.name}
                          {l.splitCount > 1 && <span className="text-muted"> ÷{l.splitCount}</span>}
                        </span>
                        <span className="tabular-nums">{formatBRL(l.amountCents)}</span>
                      </div>
                    ))}
                    {bill.serviceFeePct > 0 && (
                      <div className="flex justify-between text-muted">
                        <span>{t.service}</span>
                        <span className="tabular-nums">{formatBRL(g.serviceCents)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div className="flex justify-between border-t border-line bg-surface-2 px-4 py-3.5 font-bold">
          <span>{t.tableTotal}</span>
          <span className="tabular-nums">{formatBRL(bill.totalCents)}</span>
        </div>
      </div>

      {onRequestBill && (
        <Button size="lg" variant={billRequested ? "secondary" : "primary"} className="w-full" onClick={onRequestBill}>
          <Receipt className="size-5" />
          {billRequested ? t.billAsked : t.askBill}
        </Button>
      )}
    </div>
  );
}
