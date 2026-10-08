import { NextResponse } from "next/server";
import { resolveFeatures } from "@/lib/features";
import { createOrder, type CartLine } from "@/lib/orders";
import { currentGuest, loadTable } from "@/lib/public-table";

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const found = await loadTable(token);
  if (!found) return NextResponse.json({ error: "Mesa não encontrada" }, { status: 404 });
  const { table, restaurant } = found;
  const features = resolveFeatures(restaurant.features);
  if (!features.customer_ordering) return NextResponse.json({ error: "Peça ao garçom" }, { status: 403 });

  const me = await currentGuest(token, table.id);
  if (!me || me.session.status !== "open") return NextResponse.json({ error: "Entre na mesa primeiro" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { items?: CartLine[] };
  const result = await createOrder({
    restaurantId: restaurant.id,
    features,
    sessionId: me.session.id,
    tableId: table.id,
    guestId: me.guest.id,
    lines: Array.isArray(body.items) ? body.items : [],
    createdBy: null,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, order_id: result.orderId });
}
