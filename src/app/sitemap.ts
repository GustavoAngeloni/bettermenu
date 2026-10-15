import type { MetadataRoute } from "next";
import { listPublicRestaurants } from "@/lib/public-table";
import { absoluteUrl, PUBLIC_PAGES } from "@/lib/site";

// Atualiza a cada hora: novos restaurantes com página pública entram sozinhos.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const pages: MetadataRoute.Sitemap = PUBLIC_PAGES.map((p) => ({
    url: absoluteUrl(p.path),
    lastModified: now,
    changeFrequency: p.path === "/" ? "weekly" : "monthly",
    priority: p.path === "/" ? 1 : p.path === "/demo" ? 0.6 : 0.8,
  }));
  const restaurants = (await listPublicRestaurants()).map((r) => ({
    url: absoluteUrl(`/r/${r.slug}`),
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));
  return [...pages, ...restaurants];
}
