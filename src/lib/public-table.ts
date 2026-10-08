import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { computeBill } from "./bill";
import { resolveFeatures } from "./features";
import { describeWindow, effectivePrice, isCategoryOpen, localNow } from "./menu-rules";
import { fetchAll } from "./stats";
import { createAdminClient } from "./supabase/server";
import type {
  Category,
  Guest,
  ItemOption,
  MenuItem,
  OrderItem,
  OrderItemShare,
  Restaurant,
  Table,
  TableSession,
  Translations,
  WaiterCall,
} from "./types";

// Tudo aqui roda com service role, pois o cliente da mesa é anônimo.
// A "chave" de acesso do cliente é o qr_token da mesa + o cookie secreto do guest.

export const guestCookieName = (token: string) => `bm_${token}`;

/** `cache`: generateMetadata e a página compartilham a mesma consulta. */
export const loadTable = cache(async (token: string) => {
  const db = createAdminClient();
  const { data: table } = await db.from("tables").select("*").eq("qr_token", token).eq("active", true).maybeSingle<Table>();
  if (!table) return null;
  const { data: restaurant } = await db
    .from("restaurants")
    .select("*")
    .eq("id", table.restaurant_id)
    .eq("active", true)
    .maybeSingle<Restaurant>();
  if (!restaurant) return null;
  return { table, restaurant };
});

export interface PublicMenuItem {
  id: string;
  name: string;
  description: string | null;
  /** preço vigente (happy hour aplicado) */
  price_cents: number;
  /** preço cheio, quando há happy hour ativo */
  original_price_cents: number | null;
  image_url: string | null;
  available: boolean;
  options: Pick<ItemOption, "id" | "name" | "price_cents">[];
  tags: string[];
  badges: ("popular" | "new" | "featured")[];
  pairs_with: string[];
  translations: Translations;
  combo: string[];
  eta_min: number | null;
  stock_left: number | null;
}

export interface PublicMenu {
  categories: {
    id: string;
    name: string;
    translations: Translations;
    open: boolean;
    window: string | null;
    items: PublicMenuItem[];
  }[];
}

// Estatísticas do cardápio (mais pedidos e tempo de preparo) mudam devagar:
// guardamos por 5 minutos por restaurante para não recalcular a cada scan.
const statsCache = new Map<string, { at: number; popular: Set<string>; eta: Map<string, number> }>();

async function menuStats(restaurantId: string) {
  const hit = statsCache.get(restaurantId);
  if (hit && Date.now() - hit.at < 5 * 60_000) return hit;
  const db = createAdminClient();
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const rows = await fetchAll<{ menu_item_id: string | null; qty: number; created_at: string; ready_at: string | null }>((a, b) =>
    db
      .from("order_items")
      .select("menu_item_id, qty, created_at, ready_at")
      .eq("restaurant_id", restaurantId)
      .neq("status", "cancelled")
      .gte("created_at", since)
      .order("created_at")
      .range(a, b),
  );
  const sold = new Map<string, number>();
  const prep = new Map<string, number[]>();
  for (const r of rows) {
    if (!r.menu_item_id) continue;
    sold.set(r.menu_item_id, (sold.get(r.menu_item_id) ?? 0) + r.qty);
    if (r.ready_at) {
      const min = (new Date(r.ready_at).getTime() - new Date(r.created_at).getTime()) / 60000;
      if (min > 0 && min < 180) prep.set(r.menu_item_id, [...(prep.get(r.menu_item_id) ?? []), min]);
    }
  }
  const popular = new Set([...sold.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).filter(([, n]) => n >= 3).map(([id]) => id));
  const eta = new Map<string, number>();
  for (const [id, list] of prep) {
    if (list.length < 3) continue;
    const sorted = [...list].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    eta.set(id, Math.max(5, Math.ceil(median / 5) * 5));
  }
  const entry = { at: Date.now(), popular, eta };
  statsCache.set(restaurantId, entry);
  return entry;
}

