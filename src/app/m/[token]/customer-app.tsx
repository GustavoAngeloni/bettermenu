"use client";

import {
  Bell,
  ChefHat,
  ClipboardList,
  Clock,
  Minus,
  Plus,
  Receipt,
  RotateCcw,
  ShoppingBag,
  Star,
  Trash2,
  Users,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Badge, Button, cn, inputClass, Sheet, Spinner } from "@/components/ui";
import type { Features } from "@/lib/features";
import { formatBRL } from "@/lib/money";
import type { PublicMenu, PublicMenuItem, PublicState, SessionState } from "@/lib/public-table";
import { STATUS_CLASS } from "@/lib/status-style";
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

interface Props {
  token: string;
  tableNumber: number;
  restaurant: { name: string; logoUrl: string | null; serviceFeePct: number };
  menu: PublicMenu;
  features: Features;
  initialState: PublicState;
}

interface Ctx {
  t: Dict;
  lang: Lang;
  features: Features;
}
const AppCtx = createContext<Ctx>(null!);
const useApp = () => useContext(AppCtx);

export function CustomerApp({ token, tableNumber, restaurant, menu, features, initialState }: Props) {
  const [data, setData] = useState<PublicState>(initialState);
  const [tab, setTab] = useState<Tab>("menu");
  const [cart, setCart] = useCart(token);
  const [selected, setSelected] = useState<PublicMenuItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [rejoin, setRejoin] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [lang, setLangState] = useState<Lang>("pt");

  // Idioma: lido depois da hidratação (o servidor sempre renderiza em português).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (features.languages) setLangState(detectLang());
  }, [features.languages]);
  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("bm_lang", l);
    } catch {}
  };
  const t = DICTS[lang];
  const ctx = useMemo(() => ({ t, lang, features }), [t, lang, features]);

  const allItems = useMemo(() => menu.categories.flatMap((c) => c.items), [menu]);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/m/${token}/state`, { cache: "no-store" });
    if (res.ok) setData(await res.json());
  }, [token]);

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
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  const state = data?.joined ? data.state : null;
  const cartCount = cart.reduce((n, l) => n + l.qty, 0);
  const cartTotal = cart.reduce((n, l) => n + l.qty * l.unitPrice, 0);

  if (!data.joined || rejoin) {
    return (
      <AppCtx.Provider value={ctx}>
        <JoinScreen
          token={token}
          tableNumber={tableNumber}
          restaurant={restaurant}
          others={data.joined ? [] : data.guests}
          onLang={features.languages ? setLang : undefined}
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
        <ClosedScreen token={token} restaurant={restaurant} state={data.state} onNewVisit={() => setRejoin(true)} onRated={refresh} />
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
  const tabs: Tab[] = ["menu", "orders", ...(features.bill_view ? (["bill"] as const) : [])];

  async function call(type: "waiter" | "bill") {
    const res = await fetch(`/api/m/${token}/call`, { method: "POST", body: JSON.stringify({ type }) });
    const body = await res.json();
    setCallOpen(false);
    if (!res.ok) return setToast(body.error ?? "Erro");
    setToast(body.already ? t.waiterNotified : type === "bill" ? t.billRequested : t.waiterOnWay);
    refresh();
  }

  /** "Pedir de novo": recoloca o item no carrinho com os mesmos adicionais e observação. */
  function reorder(item: SessionState["items"][number]) {
    const menuItem = allItems.find((m) => m.id === item.menu_item_id);
    if (!menuItem || !menuItem.available) return setToast(t.soldOut);
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
    if (!window.confirm(t.cancelConfirm(item.name))) return;
    const res = await fetch(`/api/m/${token}/cancel`, { method: "POST", body: JSON.stringify({ item_id: item.id }) });
    const body = await res.json();
    setToast(res.ok ? t.cancelled : (body.error ?? "Erro"));
    refresh();
  }

  return (
    <AppCtx.Provider value={ctx}>
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col pb-40">
        <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3">
            <Logo restaurant={restaurant} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-bold leading-tight">{restaurant.name}</div>
              <div className="text-sm text-muted">
                {t.table} <span className="font-semibold text-brand">{tableNumber}</span> · {t.hello}, {me?.name}
              </div>
            </div>
            {features.languages && <LangSwitch lang={lang} onChange={setLang} />}
            {canCall && (
              <Button variant={activeCalls.size ? "secondary" : "primary"} size="sm" onClick={() => setCallOpen(true)} aria-label={t.callWaiter}>
                <Bell className="size-4" />
                {activeCalls.size ? t.called : t.waiter}
              </Button>
            )}
          </div>
          {tab === "menu" && <CategoryChips menu={menu} />}
        </header>

        {tab === "menu" && (
          <>
            {!features.customer_ordering && (
              <p className="mx-4 mt-4 rounded-xl bg-brand-soft px-4 py-3 text-sm font-medium text-brand">{t.askWaiterToOrder}</p>
            )}
            <MenuList menu={menu} onSelect={setSelected} />
          </>
        )}
        {tab === "orders" && <OrdersTab state={state!} onReorder={reorder} onCancel={cancelItem} />}
        {tab === "bill" && features.bill_view && (
          <BillTab state={state!} onRequestBill={features.request_bill ? () => call("bill") : undefined} billRequested={activeCalls.has("bill")} />
        )}

        {cartCount > 0 && tab === "menu" && features.customer_ordering && (
          <div className="fixed inset-x-0 bottom-[4.5rem] z-30 mx-auto max-w-xl px-4 pb-2">
            <Button size="lg" className="w-full justify-between shadow-lg" onClick={() => setCartOpen(true)}>
              <span className="flex items-center gap-2">
                <ShoppingBag className="size-5" /> {t.viewOrder} · {cartCount} {cartCount === 1 ? t.item : t.items}
              </span>
              <span>{formatBRL(cartTotal)}</span>
            </Button>
          </div>
        )}

        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white pb-[env(safe-area-inset-bottom)]">
          <div className={cn("mx-auto grid max-w-xl", tabs.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
            <NavButton active={tab === "menu"} onClick={() => setTab("menu")} icon={<UtensilsCrossed />} label={t.menu} />
            <NavButton active={tab === "orders"} onClick={() => setTab("orders")} icon={<ClipboardList />} label={t.orders} badge={myActiveItems || undefined} />
            {features.bill_view && <NavButton active={tab === "bill"} onClick={() => setTab("bill")} icon={<Receipt />} label={t.bill} />}
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
              setToast(`${line.name} ${t.added}`);
            }}
          />
        )}

        <CartSheet
          open={cartOpen && features.customer_ordering}
          cart={cart}
          guests={state!.guests}
          onClose={() => setCartOpen(false)}
          onChange={setCart}
          token={token}
          onConfirmed={() => {
            setCart([]);
            setCartOpen(false);
            setTab("orders");
            setToast(t.sentToKitchen);
            refresh();
          }}
          onError={setToast}
        />

        <Sheet open={callOpen} onClose={() => setCallOpen(false)} title={t.howHelp}>
          <div className="grid gap-3">
            {features.call_waiter && (
              <CallOption
                icon={<Bell className="size-6" />}
                title={t.callWaiter}
                hint={activeCalls.has("waiter") ? t.alreadyCalled : t.waiterComing}
                onClick={() => call("waiter")}
              />
            )}
            {features.request_bill && (
              <CallOption
                icon={<Receipt className="size-6" />}
                title={t.askBill}
                hint={activeCalls.has("bill") ? t.billAlready : t.billComing}
                onClick={() => call("bill")}
              />
            )}
          </div>
        </Sheet>

        {toast && (
          <div className="fixed inset-x-0 top-20 z-[60] flex justify-center px-4">
            <div className="animate-slide-up rounded-full bg-ink px-5 py-3 text-sm font-medium text-white shadow-xl">{toast}</div>
          </div>
        )}
      </div>
    </AppCtx.Provider>
  );
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

function LangSwitch({ lang, onChange }: { lang: Lang; onChange: (l: Lang) => void }) {
  return (
    <select
      value={lang}
      onChange={(e) => onChange(e.target.value as Lang)}
      className="rounded-lg border border-line bg-white px-1.5 py-1 text-sm font-semibold"
      aria-label="Idioma / Language"
    >
      <option value="pt">🇧🇷 PT</option>
      <option value="en">🇺🇸 EN</option>
      <option value="es">🇪🇸 ES</option>
    </select>
  );
}

function CallOption({ icon, title, hint, onClick }: { icon: React.ReactNode; title: string; hint: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-4 rounded-2xl border border-line p-4 text-left hover:border-brand">
      <span className="rounded-full bg-brand-soft p-3 text-brand">{icon}</span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="text-sm text-muted">{hint}</span>
      </span>
    </button>
  );
}

function Logo({ restaurant }: { restaurant: Props["restaurant"] }) {
  if (restaurant.logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={restaurant.logoUrl} alt="" className="size-11 rounded-xl object-cover" />;
  }
  return <div className="flex size-11 items-center justify-center rounded-xl bg-brand text-lg font-bold text-white">{restaurant.name.charAt(0)}</div>;
}

function NavButton({ active, onClick, icon, label, badge }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; badge?: number }) {
  return (
    <button
      onClick={onClick}
      className={cn("relative flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium [&_svg]:size-6", active ? "text-brand" : "text-muted")}
    >
      {icon}
      {label}
      {badge ? (
        <span className="absolute top-1.5 left-1/2 ml-2 flex size-5 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

// ---------------------------------------------------------------------------

function JoinScreen({
  token,
  tableNumber,
  restaurant,
  others,
  onJoined,
  onLang,
}: {
  token: string;
  tableNumber: number;
  restaurant: Props["restaurant"];
  others: string[];
  onJoined: () => void;
  onLang?: (l: Lang) => void;
}) {
  const { t, lang } = useApp();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/m/${token}/join`, { method: "POST", body: JSON.stringify({ name }) });
    setLoading(false);
    if (!res.ok) return setError((await res.json()).error ?? "Erro");
    onJoined();
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-gradient-to-b from-brand-soft to-canvas px-6 py-12">
      {onLang && (
        <div className="absolute top-4 right-4">
          <LangSwitch lang={lang} onChange={onLang} />
        </div>
      )}
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-4 flex justify-center">
          <Logo restaurant={restaurant} />
        </div>
        <p className="text-sm font-medium text-muted">{t.welcome}</p>
        <h1 className="text-2xl font-bold">{restaurant.name}</h1>
        <div className="mx-auto mt-6 inline-flex flex-col items-center rounded-3xl bg-white px-10 py-5 shadow-sm">
          <span className="text-xs font-semibold tracking-widest text-muted uppercase">{t.table}</span>
          <span className="mt-1 text-5xl leading-none font-extrabold text-brand">{tableNumber}</span>
        </div>

        <form onSubmit={submit} className="mt-8 space-y-3 text-left">
          <label className="block text-sm font-medium" htmlFor="name">
            {t.yourName}
          </label>
          <input id="name" autoFocus className={inputClass} placeholder={t.namePlaceholder} value={name} maxLength={30} onChange={(e) => setName(e.target.value)} />
          {others.length > 0 && (
            <p className="flex items-center gap-1.5 text-sm text-muted">
              <Users className="size-4" /> {t.alreadyHere} {others.join(", ")}
            </p>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={loading || name.trim().length < 2}>
            {loading ? <Spinner /> : t.seeMenu}
          </Button>
        </form>
      </div>
    </div>
  );
}

