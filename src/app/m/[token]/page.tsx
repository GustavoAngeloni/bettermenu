import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BrandScope } from "@/components/brand";
import { ThemeScript } from "@/components/theme";
import { resolveBranding } from "@/lib/branding";
import { resolveFeatures } from "@/lib/features";
import { getPublicState, loadMenu, loadTable } from "@/lib/public-table";
import { CustomerApp } from "./customer-app";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const found = await loadTable((await params).token);
  return { title: found ? `${found.restaurant.name} · Mesa ${found.table.number}` : "Better Menu" };
}

export default async function TablePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const found = await loadTable(token);
  if (!found) notFound();
  const [menu, initialState] = await Promise.all([
    loadMenu(found.restaurant),
    getPublicState(token, found.table, found.restaurant),
  ]);
  const branding = resolveBranding(found.restaurant.branding);

  return (
    <BrandScope branding={found.restaurant.branding}>
      {/* Tema padrão escolhido pelo restaurante (o cliente pode trocar no app) */}
      <ThemeScript fallback={branding.theme} />
      <CustomerApp
        token={token}
        tableNumber={found.table.number}
        restaurant={{
          name: found.restaurant.name,
          logoUrl: found.restaurant.logo_url,
          serviceFeePct: Number(found.restaurant.service_fee_pct),
          coverUrl: branding.cover_url,
          tagline: branding.tagline,
        }}
        menu={menu}
        features={resolveFeatures(found.restaurant.features)}
        initialState={initialState}
      />
    </BrandScope>
  );
}
