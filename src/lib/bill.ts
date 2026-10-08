import type { Guest, OrderItem, OrderItemShare } from "./types";

export interface BillLine {
  itemId: string;
  name: string;
  qty: number;
  /** valor que cabe a este cliente */
  amountCents: number;
  /** valor total do item (antes da divisão) */
  itemTotalCents: number;
  /** quantas pessoas dividem o item (1 = não dividido) */
  splitCount: number;
  orderedBy: string;
}

export interface GuestBill {
  guest: Pick<Guest, "id" | "name" | "paid_at">;
  lines: BillLine[];
  subtotalCents: number;
  serviceCents: number;
  totalCents: number;
}

export interface TableBill {
  guests: GuestBill[];
  subtotalCents: number;
  serviceCents: number;
  totalCents: number;
  serviceFeePct: number;
}

/** Valor do item já com desconto/cortesia (nunca negativo). */
export function itemTotal(item: Pick<OrderItem, "unit_price_cents" | "qty"> & { discount_cents?: number | null }): number {
  return Math.max(0, item.unit_price_cents * item.qty - (item.discount_cents ?? 0));
}

/** Divide `total` centavos em `n` partes inteiras que somam exatamente `total`. */
function splitCents(total: number, n: number): number[] {
  const base = Math.floor(total / n);
  const rest = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < rest ? 1 : 0));
}

/**
 * Calcula quanto cada cliente da mesa deve.
 * - share_mode "me": item vai inteiro para quem pediu
 * - share_mode "all": dividido entre todos os clientes da mesa
 * - share_mode "custom": dividido entre os clientes em order_item_shares
 * Itens cancelados não entram na conta.
 */
export function computeBill(
  guests: Pick<Guest, "id" | "name" | "paid_at" | "created_at">[],
  items: OrderItem[],
  shares: OrderItemShare[],
  serviceFeePct: number,
): TableBill {
  const ordered = [...guests].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const byId = new Map(ordered.map((g) => [g.id, g]));
  const bills = new Map<string, GuestBill>(
    ordered.map((g) => [
      g.id,
      { guest: { id: g.id, name: g.name, paid_at: g.paid_at }, lines: [], subtotalCents: 0, serviceCents: 0, totalCents: 0 },
    ]),
  );

  const sharesByItem = new Map<string, string[]>();
  for (const s of shares) {
    const list = sharesByItem.get(s.order_item_id) ?? [];
    list.push(s.guest_id);
    sharesByItem.set(s.order_item_id, list);
  }

  const sortedItems = [...items]
    .filter((i) => i.status !== "cancelled")
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  for (const item of sortedItems) {
    let payers: string[];
    if (item.share_mode === "all") {
      payers = ordered.map((g) => g.id);
    } else if (item.share_mode === "custom") {
      const ids = new Set(sharesByItem.get(item.id) ?? []);
      payers = ordered.filter((g) => ids.has(g.id)).map((g) => g.id);
    } else {
      payers = [item.guest_id];
    }
    if (payers.length === 0 || !payers.every((id) => byId.has(id))) {
      payers = byId.has(item.guest_id) ? [item.guest_id] : payers.filter((id) => byId.has(id));
    }
    if (payers.length === 0) continue;

    const total = itemTotal(item);
    const parts = splitCents(total, payers.length);
    payers.forEach((guestId, idx) => {
      const bill = bills.get(guestId)!;
      bill.lines.push({
        itemId: item.id,
        name: item.name,
        qty: item.qty,
        amountCents: parts[idx],
        itemTotalCents: total,
        splitCount: payers.length,
        orderedBy: byId.get(item.guest_id)?.name ?? "",
      });
      bill.subtotalCents += parts[idx];
    });
  }

  let subtotal = 0;
  let service = 0;
  for (const bill of bills.values()) {
    bill.serviceCents = Math.round((bill.subtotalCents * serviceFeePct) / 100);
    bill.totalCents = bill.subtotalCents + bill.serviceCents;
    subtotal += bill.subtotalCents;
    service += bill.serviceCents;
  }

  return {
    guests: [...bills.values()],
    subtotalCents: subtotal,
    serviceCents: service,
    totalCents: subtotal + service,
    serviceFeePct,
  };
}
