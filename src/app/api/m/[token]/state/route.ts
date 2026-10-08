import { NextResponse } from "next/server";
import { getPublicState, loadTable } from "@/lib/public-table";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const found = await loadTable(token);
  if (!found) return NextResponse.json({ error: "Mesa não encontrada" }, { status: 404 });
  return NextResponse.json(await getPublicState(token, found.table, found.restaurant));
}
