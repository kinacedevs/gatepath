/**
 * Gatepath Realtors — Vite Build Configuration
 * TanStack Start + Cloudflare Workers
 */
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Redirect TanStack Start's bundled server entry to src/server.ts (SSR error wrapper).
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
});
