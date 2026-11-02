import type { NextConfig } from "next";

// Exportação estática: o build sai em out/ e hospeda em qualquer lugar (Vercel ou Hostinger).
// O laboratório das cenas 3D (/lab e /lab/poster, páginas .dev.tsx) só existe no "next dev": no build ele
// não entra no site.
const desenvolvimento = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  reactStrictMode: true,
  pageExtensions: desenvolvimento ? ["dev.tsx", "tsx", "ts"] : ["tsx", "ts"],
};

export default nextConfig;
