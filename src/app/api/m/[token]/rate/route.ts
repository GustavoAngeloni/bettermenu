import { NextResponse } from "next/server";
import { resolveFeatures } from "@/lib/features";
import { currentGuest, loadTable } from "@/lib/public-table";
import { createAdminClient } from "@/lib/supabase/server";

/** Avaliação do cliente (comida e atendimento, 1 a 5). Uma por pessoa. */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const found = await loadTable(token);
  if (!found) return NextResponse.json({ error: "Mesa não encontrada" }, { status: 404 });
  if (!resolveFeatures(found.restaurant.features).ratings) return NextResponse.json({ error: "Indisponível" }, { status: 403 });
  const me = await currentGuest(token, found.table.id);
  if (!me) return NextResponse.json({ error: "Entre na mesa primeiro" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { food?: number; service?: number; comment?: string };
  const clamp = (n: unknown) => Math.min(Math.max(Math.round(Number(n) || 0), 1), 5);
  const { error } = await createAdminClient()
    .from("ratings")
    .upsert(
      {
        restaurant_id: found.restaurant.id,
        session_id: me.session.id,
        guest_id: me.guest.id,
        food: clamp(body.food),
        service: clamp(body.service),
        comment: (body.comment ?? "").trim().slice(0, 500) || null,
      },
      { onConflict: "guest_id" },
    );
  if (error) return NextResponse.json({ error: "Não foi possível salvar a avaliação" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
