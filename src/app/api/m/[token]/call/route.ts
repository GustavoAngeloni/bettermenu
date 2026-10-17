import { after, NextResponse } from "next/server";
import { resolveFeatures } from "@/lib/features";
import { notifyFloor } from "@/lib/push";
import { createAdminClient } from "@/lib/supabase/server";
import { currentGuest, isMissingColumn, loadTable } from "@/lib/public-table";

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const found = await loadTable(token);
  if (!found) return NextResponse.json({ error: "Mesa não encontrada" }, { status: 404 });
  const me = await currentGuest(token, found.table.id);
  if (!me || me.session.status !== "open") return NextResponse.json({ error: "Entre na mesa primeiro" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { type?: string; message?: string };
  const type = body.type === "bill" ? "bill" : "waiter";
  // Mensagem escrita (cliente que não fala ou não ouve): frase pronta ou texto livre.
  const message = typeof body.message === "string" ? body.message.trim().replace(/\s+/g, " ").slice(0, 280) : "";
  const features = resolveFeatures(found.restaurant.features, found.restaurant.plan);
  if (!features[type === "bill" ? "request_bill" : "call_waiter"]) {
    return NextResponse.json({ error: "Função indisponível neste restaurante" }, { status: 403 });
  }

  const db = createAdminClient();
  const { data: open } = await db
    .from("waiter_calls")
    .select("*")
    .eq("session_id", me.session.id)
    .eq("type", type)
    .eq("status", "open")
    .limit(1);
  const existing = open?.[0] as { id: string; guest_id: string | null; message?: string | null } | undefined;
  if (existing && !message) return NextResponse.json({ ok: true, already: true });

  if (existing) {
    // Já há um chamado aberto: a nova mensagem entra nele (o garçom vê tudo junto).
    const line = existing.guest_id === me.guest.id ? message : `${me.guest.name}: ${message}`;
    const joined = [existing.message, line].filter(Boolean).join(" · ").slice(-600);
    const { error } = await db.from("waiter_calls").update({ message: joined }).eq("id", existing.id);
    if (error) return NextResponse.json({ error: isMissingColumn(error) ? "Mensagens ainda não disponíveis neste restaurante" : "Não foi possível enviar" }, { status: 500 });
  } else {
    const row: Record<string, unknown> = { restaurant_id: found.restaurant.id, session_id: me.session.id, table_id: found.table.id, guest_id: me.guest.id, type };
    let { error } = await db.from("waiter_calls").insert(message ? { ...row, message } : row);
    // Banco sem a coluna "message" (migração pendente): o chamado ainda chega, só sem o texto.
    if (error && message && isMissingColumn(error)) ({ error } = await db.from("waiter_calls").insert(row));
    if (error) return NextResponse.json({ error: "Não foi possível chamar o garçom" }, { status: 500 });
  }

  // Alerta no celular do garçom mesmo com a tela bloqueada (enviado depois de responder ao cliente).
  after(() =>
    notifyFloor(found.restaurant.id, found.table.id, {
      title: `Mesa ${found.table.number} · ${message ? "mandou uma mensagem" : type === "bill" ? "pediu a conta" : "chamou o garçom"}`,
      body: message ? `${me.guest.name}: “${message}”` : me.guest.name,
      tag: `call-${found.table.id}-${type}`,
    }),
  );
  return NextResponse.json({ ok: true });
}
