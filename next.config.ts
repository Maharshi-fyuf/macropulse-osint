import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ── Security ───────────────────────────────────────────────────────────────
  // Disable source maps in the production client bundle.
  // This prevents users from reverse-engineering application logic via browser DevTools.
  productionBrowserSourceMaps: false,
};

export default nextConfig;
