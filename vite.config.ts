import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The backend your team runs. During development every request to /api/...
// is forwarded there by Vite, so the browser never complains about CORS.
const BACKEND_URL = "https://biletflow.duckdns.org";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: { manualChunks: { translations: ["./src/i18n/messages.json"] } },
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: BACKEND_URL,
        changeOrigin: true,
        // Match Origin to the rewritten Host on the server-to-server hop.
        // The browser still calls its own origin through Vite.
        headers: { Origin: BACKEND_URL },
      },
    },
  },
});
