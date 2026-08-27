/**
 * Gatepath Realtors — Vitest configuration
 *
 * Deliberately separate from vite.config.ts, not a merge of it: the main
 * config's cloudflare()/tanstackStart() plugins exist to make the Workers
 * runtime and TanStack Start's virtual modules resolve at build time —
 * neither is needed to run plain unit tests against pure TypeScript
 * functions, and pulling them into the test runner would add real
 * complexity (a Workers-shaped test environment) for no benefit to the
 * tests actually written so far, which exercise pure business logic with
 * no I/O. Revisit if/when tests need to exercise anything Workers-specific.
 */
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
