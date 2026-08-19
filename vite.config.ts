import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: process.env.GITHUB_PAGES === "true" ? "/nosvamos/" : "/",
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-data": ["@tanstack/react-query", "dexie", "zustand"],
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["offline.html", "icons/*.png", "icons/*.svg"],
      manifest: {
        name: "NosVamos — Viajes en grupo",
        short_name: "NosVamos",
        description: "Itinerarios, reservas y gastos para viajes en grupo.",
        theme_color: "#25272C",
        background_color: "#25272C",
        display: "standalone",
        orientation: "portrait-primary",
        start_url: ".",
        scope: ".",
        lang: "es",
        categories: ["travel", "productivity"],
        icons: [
          { src: "icons/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        skipWaiting: false,
        clientsClaim: true,
        importScripts: ["push-handler.js"],
        navigateFallback: "index.html",
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === "image",
            handler: "CacheFirst",
            options: {
              cacheName: "trip-images",
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      devOptions: { enabled: true },
    }),
  ],
});
