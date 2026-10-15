import { NextResponse } from "next/server";
import { cleanNeeds } from "@/lib/access-needs";
import { createAdminClient } from "@/lib/supabase/server";
import { currentGuest, isMissingColumn, loadTable } from "@/lib/public-table";

/** O cliente avisa como prefere ser atendido (deficiência visual, não fala, surdo). */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const found = await loadTable(token);
  if (!found) return NextResponse.json({ error: "Mesa não encontrada" }, { status: 404 });
  const me = await currentGuest(token, found.table.id);
  if (!me || me.session.status !== "open") return NextResponse.json({ error: "Entre na mesa primeiro" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { needs?: unknown };
  const needs = cleanNeeds(body.needs);
  const { error } = await createAdminClient().from("guests").update({ access_needs: needs }).eq("id", me.guest.id);
  if (error) {
    return NextResponse.json(
      { error: isMissingColumn(error) ? "Este aviso ainda não está disponível. Chame o garçom." : "Não foi possível salvar" },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, needs });
}
