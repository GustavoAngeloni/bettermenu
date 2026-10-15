import { cleanNeeds, type AccessNeed } from "@/lib/access-needs";
import { computeBill } from "@/lib/bill";
import type { PublicMenu, PublicMenuItem, PublicState } from "@/lib/public-table";
import type { OrderItem } from "@/lib/types";
import type { TableApi } from "../m/[token]/customer-app";

// Cardápio fictício para a demonstração pública (/demo). Nada aqui toca o banco.

const img = (id: string) => `https://images.unsplash.com/photo-${id}?w=900&q=70&auto=format&fit=crop`;

export const DEMO_RESTAURANT = {
  name: "Brasa & Vinho",
  logoUrl: null,
  serviceFeePct: 10,
  coverUrl: img("1414235077428-338989a2e8c0"),
  tagline: "Cozinha de fogo, vinhos naturais e mesa longa para os amigos.",
};

function item(p: Partial<PublicMenuItem> & Pick<PublicMenuItem, "id" | "name" | "price_cents">): PublicMenuItem {
  return {
    description: null,
    original_price_cents: null,
    image_url: null,
    available: true,
    options: [],
    tags: [],
    badges: [],
    pairs_with: [],
    translations: {},
    combo: [],
    eta_min: null,
    stock_left: null,
    ...p,
  };
}

export const DEMO_MENU: PublicMenu = {
  categories: [
    {
      id: "entradas",
      name: "Para começar",
      translations: { en: { name: "Starters" }, es: { name: "Entradas" } },
      open: true,
      window: null,
      items: [
        item({
          id: "tartare",
          name: "Tartare de salmão",
          description: "Salmão curado na casa, ovas, abacate e crocante de arroz.",
          price_cents: 5800,
          image_url: img("1625944525533-473f1a3d54e7"),
          badges: ["new"],
          tags: ["sem_gluten"],
          eta_min: 10,
          translations: { en: { name: "Salmon tartare", description: "House-cured salmon, roe, avocado and crispy rice." } },
        }),
        item({
          id: "almondegas",
          name: "Almôndegas da nonna",
          description: "Ao sugo de tomate assado, rúcula e parmesão 24 meses.",
          price_cents: 4200,
          image_url: img("1529042410759-befb1204b468"),
          eta_min: 15,
        }),
        item({
          id: "salada",
          name: "Salada da horta",
          description: "Folhas do dia, legumes tostados, grão-de-bico e molho de tahine.",
          price_cents: 3600,
          image_url: img("1512621776951-a57141f2eefd"),
          tags: ["vegano", "sem_gluten"],
          options: [{ id: "salada-frango", name: "Frango grelhado", price_cents: 1200 }],
        }),
      ],
    },
    {
      id: "principais",
      name: "Do fogo",
      translations: { en: { name: "From the fire" }, es: { name: "Del fuego" } },
      open: true,
      window: null,
      items: [
        item({
          id: "ancho",
          name: "Bife ancho na brasa",
          description: "300 g de ancho maturado, fritas rústicas e chimichurri de ervas frescas.",
          price_cents: 11900,
          image_url: img("1600891964092-4316c288032e"),
          badges: ["featured", "popular"],
          eta_min: 25,
          pairs_with: ["oldfashioned", "salada"],
          options: [
            { id: "ancho-ovo", name: "Ovo caipira", price_cents: 600 },
            { id: "ancho-farofa", name: "Farofa de bacon", price_cents: 900 },
          ],
          translations: { en: { name: "Flame-grilled ribeye", description: "300 g dry-aged ribeye, rustic fries and fresh herb chimichurri." } },
        }),
        item({
          id: "camarao",
          name: "Spaghetti de camarão",
          description: "Camarões salteados no alho, tomate-cereja, pimenta e manteiga de ervas.",
          price_cents: 8900,
          image_url: img("1563379926898-05f4575a45d8"),
          badges: ["featured"],
          tags: ["picante"],
          eta_min: 20,
          pairs_with: ["maracuja"],
        }),
        item({
          id: "burger",
          name: "Burger da casa",
          description: "Blend de 180 g, queijo meia-cura, cebola caramelizada e maionese defumada.",
          price_cents: 5400,
          image_url: img("1568901346375-23c9450c58cd"),
          badges: ["popular"],
          eta_min: 18,
          options: [
            { id: "burger-bacon", name: "Bacon crocante", price_cents: 800 },
            { id: "burger-cheddar", name: "Cheddar extra", price_cents: 600 },
            { id: "burger-fritas", name: "Fritas rústicas", price_cents: 1400 },
          ],
        }),
        item({
          id: "porco",
          name: "Bisteca com abacaxi na brasa",
          description: "Bisteca suína alta, abacaxi tostado com melaço e brócolis no limão.",
          price_cents: 7600,
          original_price_cents: 8400,
          image_url: img("1432139555190-58524dae6a55"),
          stock_left: 3,
        }),
        item({
          id: "penne",
          name: "Penne all'arrabbiata",
          description: "Molho de tomate San Marzano, alho e pimenta calabresa.",
          price_cents: 4800,
          image_url: img("1621996346565-e3dbc646d9a9"),
          tags: ["vegano", "picante"],
        }),
      ],
    },
    {
      id: "sobremesas",
      name: "Sobremesas",
      translations: { en: { name: "Desserts" }, es: { name: "Postres" } },
      open: true,
      window: null,
      items: [
        item({
          id: "tiramisu",
          name: "Tiramisù",
          description: "Mascarpone, café coado na hora e cacau 70%. Montado na taça.",
          price_cents: 3200,
          image_url: img("1571877227200-a0d98ea607e9"),
          badges: ["featured"],
        }),
        item({
          id: "brownie",
          name: "Brownie quente",
          description: "Com sorvete de baunilha e calda de chocolate belga.",
          price_cents: 2900,
          image_url: img("1606313564200-e75d5e30476c"),
        }),
        item({ id: "petit", name: "Pudim de leite", description: "Receita da família, calda de caramelo queimado.", price_cents: 2200, available: false }),
      ],
    },
    {
      id: "bebidas",
      name: "Para beber",
      translations: { en: { name: "Drinks" }, es: { name: "Bebidas" } },
      open: true,
      window: "17h às 20h · happy hour",
      items: [
        item({
          id: "negroni",
          name: "Negroni da casa",
          description: "Gin, vermute rosso e bitter, com casca de laranja queimada.",
          price_cents: 3800,
          image_url: img("1514362545857-3bc16c4c7d1b"),
        }),
        item({
          id: "oldfashioned",
          name: "Old fashioned",
          description: "Bourbon, açúcar demerara e angostura.",
          price_cents: 4200,
          image_url: img("1470337458703-46ad1756a187"),
        }),
        item({
          id: "maracuja",
          name: "Suco de maracujá",
          description: "Fruta fresca, sem açúcar adicionado.",
          price_cents: 1400,
          image_url: img("1534353473418-4cfa6c56fd38"),
          tags: ["vegano"],
        }),
        item({ id: "agua", name: "Água com gás", description: "Garrafa 500 ml.", price_cents: 900 }),
      ],
    },
  ],
};

