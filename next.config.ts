import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Importação de cardápio por foto: as imagens são reduzidas no navegador,
    // mas várias fotos juntas passam do limite padrão de 1MB.
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
