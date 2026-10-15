import type { Metadata } from "next";
import { BrandScope } from "@/components/brand";
import { ThemeScript } from "@/components/pre-paint";
import { FONT_STYLES, type FontStyle } from "@/lib/branding";
import { DemoClient } from "./demo-client";

export const metadata: Metadata = {
  title: "Demonstração do cardápio digital",
  description: "Experimente o cardápio digital do Better Menu como um cliente na mesa: pedido pelo celular, conta dividida e recursos de acessibilidade.",
  alternates: { canonical: "/demo" },
  openGraph: { url: "/demo", title: "Demonstração do cardápio digital · Better Menu" },
};

/**
 * Demonstração pública do cardápio. Aceita ?cor=2f7d4f&fonte=moderno&tema=dark
 * para mostrar a um restaurante como fica com a identidade dele.
 */
export default async function DemoPage({ searchParams }: PageProps<"/demo">) {
  const q = await searchParams;
  const cor = typeof q.cor === "string" ? `#${q.cor.replace("#", "")}` : "#b4441f";
  const fonte = typeof q.fonte === "string" && q.fonte in FONT_STYLES ? (q.fonte as FontStyle) : "classico";
  const tema = q.tema === "dark" || q.tema === "light" ? q.tema : "auto";
  return (
    <BrandScope branding={{ primary: cor, font: fonte }}>
      <ThemeScript fallback={tema} />
      <DemoClient />
    </BrandScope>
  );
}