function ClosedScreen({
  token,
  restaurant,
  state,
  onNewVisit,
  onRated,
}: {
  token: string;
  restaurant: Props["restaurant"];
  state: SessionState;
  onNewVisit: () => void;
  onRated: () => void;
}) {
  const { t, features } = useApp();
  const mine = state.bill.guests.find((g) => g.guest.id === state.meId);
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="text-5xl">🙏</div>
      <h1 className="mt-4 text-2xl font-bold">{t.thanks}</h1>
      <p className="mt-2 text-muted">{t.closedAt(restaurant.name)}</p>
      {mine && mine.totalCents > 0 && features.bill_view && (
        <p className="mt-4 rounded-2xl bg-white px-5 py-3 shadow-sm">
          {t.yourShare}: <strong>{formatBRL(mine.totalCents)}</strong>
        </p>
      )}
      {features.ratings && <RatingCard token={token} rated={state.rated} onRated={onRated} />}
      <Button variant="secondary" className="mt-8" onClick={onNewVisit}>
        {t.newVisit}
      </Button>
    </div>
  );
}

function Stars({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => onChange(n)} aria-label={`${n}`}>
            <Star className={cn("size-8", n <= value ? "fill-amber-400 text-amber-400" : "text-stone-300")} />
          </button>
        ))}
      </div>
    </div>
  );
}