export async function loadMenu(restaurant: Restaurant): Promise<PublicMenu> {
  const features = resolveFeatures(restaurant.features);
  const db = createAdminClient();
  const [{ data: categories }, { data: items }, { data: options }, stats] = await Promise.all([
    db.from("categories").select("*").eq("restaurant_id", restaurant.id).order("sort").order("name"),
    db.from("menu_items").select("*").eq("restaurant_id", restaurant.id).order("sort").order("name"),
    db.from("item_options").select("*").eq("restaurant_id", restaurant.id).order("sort").order("name"),
    features.suggestions || features.eta ? menuStats(restaurant.id) : Promise.resolve(null),
  ]);
  const optionsByItem = new Map<string, ItemOption[]>();
  for (const o of (options ?? []) as ItemOption[]) {
    optionsByItem.set(o.menu_item_id, [...(optionsByItem.get(o.menu_item_id) ?? []), o]);
  }
  const now = localNow();
  // "Novo" = adicionado nos últimos 14 dias E depois da montagem inicial do cardápio
  // (num restaurante recém-cadastrado, senão, todos os pratos seriam "novos").
  const firstItemAt = Math.min(...((items ?? []) as MenuItem[]).map((i) => new Date(i.created_at).getTime()), Date.now());
  const newSince = Math.max(Date.now() - 14 * 86400000, firstItemAt + 3 * 86400000);

  return {
    categories: ((categories ?? []) as Category[])
      .map((c) => ({
        id: c.id,
        name: c.name,
        translations: features.languages ? (c.translations ?? {}) : {},
        open: isCategoryOpen(c, features.scheduled_menu, now),
        window: features.scheduled_menu && (c.start_time || (c.days && c.days.length < 7)) ? describeWindow(c.days, c.start_time, c.end_time) : null,
        items: ((items ?? []) as MenuItem[])
          .filter((i) => i.category_id === c.id)
          .map((i): PublicMenuItem => {
            const { price, promo } = effectivePrice(i, features.scheduled_menu, now);
            const badges: PublicMenuItem["badges"] = [];
            if (features.suggestions) {
              if (i.featured) badges.push("featured");
              if (stats?.popular.has(i.id)) badges.push("popular");
              if (new Date(i.created_at).getTime() > newSince) badges.push("new");
            }
            return {
              id: i.id,
              name: i.name,
              description: i.description,
              price_cents: price,
              original_price_cents: promo ? i.price_cents : null,
              image_url: i.image_url,
              available: i.available,
              options: (optionsByItem.get(i.id) ?? []).map((o) => ({ id: o.id, name: o.name, price_cents: o.price_cents })),
              tags: features.dietary ? (i.tags ?? []) : [],
              badges,
              pairs_with: features.suggestions ? (i.pairs_with ?? []) : [],
              translations: features.languages ? (i.translations ?? {}) : {},
              combo: features.combos ? (i.combo_items ?? []).map((x) => `${x.qty}× ${x.name}`) : [],
              eta_min: features.eta ? (stats?.eta.get(i.id) ?? null) : null,
              stock_left: features.stock && i.stock_qty != null && i.stock_qty <= 5 ? i.stock_qty : null,
            };
          }),
      }))
      .filter((c) => c.items.length > 0),
  };
}

export async function findOpenSession(tableId: string) {
  const db = createAdminClient();
  const { data } = await db.from("table_sessions").select("*").eq("table_id", tableId).eq("status", "open").maybeSingle<TableSession>();
  return data;
}

/** Retorna o cliente identificado pelo cookie, junto com a sessão (aberta ou já encerrada). */
export async function currentGuest(token: string, tableId: string) {
  const secret = (await cookies()).get(guestCookieName(token))?.value;
  if (!secret) return null;
  const db = createAdminClient();
  const { data: guest } = await db.from("guests").select("*").eq("secret", secret).maybeSingle<Guest & { secret: string }>();
  if (!guest) return null;
  const { data: session } = await db.from("table_sessions").select("*").eq("id", guest.session_id).maybeSingle<TableSession>();
  if (!session || session.table_id !== tableId) return null;
  return { guest, session };
}

export async function loadSessionState(session: TableSession, restaurant: Restaurant, meId: string) {
  const db = createAdminClient();
  const [{ data: guests }, { data: items }, { data: calls }, { data: rating }] = await Promise.all([
    db.from("guests").select("id, session_id, name, paid_at, created_at").eq("session_id", session.id).order("created_at"),
    db.from("order_items").select("*").eq("session_id", session.id).order("created_at"),
    db.from("waiter_calls").select("*").eq("session_id", session.id).eq("status", "open"),
    meId ? db.from("ratings").select("id").eq("guest_id", meId).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const itemList = (items ?? []) as OrderItem[];
  const customIds = itemList.filter((i) => i.share_mode === "custom").map((i) => i.id);
  const { data: shares } = customIds.length
    ? await db.from("order_item_shares").select("order_item_id, guest_id").in("order_item_id", customIds)
    : { data: [] };

  const guestList = (guests ?? []) as Guest[];
  const shareList = (shares ?? []) as OrderItemShare[];
  const bill = computeBill(guestList, itemList, shareList, Number(restaurant.service_fee_pct));

  return {
    session: { id: session.id, status: session.status, opened_at: session.opened_at },
    meId,
    guests: guestList.map((g) => ({ id: g.id, name: g.name, paid: !!g.paid_at })),
    items: itemList.map((i) => ({
      id: i.id,
      guest_id: i.guest_id,
      menu_item_id: i.menu_item_id,
      name: i.name,
      options: i.options,
      qty: i.qty,
      note: i.note,
      unit_price_cents: i.unit_price_cents,
      discount_cents: i.discount_cents ?? 0,
      share_mode: i.share_mode,
      share_guest_ids: shareList.filter((s) => s.order_item_id === i.id).map((s) => s.guest_id),
      status: i.status,
      created_at: i.created_at,
    })),
    openCalls: ((calls ?? []) as WaiterCall[]).map((c) => ({ type: c.type, created_at: c.created_at })),
    rated: !!rating,
    bill,
  };
}

export type SessionState = Awaited<ReturnType<typeof loadSessionState>>;

export type PublicState =
  | { joined: false; guests: string[] }
  | { joined: true; closed: boolean; state: SessionState };

/** Estado da mesa do ponto de vista do cliente que fez a requisição. */
export async function getPublicState(token: string, table: Table, restaurant: Restaurant): Promise<PublicState> {
  const me = await currentGuest(token, table.id);
  if (!me) {
    // Ainda não entrou: mostra quem já está na mesa, para ajudar a evitar nomes repetidos.
    const open = await findOpenSession(table.id);
    const state = open ? await loadSessionState(open, restaurant, "") : null;
    return { joined: false, guests: state?.guests.map((g) => g.name) ?? [] };
  }
  return {
    joined: true,
    closed: me.session.status === "closed",
    state: await loadSessionState(me.session, restaurant, me.guest.id),
  };
}
