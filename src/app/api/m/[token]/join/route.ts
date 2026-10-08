import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { currentGuest, findOpenSession, guestCookieName, loadTable } from "@/lib/public-table";
import type { Guest, TableSession } from "@/lib/types";

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const found = await loadTable(token);
  if (!found) return NextResponse.json({ error: "Mesa não encontrada" }, { status: 404 });
  const { table, restaurant } = found;

  const body = (await req.json().catch(() => ({}))) as { name?: string };
  const name = (body.name ?? "").trim().replace(/\s+/g, " ").slice(0, 30);
  if (name.length < 2) return NextResponse.json({ error: "Digite seu nome" }, { status: 400 });

  const db = createAdminClient();

  // Abre a sessão da mesa se ainda não existir (o índice único evita duas sessões abertas).
  let session = await findOpenSession(table.id);
  if (!session) {
    const { data, error } = await db
      .from("table_sessions")
      .insert({ restaurant_id: restaurant.id, table_id: table.id })
      .select()
      .single<TableSession>();
    session = data ?? (error?.code === "23505" ? await findOpenSession(table.id) : null);
  }
  if (!session) return NextResponse.json({ error: "Não foi possível abrir a mesa" }, { status: 500 });

  // Já está nesta sessão? Só atualiza o nome.
  const existing = await currentGuest(token, table.id);
  if (existing && existing.session.id === session.id) {
    await db.from("guests").update({ name }).eq("id", existing.guest.id);
    return NextResponse.json({ ok: true });
  }

  const { data: guest, error } = await db
    .from("guests")
    .insert({ restaurant_id: restaurant.id, session_id: session.id, name })
    .select("id, secret")
    .single<Pick<Guest, "id"> & { secret: string }>();
  if (error || !guest) return NextResponse.json({ error: "Não foi possível entrar na mesa" }, { status: 500 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(guestCookieName(token), guest.secret, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return res;
}