const ALL = DEMO_MENU.categories.flatMap((c) => c.items);
const OTHERS = [
  { id: "g-marina", name: "Marina" },
  { id: "g-pedro", name: "Pedro" },
];

/**
 * "Servidor" da demonstração: guarda a mesa em memória e faz os pedidos andarem
 * sozinhos (Recebido → Em preparo → Pronto → Entregue) para mostrar o acompanhamento.
 */
export function createDemoApi(): TableApi {
  const start = Date.now() - 25 * 60_000;
  const at = (min: number) => new Date(start + min * 60_000).toISOString();
  let me: { id: string; name: string } | null = null;
  const calls: { type: "waiter" | "bill"; created_at: string }[] = [];
  let rated = false;
  let seq = 0;

  const items: (OrderItem & { share_guest_ids: string[] })[] = [
    demoItem("g-marina", "negroni", 2, "delivered", at(2), "all"),
    demoItem("g-pedro", "almondegas", 1, "delivered", at(4), "all"),
    demoItem("g-pedro", "burger", 1, "preparing", at(18)),
  ];

  function demoItem(guest: string, menuId: string, qty: number, status: OrderItem["status"], created: string, share: OrderItem["share_mode"] = "me", options: { name: string; price_cents: number }[] = [], note: string | null = null, shareIds: string[] = []) {
    const m = ALL.find((i) => i.id === menuId)!;
    const unit = m.price_cents + options.reduce((s, o) => s + o.price_cents, 0);
    return {
      id: `i${++seq}`,
      restaurant_id: "demo",
      order_id: "o",
      session_id: "s",
      table_id: "t",
      guest_id: guest,
      menu_item_id: menuId,
      station_id: null,
      name: m.name,
      options,
      unit_price_cents: unit,
      qty,
      note,
      share_mode: share,
      status,
      created_at: created,
      started_at: null,
      ready_at: null,
      delivered_at: null,
      cancelled_at: null,
      cancel_reason: null,
      created_by: null,
      discount_cents: 0,
      discount_reason: null,
      combo_items: [],
      share_guest_ids: shareIds,
    };
  }

  function advance(id: string) {
    const steps: [OrderItem["status"], number][] = [
      ["preparing", 5000],
      ["ready", 13000],
      ["delivered", 21000],
    ];
    for (const [status, ms] of steps)
      setTimeout(() => {
        const it = items.find((i) => i.id === id);
        if (it && it.status !== "cancelled") it.status = status;
      }, ms);
  }

  let needs: AccessNeed[] = [];

  function state(): PublicState {
    if (!me) return { joined: false, guests: OTHERS.map((g) => g.name) };
    const guests = [...OTHERS, me].map((g, i) => ({ id: g.id, name: g.name, paid_at: null, created_at: at(i) }));
    const shares = items.flatMap((i) => i.share_guest_ids.map((g) => ({ order_item_id: i.id, guest_id: g })));
    return {
      joined: true,
      closed: false,
      state: {
        session: { id: "s", status: "open", opened_at: at(0) },
        meId: me.id,
        guests: guests.map((g) => ({ id: g.id, name: g.name, paid: false })),
        myNeeds: needs,
        items: items.map((i) => ({
          id: i.id,
          guest_id: i.guest_id,
          menu_item_id: i.menu_item_id,
          name: i.name,
          options: i.options,
          qty: i.qty,
          note: i.note,
          unit_price_cents: i.unit_price_cents,
          discount_cents: 0,
          share_mode: i.share_mode,
          share_guest_ids: i.share_guest_ids,
          status: i.status,
          created_at: i.created_at,
        })),
        openCalls: calls,
        rated,
        bill: computeBill(guests, items, shares, DEMO_RESTAURANT.serviceFeePct),
      },
    };
  }

  const ok = (data: Record<string, unknown> = { ok: true }) => Promise.resolve({ ok: true, data });

  return async (action, raw) => {
    const body = (raw ?? {}) as Record<string, unknown>;
    await new Promise((r) => setTimeout(r, action === "state" ? 0 : 450));
    switch (action) {
      case "state":
        return ok(state() as unknown as Record<string, unknown>);
      case "join": {
        const name = String(body.name ?? "").trim();
        if (name.length < 2) return { ok: false, data: { error: "Digite seu nome" } };
        me = { id: "g-me", name };
        return ok();
      }
      case "order": {
        const lines = (body.items ?? []) as { menu_item_id: string; qty: number; option_ids: string[]; note: string; share: "me" | "all" | string[] }[];
        for (const l of lines) {
          const m = ALL.find((i) => i.id === l.menu_item_id);
          if (!m || !me) continue;
          const opts = m.options.filter((o) => l.option_ids.includes(o.id)).map((o) => ({ name: o.name, price_cents: o.price_cents }));
          const share = Array.isArray(l.share) ? "custom" : l.share;
          const ids = Array.isArray(l.share) ? [me.id, ...l.share] : [];
          const it = demoItem(me.id, m.id, l.qty, "pending", new Date().toISOString(), share, opts, l.note || null, ids);
          items.push(it);
          advance(it.id);
        }
        return ok();
      }
      case "call": {
        const type = body.type === "bill" ? "bill" : "waiter";
        const already = calls.some((c) => c.type === type) && !body.message;
        if (!calls.some((c) => c.type === type)) {
          calls.push({ type, created_at: new Date().toISOString() });
          // o "garçom" atende depois de alguns segundos
          setTimeout(() => calls.splice(calls.findIndex((c) => c.type === type), 1), 12000);
        }
        return ok({ ok: true, already });
      }
      case "cancel": {
        const it = items.find((i) => i.id === body.item_id && i.guest_id === me?.id);
        if (!it || it.status !== "pending") return { ok: false, data: { error: "A cozinha já começou o preparo" } };
        it.status = "cancelled";
        return ok();
      }
      case "rate":
        rated = true;
        return ok();
      case "needs":
        needs = cleanNeeds(body.needs);
        return ok({ ok: true, needs });
    }
    return { ok: false, data: { error: "Ação desconhecida" } };
  };
}
