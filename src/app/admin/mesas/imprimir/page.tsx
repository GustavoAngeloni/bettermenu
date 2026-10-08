import { requireStaff } from "@/lib/auth";
import { appUrl, qrSvg, tableUrl } from "@/lib/qr";
import { createClient } from "@/lib/supabase/server";
import type { Table } from "@/lib/types";
import { PrintButton } from "./print-button";

export const metadata = { title: "Imprimir QR Codes · Better Menu" };

/** Página pronta para imprimir: um cartão por mesa (6 por folha A4). */
export default async function PrintPage() {
  const { restaurant } = await requireStaff(["manager"]);
  const supabase = await createClient();
  const { data } = await supabase.from("tables").select("*").eq("restaurant_id", restaurant.id).eq("active", true).order("number");
  const base = await appUrl();
  const cards = await Promise.all(((data ?? []) as Table[]).map(async (t) => ({ ...t, svg: await qrSvg(tableUrl(base, t.qr_token)) })));

  return (
    <div className="bg-white">
      <div className="no-print flex items-center justify-between border-b border-line p-4">
        <p className="text-sm text-muted">{cards.length} cartões · use papel A4, sem margens extras</p>
        <PrintButton />
      </div>
      <div className="mx-auto grid max-w-[210mm] grid-cols-2 gap-[6mm] p-[8mm] print:p-0">
        {cards.map((t) => (
          <div
            key={t.id}
            className="flex h-[88mm] break-inside-avoid flex-col items-center justify-center rounded-2xl border-2 border-dashed border-stone-300 p-4 text-center"
          >
            <div className="text-sm font-semibold text-stone-500">{restaurant.name}</div>
            <div className="text-3xl font-extrabold">Mesa {t.number}</div>
            <div className="my-2 w-[45mm] [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: t.svg }} />
            <div className="text-sm font-medium">Escaneie para ver o cardápio e pedir</div>
          </div>
        ))}
      </div>
    </div>
  );
}