function RatingCard({ token, rated, onRated }: { token: string; rated: boolean; onRated: () => void }) {
  const { t } = useApp();
  const [food, setFood] = useState(0);
  const [service, setService] = useState(0);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(rated);

  if (done) return <p className="mt-6 font-medium text-emerald-700">{t.rateThanks}</p>;

  async function send() {
    setSending(true);
    const res = await fetch(`/api/m/${token}/rate`, { method: "POST", body: JSON.stringify({ food, service, comment }) });
    setSending(false);
    if (res.ok) {
      setDone(true);
      onRated();
    }
  }

  return (
    <div className="mt-6 w-full max-w-sm space-y-3 rounded-3xl bg-white p-5 text-left shadow-sm">
      <div className="font-bold">{t.rateTitle}</div>
      <Stars label={t.rateFood} value={food} onChange={setFood} />
      <Stars label={t.rateService} value={service} onChange={setService} />
      <textarea className={inputClass} rows={2} maxLength={500} placeholder={t.rateComment} value={comment} onChange={(e) => setComment(e.target.value)} />
      <Button className="w-full" disabled={!food || !service || sending} onClick={send}>
        {sending ? <Spinner /> : t.rateSend}
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------

function CategoryChips({ menu }: { menu: PublicMenu }) {
  const { lang } = useApp();
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3">
      {menu.categories.map((c) => (
        <button
          key={c.id}
          onClick={() => document.getElementById(`cat-${c.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}
          className={cn(
            "shrink-0 rounded-full border border-line bg-white px-4 py-1.5 text-sm font-medium whitespace-nowrap hover:border-brand hover:text-brand",
            !c.open && "opacity-50",
          )}
        >
          {tr(lang, c).name}
        </button>
      ))}
    </div>
  );
}

const BADGE_CLASS = { popular: "bg-amber-100 text-amber-800", new: "bg-sky-100 text-sky-800", featured: "bg-brand-soft text-brand" };

function ItemBadges({ item }: { item: PublicMenuItem }) {
  const { t } = useApp();
  if (!item.badges.length && !item.tags.length && item.original_price_cents == null && item.stock_left == null) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {item.original_price_cents != null && <Badge className="bg-emerald-100 text-emerald-800">{t.happyHour}</Badge>}
      {item.badges.map((b) => (
        <Badge key={b} className={BADGE_CLASS[b]}>
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

function Price({ item }: { item: PublicMenuItem }) {
  return (
    <span>
      {item.original_price_cents != null && <span className="mr-1.5 text-sm font-normal text-muted line-through">{formatBRL(item.original_price_cents)}</span>}
      {formatBRL(item.price_cents)}
    </span>
  );
}

function MenuList({ menu, onSelect }: { menu: PublicMenu; onSelect: (item: PublicMenuItem) => void }) {
  const { t, lang, features } = useApp();
  const [filter, setFilter] = useState<string | null>(null);
  const tags = useMemo(() => [...new Set(menu.categories.flatMap((c) => c.items.flatMap((i) => i.tags)))], [menu]);

  if (menu.categories.length === 0) return <p className="p-8 text-center text-muted">{t.menuSoon}</p>;

  return (
    <div className="space-y-6 px-4 pt-4">
      {features.dietary && tags.length > 0 && (
        <div className="no-scrollbar -mb-2 flex gap-2 overflow-x-auto">
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => setFilter(filter === tag ? null : tag)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-xs font-semibold",
                filter === tag ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-800",
              )}
            >
              {filter === tag && "✓ "}
              {t.tags[tag] ?? tag}
            </button>
          ))}
        </div>
      )}
      {menu.categories.map((c) => {
        const items = c.items.filter((i) => !filter || i.tags.includes(filter));
        if (!items.length) return null;
        return (
          <section key={c.id} id={`cat-${c.id}`} className="scroll-mt-32">
            <h2 className="mb-1 text-lg font-bold">{tr(lang, c).name}</h2>
            {c.window && (
              <p className={cn("mb-2 flex items-center gap-1 text-xs", c.open ? "text-muted" : "font-semibold text-amber-700")}>
                <Clock className="size-3.5" /> {c.window}
              </p>
            )}
            <div className={cn("divide-y divide-line overflow-hidden rounded-2xl bg-white shadow-sm", !c.open && "opacity-60")}>
              {items.map((item) => {
                const { name, description } = tr(lang, item);
                const disabled = !item.available || !c.open;
                return (
                  <button
                    key={item.id}
                    disabled={disabled}
                    onClick={() => onSelect(item)}
                    className="flex w-full gap-3 p-4 text-left transition-colors hover:bg-stone-50 disabled:cursor-not-allowed"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{name}</div>
                      {description && <p className="mt-0.5 line-clamp-2 text-sm text-muted">{description}</p>}
                      {item.combo.length > 0 && (
                        <p className="mt-0.5 text-xs text-muted">
                          {t.comboIncludes}: {item.combo.join(" + ")}
                        </p>
                      )}
                      <ItemBadges item={item} />
                      <div className="mt-2 flex items-center gap-3 font-semibold text-ink">
                        {item.available ? <Price item={item} /> : <Badge className="bg-stone-200 text-stone-600">{t.soldOut}</Badge>}
                        {item.eta_min && item.available && (
                          <span className="flex items-center gap-1 text-xs font-normal text-muted">
                            <Clock className="size-3.5" /> {t.eta(item.eta_min)}
                          </span>
                        )}
                      </div>
                    </div>
                    {item.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image_url} alt="" loading="lazy" className={cn("size-24 shrink-0 rounded-xl object-cover", disabled && "grayscale")} />
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------

function ShareSelector({ others, value, onChange }: { others: { id: string; name: string }[]; value: Share; onChange: (s: Share) => void }) {
  const { t } = useApp();
  const custom = Array.isArray(value) ? value : [];
  const pill = (active: boolean) =>
    cn(
      "rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
      active ? "border-brand bg-brand text-white" : "border-line bg-white text-ink hover:border-brand",
    );
  return (
    <div>
      <div className="mb-2 text-sm font-semibold">{t.splitQuestion}</div>
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
        <div className="mt-3 flex flex-wrap gap-2 rounded-2xl bg-canvas p-3">
          {others.map((g) => {
            const on = custom.includes(g.id);
            return (
              <button type="button" key={g.id} onClick={() => onChange(on ? custom.filter((id) => id !== g.id) : [...custom, g.id])} className={pill(on)}>
                {on ? "✓ " : ""}
                {g.name}
              </button>
            );
          })}
        </div>
      )}
      <p className="mt-2 text-xs text-muted">
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
              <span>{formatBRL(unitPrice * qty)}</span>
            </Button>
          </div>
        ) : undefined
      }
    >
      {item.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.image_url} alt="" className="mb-4 aspect-video w-full rounded-2xl object-cover" />
      )}
      {description && <p className="text-muted">{description}</p>}
      {item.combo.length > 0 && (
        <p className="mt-1 text-sm text-muted">
          {t.comboIncludes}: {item.combo.join(" + ")}
        </p>
      )}
      <ItemBadges item={item} />
      <div className="mt-2 flex items-center gap-3 text-lg font-bold">
        <Price item={item} />
        {item.eta_min && (
          <span className="flex items-center gap-1 text-sm font-normal text-muted">
            <Clock className="size-4" /> {t.eta(item.eta_min)}
          </span>
        )}
      </div>

      {canOrder && item.options.length > 0 && (
        <div className="mt-5">
          <div className="mb-2 text-sm font-semibold">{t.addons}</div>
          <div className="divide-y divide-line rounded-2xl border border-line">
            {item.options.map((o) => (
              <label key={o.id} className="flex cursor-pointer items-center gap-3 px-4 py-3">
                <input
                  type="checkbox"
                  className="size-5 accent-[var(--color-brand)]"
                  checked={optionIds.includes(o.id)}
                  onChange={(e) => setOptionIds(e.target.checked ? [...optionIds, o.id] : optionIds.filter((id) => id !== o.id))}
                />
                <span className="flex-1">{o.name}</span>
                {o.price_cents > 0 && <span className="text-sm text-muted">+ {formatBRL(o.price_cents)}</span>}
              </label>
            ))}
          </div>
        </div>
      )}

      {canOrder && (
        <div className="mt-5">
          <label className="mb-2 block text-sm font-semibold" htmlFor="note">
            {t.anyNote}
          </label>
          <textarea
            id="note"
            rows={2}
            maxLength={200}
            className={inputClass}
            placeholder={t.notePlaceholder}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      )}

      {canOrder && features.item_sharing && (
        <div className="mt-5">
          <ShareSelector others={others} value={share} onChange={setShare} />
        </div>
      )}

      {pairs.length > 0 && (
        <div className="mt-6">
          <div className="mb-2 text-sm font-semibold">{t.pairsWith}</div>
          <div className="no-scrollbar flex gap-3 overflow-x-auto">
            {pairs.map((p) => (
              <button key={p.id} onClick={() => onSelect(p)} className="w-36 shrink-0 overflow-hidden rounded-2xl border border-line text-left hover:border-brand">
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image_url} alt="" className="aspect-[4/3] w-full object-cover" />
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center bg-brand-soft text-brand">
                    <UtensilsCrossed className="size-6" />
                  </div>
                )}
                <div className="p-2 text-sm">
                  <div className="line-clamp-2 font-medium">{tr(lang, p).name}</div>
                  <div className="text-muted">{formatBRL(p.price_cents)}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </Sheet>
  );
}

function QtyStepper({ value, onChange, min = 1 }: { value: number; onChange: (n: number) => void; min?: number }) {
  return (
    <div className="flex items-center rounded-xl border border-line">
      <button className="p-3 text-brand disabled:text-stone-300" disabled={value <= min} onClick={() => onChange(value - 1)} aria-label="-">
        <Minus className="size-4" />
      </button>
      <span className="w-6 text-center font-semibold">{value}</span>
      <button className="p-3 text-brand" onClick={() => onChange(Math.min(value + 1, 50))} aria-label="+">
        <Plus className="size-4" />
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
  guests,
  token,
  onClose,
  onChange,
  onConfirmed,
  onError,
}: {
  open: boolean;
  cart: CartLine[];
  guests: { id: string; name: string }[];
  token: string;
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
    const res = await fetch(`/api/m/${token}/order`, {
      method: "POST",
      body: JSON.stringify({
        items: cart.map((l) => ({ menu_item_id: l.menuItemId, qty: l.qty, option_ids: l.optionIds, note: l.note, share: l.share })),
      }),
    });
    setSending(false);
    if (!res.ok) return onError((await res.json()).error ?? "Erro");
    onConfirmed();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t.yourOrder}
      footer={
        <Button size="lg" className="w-full justify-between" disabled={sending || cart.length === 0} onClick={confirm}>
          {sending ? <Spinner /> : <span>{t.confirm}</span>}
          <span>{formatBRL(total)}</span>
        </Button>
      }
    >
      {cart.length === 0 ? (
        <p className="py-8 text-center text-muted">{t.emptyCart}</p>
      ) : (
        <div className="divide-y divide-line">
          {cart.map((line) => {
            const shared = shareLabel(t, line.share, guests);
            return (
              <div key={line.key} className="flex gap-3 py-4">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{line.name}</div>
                  {line.optionNames.length > 0 && <div className="text-sm text-muted">+ {line.optionNames.join(", ")}</div>}
                  {line.note && <div className="text-sm text-amber-700">“{line.note}”</div>}
                  {shared && (
                    <div className="mt-1 flex items-center gap-1 text-xs font-medium text-brand">
                      <Users className="size-3.5" /> {shared}
                    </div>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    <QtyStepper value={line.qty} onChange={(qty) => onChange(cart.map((l) => (l.key === line.key ? { ...l, qty } : l)))} />
                    <button className="p-2 text-muted hover:text-red-600" onClick={() => onChange(cart.filter((l) => l.key !== line.key))} aria-label="Remover">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
                <div className="font-semibold">{formatBRL(line.qty * line.unitPrice)}</div>
              </div>
            );
          })}
        </div>
      )}
      <p className="mt-2 flex items-start gap-2 rounded-xl bg-canvas p-3 text-sm text-muted">
        <ChefHat className="mt-0.5 size-4 shrink-0" />
        {t.goesToKitchen}
      </p>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------

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
    <div className="px-4 pt-4">
      <Segmented
        value={scope}
        onChange={setScope}
        options={[
          { value: "me", label: t.myOrders },
          { value: "table", label: t.wholeTable },
        ]}
      />
      {items.length === 0 ? (
        <p className="py-12 text-center text-muted">{t.noOrders}</p>
      ) : (
        <div className="mt-4 divide-y divide-line overflow-hidden rounded-2xl bg-white shadow-sm">
          {items.map((i) => {
            const mine = i.guest_id === state.meId;
            return (
              <div key={i.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className={cn("font-semibold", i.status === "cancelled" && "text-muted line-through")}>
                      {i.qty}× {i.name}
                    </div>
                    {i.options.length > 0 && <div className="text-sm text-muted">+ {i.options.map((o) => o.name).join(", ")}</div>}
                    {i.note && <div className="text-sm text-amber-700">“{i.note}”</div>}
                    <div className="mt-1 text-xs text-muted">
                      {scope === "table" && (
                        <>
                          {t.orderedBy} {names.get(i.guest_id)} ·{" "}
                        </>
                      )}
                      {i.share_mode === "all" && t.sharedAll}
                      {i.share_mode === "custom" && `${t.sharedWith}: ${i.share_guest_ids.map((id) => names.get(id)).filter(Boolean).join(", ")}`}
                    </div>
                  </div>
                  <Badge className={STATUS_CLASS[i.status]}>{t.status[i.status]}</Badge>
                </div>
                {mine && features.customer_ordering && (
                  <div className="mt-2 flex gap-2">
                    {features.reorder && i.menu_item_id && i.status !== "cancelled" && (
                      <button
                        onClick={() => onReorder(i)}
                        className="flex items-center gap-1 rounded-lg bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand"
                      >
                        <RotateCcw className="size-3.5" /> {t.orderAgain}
                      </button>
                    )}
                    {features.cancel_pending && i.status === "pending" && (
                      <button
                        onClick={() => onCancel(i)}
                        className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-muted hover:bg-red-50 hover:text-red-600"
                      >
                        <X className="size-3.5" /> {t.cancel}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BillTab({ state, onRequestBill, billRequested }: { state: SessionState; onRequestBill?: () => void; billRequested: boolean }) {
  const { t } = useApp();
  const { bill } = state;
  const mine = bill.guests.find((g) => g.guest.id === state.meId);
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-4 px-4 pt-4">
      {mine && (
        <div className="rounded-3xl bg-ink p-5 text-white shadow-lg">
          <div className="text-sm text-white/70">{t.yourShare}</div>
          <div className="mt-1 text-4xl font-extrabold">{formatBRL(mine.totalCents)}</div>
          <div className="mt-4 space-y-1.5 text-sm">
            {mine.lines.map((l) => (
              <div key={l.itemId} className="flex justify-between gap-3">
                <span className="text-white/85">
                  {l.qty}× {l.name}
                  {l.splitCount > 1 && <span className="text-white/60"> (÷{l.splitCount})</span>}
                </span>
                <span>{formatBRL(l.amountCents)}</span>
              </div>
            ))}
            {bill.serviceFeePct > 0 && (
              <div className="flex justify-between border-t border-white/15 pt-1.5 text-white/70">
                <span>
                  {t.service} ({bill.serviceFeePct}%)
                </span>
                <span>{formatBRL(mine.serviceCents)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="border-b border-line px-4 py-3 text-sm font-semibold text-muted">{t.eachSpent}</div>
        {bill.guests.map((g) => (
          <div key={g.guest.id} className="border-b border-line last:border-0">
            <button className="flex w-full items-center justify-between px-4 py-3 text-left" onClick={() => setExpanded(expanded === g.guest.id ? null : g.guest.id)}>
              <span className="font-medium">
                {g.guest.name}
                {g.guest.id === state.meId && <span className="text-muted"> ({t.you})</span>}
                {g.guest.paid_at && <Badge className="ml-2 bg-emerald-100 text-emerald-800">{t.paid}</Badge>}
              </span>
              <span className="font-semibold">{formatBRL(g.totalCents)}</span>
            </button>
            {expanded === g.guest.id && (
              <div className="space-y-1 bg-canvas px-4 py-3 text-sm">
                {g.lines.length === 0 && <div className="text-muted">{t.noItems}</div>}
                {g.lines.map((l) => (
                  <div key={l.itemId} className="flex justify-between gap-3">
                    <span>
                      {l.qty}× {l.name}
                      {l.splitCount > 1 && <span className="text-muted"> (÷{l.splitCount})</span>}
                    </span>
                    <span>{formatBRL(l.amountCents)}</span>
                  </div>
                ))}
                {bill.serviceFeePct > 0 && (
                  <div className="flex justify-between text-muted">
                    <span>{t.service}</span>
                    <span>{formatBRL(g.serviceCents)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        <div className="flex justify-between bg-canvas px-4 py-3 font-bold">
          <span>{t.tableTotal}</span>
          <span>{formatBRL(bill.totalCents)}</span>
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

function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="grid grid-cols-2 rounded-xl bg-stone-200/70 p-1">
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)} className={cn("rounded-lg py-2 text-sm font-semibold", value === o.value ? "bg-white shadow-sm" : "text-muted")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
