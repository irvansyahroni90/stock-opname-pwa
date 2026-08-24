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
        name: "Stock Opname",
        short_name: "Stock Opname",
        description: "Pencatatan stok, daftar belanja, dan agenda toko",
        start_url: "/",
        display: "standalone",
        background_color: "#F1EEE3",
        theme_color: "#2F4A3C",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // App-shell di-cache supaya bisa dibuka lagi walau sinyal jelek;
        // data stok tetap real-time lewat Firestore saat online.
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
      },
    }),
  ],
});
