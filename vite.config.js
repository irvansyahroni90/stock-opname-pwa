import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["apple-touch-icon.png", "favicon.png"],
      manifest: {
        name: "Frinirvan Tracker",
        short_name: "Frinirvan Tracker",
        description: "Pencatatan stok, daftar belanja, dan agenda rumah",
        start_url: "/",
        display: "standalone",
        background_color: "#F1EEE3",
        theme_color: "#F1EEE3",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // App-shell di-cache supaya bisa dibuka lagi walau sinyal jelek;
        // data stok tetap real-time lewat Firestore saat online.
        // wasm = mesin pembaca label QR, ikut disimpan supaya scan tetap
        // jalan saat sinyal jelek / offline.
        globPatterns: ["**/*.{js,css,html,ico,png,svg,wasm}"],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
});
