import { Clock, QrCode } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BrandScope, PoweredBy, RestaurantLogo } from "@/components/brand";
import { ThemeScript } from "@/components/pre-paint";
import { ThemeToggle } from "@/components/theme";
import { resolveBranding } from "@/lib/branding";
import { formatBRL } from "@/lib/money";
import { loadMenu, loadPublicRestaurant, type PublicMenu } from "@/lib/public-table";
import { absoluteUrl, breadcrumbLd, JsonLd, ORG_ID, SITE } from "@/lib/site";

// Página pública do cardápio (só consulta): para o restaurante aparecer no Google e nas IAs.
// Pedidos continuam só pelo QR Code da mesa. Atualiza a cada 5 minutos.
export const revalidate = 300;

const TAGS: Record<string, string> = { vegetariano: "Vegetariano", vegano: "Vegano", sem_gluten: "Sem glúten", sem_lactose: "Sem lactose", picante: "Picante" };
const DIET: Record<string, string> = {
  vegetariano: "https://schema.org/VegetarianDiet",
  vegano: "https://schema.org/VeganDiet",
  sem_gluten: "https://schema.org/GlutenFreeDiet",
  sem_lactose: "https://schema.org/LowLactoseDiet",
};

async function load(slug: string) {
  const restaurant = await loadPublicRestaurant(slug);
  if (!restaurant) return null;
  return { restaurant, menu: await loadMenu(restaurant), branding: resolveBranding(restaurant.branding) };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const found = await load(slug);
  if (!found) return { title: "Cardápio não encontrado", robots: { index: false } };
  const { restaurant, menu, branding } = found;
  const count = menu.categories.reduce((n, c) => n + c.items.length, 0);
  const sample = menu.categories.flatMap((c) => c.items).slice(0, 4).map((i) => i.name).join(", ");
  const description = `${branding.tagline ? `${branding.tagline} ` : ""}Cardápio de ${restaurant.name} com ${count} opções e preços atualizados${sample ? `: ${sample} e mais` : ""}.`;
  const image = branding.cover_url ?? restaurant.logo_url ?? undefined;
  return {
    title: { absolute: `${restaurant.name} · Cardápio e preços` },
    description,
    alternates: { canonical: `/r/${slug}` },
    openGraph: { type: "website", title: `${restaurant.name} · Cardápio`, description, url: `/r/${slug}`, images: image ? [image] : undefined },
  };
}

function menuLd(name: string, slug: string, menu: PublicMenu, image: string | null, logo: string | null, tagline: string | null) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Restaurant",
        "@id": absoluteUrl(`/r/${slug}#restaurante`),
        name,
        url: absoluteUrl(`/r/${slug}`),
        ...(tagline ? { description: tagline } : {}),
        ...(image ? { image } : {}),
        ...(logo ? { logo } : {}),
        acceptsReservations: false,
        currenciesAccepted: "BRL",
        hasMenu: {
          "@type": "Menu",
          name: `Cardápio · ${name}`,
          inLanguage: "pt-BR",
          hasMenuSection: menu.categories.map((c) => ({
            "@type": "MenuSection",
            name: c.name,
            ...(c.window ? { description: c.window } : {}),
            hasMenuItem: c.items.map((i) => ({
              "@type": "MenuItem",
              name: i.name,
              ...(i.description ? { description: i.description } : {}),
              ...(i.image_url ? { image: i.image_url } : {}),
              ...(i.tags.some((t) => DIET[t]) ? { suitableForDiet: i.tags.filter((t) => DIET[t]).map((t) => DIET[t]) } : {}),
              offers: {
                "@type": "Offer",
                price: (i.price_cents / 100).toFixed(2),
                priceCurrency: "BRL",
                availability: i.available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
              },
            })),
          })),
        },
        provider: { "@id": ORG_ID },
      },
      breadcrumbLd([
        { name: SITE.name, path: "/" },
        { name, path: `/r/${slug}` },
      ]),
    ],
  };
}

