/**
 * Gatepath Realtors — Vite Build Configuration
 * Standard, community-driven config for TanStack Start + Cloudflare Workers.
 * Completely removes proprietary Lovable wrappers to resolve ESM compatibility issues.
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    // Must be first: gives Vite's SSR build access to the Workers runtime,
    // which is what lets our custom src/server.ts entry (wrangler.jsonc's
    // "main") actually resolve "@tanstack/react-start/server-entry" at
    // bundle time. Without this, `wrangler dev`/`wrangler deploy` bundle
    // server.ts with plain esbuild, which has no idea how to resolve
    // TanStack Start's Vite-generated virtual modules — the build fails
    // outright rather than silently dropping the custom entry.
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tsconfigPaths(),
    tailwindcss(),
    tanstackStart({
      server: {
        entry: "./src/server.ts",
      },
    }),
    react(),
  ],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
