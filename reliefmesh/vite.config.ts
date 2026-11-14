import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";
import { VitePWA } from "vite-plugin-pwa";

// HTTPS is on by default because phone cameras only work over HTTPS.
// Set HTTP=1 to turn it off (e.g. `HTTP=1 npm run dev`).
const useHttps = !process.env.HTTP;

export default defineConfig({
  plugins: [
    react(),
    ...(useHttps ? [basicSsl()] : []),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,json,woff2}"],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
      manifest: {
        name: "ReliefMesh",
        short_name: "ReliefMesh",
        description: "Offline disaster mesh for SOS and Solana payments",
        theme_color: "#18211d",
        background_color: "#e6e8e4",
        display: "standalone",
        start_url: "/",
        icons: [{ src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
      },
    }),
  ],
  define: { global: "globalThis" },
  server: { host: true },
});