export default async function PublicMenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = await load(slug);
  if (!found) notFound();
  const { restaurant, menu, branding } = found;
  const cover = branding.cover_url ?? null;

  return (
    <BrandScope branding={restaurant.branding}>
      <ThemeScript fallback={branding.theme} />
      <JsonLd data={menuLd(restaurant.name, slug, menu, cover, restaurant.logo_url, branding.tagline ?? null)} />
      <div className="mx-auto w-full max-w-3xl flex-1 pb-20">
        <header className="relative">
          <div className="relative h-56 overflow-hidden sm:h-72">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover} alt={`Ambiente do ${restaurant.name}`} className="size-full object-cover [mask-image:linear-gradient(to_bottom,black_55%,transparent)]" />
            ) : (
              <div className="size-full bg-brand [mask-image:linear-gradient(to_bottom,black_40%,transparent)]" />
            )}
            <div className="absolute top-3 right-3">
              <ThemeToggle className="bg-black/30 text-white backdrop-blur-md hover:bg-black/45 hover:text-white" />
            </div>
          </div>
          <div className="relative -mt-20 px-5">
            <RestaurantLogo name={restaurant.name} url={restaurant.logo_url} className="size-[4.5rem] rounded-[1.4rem] text-3xl shadow-float ring-4 ring-canvas" />
            <h1 className="mt-4 font-display text-[2.5rem] leading-[1.02] font-semibold tracking-tight">{restaurant.name}</h1>
            {branding.tagline && <p className="mt-2 max-w-xl text-lg text-muted">{branding.tagline}</p>}
            <p className="mt-5 flex items-start gap-3 rounded-2xl bg-brand-soft px-4 py-3 text-sm font-semibold text-brand-fg">
              <QrCode className="mt-0.5 size-5 shrink-0" aria-hidden />
              Está no restaurante? Escaneie o QR Code da sua mesa para pedir, chamar o garçom e ver a conta.
            </p>
          </div>
        </header>

        <nav aria-label="Categorias" className="no-scrollbar mt-8 flex gap-2 overflow-x-auto px-5">
          {menu.categories.map((c) => (
            <a key={c.id} href={`#${c.id}`} className="h-9 shrink-0 rounded-full border border-line px-4 text-sm leading-9 font-semibold whitespace-nowrap hover:bg-surface-2">
              {c.name}
            </a>
          ))}
        </nav>

        <main id="conteudo">
          {menu.categories.map((c) => (
            <section key={c.id} id={c.id} aria-labelledby={`t-${c.id}`} className="scroll-mt-4 px-5 pt-10">
              <h2 id={`t-${c.id}`} className="font-display text-[1.8rem] leading-tight font-semibold tracking-tight">
                {c.name}
              </h2>
              {c.window && (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                  <Clock className="size-4" aria-hidden /> {c.window}
                </p>
              )}
              <ul className="mt-3 divide-y divide-line">
                {c.items.map((i) => (
                  <li key={i.id} className="flex gap-4 py-5">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg leading-snug font-bold">{i.name}</h3>
                      {i.description && <p className="mt-1 leading-relaxed text-muted">{i.description}</p>}
                      {i.combo.length > 0 && <p className="mt-1 text-sm text-muted">Inclui: {i.combo.join(" + ")}</p>}
                      {i.tags.length > 0 && (
                        <p className="mt-2 flex flex-wrap gap-1">
                          {i.tags.map((t) => (
                            <span key={t} className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                              {TAGS[t] ?? t}
                            </span>
                          ))}
                        </p>
                      )}
                      <p className="mt-2.5 font-bold tabular-nums">
                        {i.available ? (
                          i.original_price_cents != null ? (
                            <>
                              <span className="sr-only">de {formatBRL(i.original_price_cents)} por </span>
                              <s aria-hidden className="mr-2 font-normal text-muted">
                                {formatBRL(i.original_price_cents)}
                              </s>
                              {formatBRL(i.price_cents)}
                            </>
                          ) : (
                            formatBRL(i.price_cents)
                          )
                        ) : (
                          <span className="text-muted">Esgotado</span>
                        )}
                      </p>
                    </div>
                    {i.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={i.image_url} alt={i.name} loading="lazy" className="size-28 shrink-0 rounded-2xl object-cover" />
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </main>
        <PoweredBy className="mx-auto mt-16 flex w-fit" />
      </div>
    </BrandScope>
  );
}
