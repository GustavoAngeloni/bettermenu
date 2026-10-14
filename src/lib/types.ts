export type StaffRole = "owner" | "manager" | "waiter" | "kitchen";

export type ItemStatus = "pending" | "preparing" | "ready" | "delivered" | "cancelled";
export type ShareMode = "me" | "all" | "custom";

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  service_fee_pct: number;
  active: boolean;
  created_at: string;
  features: Record<string, boolean>;
  plan: string;
  max_tables: number | null;
  paid_until: string | null;
  notes: string | null;
  /** identidade visual; ver lib/branding.ts */
  branding?: import("./branding").Branding | null;
}

export interface Profile {
  id: string;
  restaurant_id: string | null;
  name: string;
  username: string | null;
  role: StaffRole | null;
  is_superadmin: boolean;
  active: boolean;
  created_at: string;
  sector_id: string | null;
}

export interface Sector {
  id: string;
  restaurant_id: string;
  name: string;
  sort: number;
}

export type Translations = Partial<Record<"en" | "es", { name?: string; description?: string }>>;
export type ComboComponent = { menu_item_id: string; name: string; qty: number };

export interface Station {
  id: string;
  restaurant_id: string;
  name: string;
  sort: number;
}

export interface Category {
  id: string;
  restaurant_id: string;
  name: string;
  station_id: string | null;
  sort: number;
  translations: Translations;
  days: number[] | null;
  start_time: string | null;
  end_time: string | null;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  image_url: string | null;
  available: boolean;
  sort: number;
  created_at: string;
  tags: string[];
  featured: boolean;
  pairs_with: string[];
  translations: Translations;
  stock_qty: number | null;
  promo_price_cents: number | null;
  promo_days: number[] | null;
  promo_start: string | null;
  promo_end: string | null;
  combo_items: ComboComponent[];
}

export interface ItemOption {
  id: string;
  restaurant_id: string;
  menu_item_id: string;
  name: string;
  price_cents: number;
  sort: number;
}

export interface Table {
  id: string;
  restaurant_id: string;
  number: number;
  qr_token: string;
  active: boolean;
  sector_id: string | null;
}

export interface TableSession {
  id: string;
  restaurant_id: string;
  table_id: string;
  status: "open" | "closed";
  opened_at: string;
  closed_at: string | null;
}

export interface Guest {
  id: string;
  session_id: string;
  name: string;
  paid_at: string | null;
  created_at: string;
  payment_method?: PaymentMethod | null;
  paid_cents?: number | null;
  paid_by?: string | null;
}

export type PaymentMethod = "credito" | "debito" | "pix" | "dinheiro" | "outro";
export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  credito: "Crédito",
  debito: "Débito",
  pix: "Pix",
  dinheiro: "Dinheiro",
  outro: "Outro",
};

export interface OrderItem {
  id: string;
  restaurant_id: string;
  order_id: string;
  session_id: string;
  table_id: string;
  guest_id: string;
  menu_item_id: string | null;
  station_id: string | null;
  name: string;
  options: { name: string; price_cents: number }[];
  unit_price_cents: number;
  qty: number;
  note: string | null;
  share_mode: ShareMode;
  status: ItemStatus;
  created_at: string;
  started_at: string | null;
  ready_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_by: string | null;
  discount_cents: number;
  discount_reason: string | null;
  combo_items: ComboComponent[];
}

export interface OrderItemShare {
  order_item_id: string;
  guest_id: string;
}

export interface WaiterCall {
  id: string;
  restaurant_id: string;
  session_id: string;
  table_id: string;
  guest_id: string | null;
  type: "waiter" | "bill";
  status: "open" | "done";
  created_at: string;
  resolved_at: string | null;
}

export const STATUS_LABEL: Record<ItemStatus, string> = {
  pending: "Recebido",
  preparing: "Em preparo",
  ready: "Pronto",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

export const TAG_LABEL: Record<string, string> = {
  vegetariano: "Vegetariano",
  vegano: "Vegano",
  sem_gluten: "Sem glúten",
  sem_lactose: "Sem lactose",
  picante: "Picante",
};

export const ROLE_LABEL: Record<StaffRole, string> = {
  owner: "Dono",
  manager: "Gerente",
  waiter: "Garçom",
  kitchen: "Cozinha",
};
