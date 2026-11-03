import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Shown in the app footer so you can tell which build a user is running.
const version =
  (process.env.CF_PAGES_COMMIT_SHA ?? process.env.COMMIT_REF ?? "").slice(0, 7) ||
  new Date().toISOString().slice(0, 10);

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt", // user taps "Reload" to apply an update
      includeAssets: ["favicon.ico", "apple-touch-icon-180x180.png"],
      manifest: {
        id: "/",
        name: "Freight Ops",
        short_name: "Freight",
        description: "Freight logistics admin portal",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "any",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        icons: [
          { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//, /^\/\.well-known\//],
        cleanupOutdatedCaches: true,
        // Precache the app shell only. API calls are NOT cached (see Phase 9).
      },
    }),
  ],
  server: {
    proxy: {
      // Dev only: /api/companies -> http://localhost:8000/companies (no CORS needed in dev)
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ""),
      },
    },
  },
});
