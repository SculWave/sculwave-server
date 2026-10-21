import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  // Resolve NodeNext-style `.js` source imports to TypeScript files during webpack builds.
  webpack(config) {
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
  // Optional, comma-separated extra origins allowed during `next dev`
  // (e.g. a LAN IP you test from): ALLOWED_DEV_ORIGINS=192.168.1.50
  allowedDevOrigins: (process.env.ALLOWED_DEV_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
};

// NOTE: server secrets (LIVEKIT_API_KEY / LIVEKIT_API_SECRET, ...) must come
// from the environment at runtime. Never inline them here via `env:` —
// Next.js would bake them into client-side bundles.
export default withPWA({
  dest: "public",
  disable: true, // The self-hosted admin dashboard must not be cached for offline use.
  register: true,
})(nextConfig);
