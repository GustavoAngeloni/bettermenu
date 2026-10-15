import { BetterMenuMark, ByInsight, RestaurantLogo } from "@/components/brand";
import { requireStaff } from "@/lib/auth";
import { appUrl, qrSvg, tableUrl } from "@/lib/qr";
import { createClient } from "@/lib/supabase/server";
import type { Table } from "@/lib/types";
import { PrintButton } from "./print-button";

export const metadata = { title: "Imprimir QR Codes" };

/** Página pronta para imprimir: um cartão por mesa (6 por folha A4). */
export default async function PrintPage() {
  const { restaurant } = await requireStaff(["manager"]);
  const supabase = await createClient();
  const { data } = await supabase.from("tables").select("*").eq("restaurant_id", restaurant.id).eq("active", true).order("number");
  const base = await appUrl();
  const cards = await Promise.all(((data ?? []) as Table[]).map(async (t) => ({ ...t, svg: await qrSvg(tableUrl(base, t.qr_token)) })));

  return (
    <div>
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Cartões das mesas</h1>
          <p className="mt-1 text-sm text-muted">{cards.length} cartões · papel A4, 6 por folha. Ative “Gráficos de fundo” na impressão para sair com as cores.</p>
        </div>
        <PrintButton />
      </div>
      <div className="mx-auto grid max-w-[210mm] gap-[6mm] bg-white p-4 [print-color-adjust:exact] sm:grid-cols-2 sm:p-[8mm] print:grid-cols-2 print:p-0">
        {cards.map((t) => (
          <div key={t.id} className="flex h-[88mm] break-inside-avoid flex-col overflow-hidden rounded-[5mm] border border-black/10 bg-white text-center text-[#16130f]">
            <div className="flex items-center gap-[3mm] bg-brand px-[5mm] py-[3.5mm] text-left text-on-brand">
              <RestaurantLogo name={restaurant.name} url={restaurant.logo_url} className="size-[10mm] rounded-[2.5mm] text-base ring-1 ring-white/30" />
              <div className="min-w-0 flex-1 truncate font-display text-[5mm] leading-tight font-semibold">{restaurant.name}</div>
              <div className="shrink-0 text-right leading-none">
                <div className="mb-[1mm] text-[2.6mm] font-semibold opacity-80">Mesa</div>
                <div className="font-display text-[8mm] font-semibold">{t.number}</div>
              </div>
            </div>
            <div className="flex flex-1 flex-col items-center justify-center px-[5mm]">
              <div className="w-[40mm] [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: t.svg }} />
              <div className="mt-[2mm] font-display text-[4.4mm] font-semibold">Aponte a câmera para pedir</div>
              <div className="text-[2.8mm] text-black/60">Cardápio, pedido e conta direto do seu celular</div>
            </div>
            <div className="flex items-center justify-center gap-[1.5mm] border-t border-black/5 py-[2mm] text-[2.4mm] text-black/50">
              <BetterMenuMark className="size-[3mm] rounded-[0.7mm]" /> Better Menu · <ByInsight tone="dark" label="by" className="text-[2.4mm]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
