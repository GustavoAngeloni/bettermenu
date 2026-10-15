import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Importação de cardápio por foto: as imagens são reduzidas no navegador,
    // mas várias fotos juntas passam do limite padrão de 1MB.
    serverActions: { bodySizeLimit: "4mb" },
  },
  // Áreas privadas fora dos buscadores e das IAs (além do robots.txt, que só pede para não rastrear).
  async headers() {
    const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];
    return ["/admin/:path*", "/garcom/:path*", "/cozinha/:path*", "/super/:path*", "/login", "/api/:path*", "/m/:path*"].map((source) => ({
      source,
      headers: noindex,
    }));
  },
};

export default nextConfig;
