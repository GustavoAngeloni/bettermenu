import { after, NextResponse } from "next/server";
import { resolveFeatures } from "@/lib/features";
import { notifyFloor } from "@/lib/push";
import { createAdminClient } from "@/lib/supabase/server";
import { currentGuest, loadTable } from "@/lib/public-table";

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const found = await loadTable(token);
  if (!found) return NextResponse.json({ error: "Mesa não encontrada" }, { status: 404 });
  const me = await currentGuest(token, found.table.id);
  if (!me || me.session.status !== "open") return NextResponse.json({ error: "Entre na mesa primeiro" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { type?: string };
  const type = body.type === "bill" ? "bill" : "waiter";
  const features = resolveFeatures(found.restaurant.features);
  if (!features[type === "bill" ? "request_bill" : "call_waiter"]) {
    return NextResponse.json({ error: "Função indisponível neste restaurante" }, { status: 403 });
  }

  const db = createAdminClient();
  const { data: open } = await db
    .from("waiter_calls")
    .select("id")
    .eq("session_id", me.session.id)
    .eq("type", type)
    .eq("status", "open")
    .limit(1);
  if (open && open.length > 0) return NextResponse.json({ ok: true, already: true });

  const { error } = await db.from("waiter_calls").insert({
    restaurant_id: found.restaurant.id,
    session_id: me.session.id,
    table_id: found.table.id,
    guest_id: me.guest.id,
    type,
  });
  if (error) return NextResponse.json({ error: "Não foi possível chamar o garçom" }, { status: 500 });

  // Alerta no celular do garçom mesmo com a tela bloqueada (enviado depois de responder ao cliente).
  after(() =>
    notifyFloor(found.restaurant.id, found.table.id, {
      title: `Mesa ${found.table.number} · ${type === "bill" ? "pediu a conta" : "chamou o garçom"}`,
      body: me.guest.name,
      tag: `call-${found.table.id}-${type}`,
    }),
  );
  return NextResponse.json({ ok: true });
}
