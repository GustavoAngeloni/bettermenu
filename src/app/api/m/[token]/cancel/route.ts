import { NextResponse } from "next/server";
import { resolveFeatures } from "@/lib/features";
import { cancelItems } from "@/lib/orders";
import { currentGuest, loadTable } from "@/lib/public-table";
import { createAdminClient } from "@/lib/supabase/server";

/** Cliente cancela um item próprio enquanto ainda está "Recebido" (cozinha não começou). */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const found = await loadTable(token);
  if (!found) return NextResponse.json({ error: "Mesa não encontrada" }, { status: 404 });
  const features = resolveFeatures(found.restaurant.features, found.restaurant.plan);
  if (!features.cancel_pending) return NextResponse.json({ error: "Peça ao garçom para cancelar" }, { status: 403 });
  const me = await currentGuest(token, found.table.id);
  if (!me || me.session.status !== "open") return NextResponse.json({ error: "Entre na mesa primeiro" }, { status: 401 });

  const { item_id } = (await req.json().catch(() => ({}))) as { item_id?: string };
  const { data: item } = await createAdminClient()
    .from("order_items")
    .select("id, status")
    .eq("id", item_id ?? "")
    .eq("guest_id", me.guest.id)
    .maybeSingle();
  if (!item) return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });
  if (item.status !== "pending") return NextResponse.json({ error: "A cozinha já começou o preparo. Fale com o garçom." }, { status: 409 });

  await cancelItems(found.restaurant.id, [item.id], "Cancelado pelo cliente", features.stock);
  return NextResponse.json({ ok: true });
}
