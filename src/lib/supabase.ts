/**
 * Gatepath Realtors — Supabase Client
 * Single source of truth for all database operations.
 * Env vars set in Cloudflare dashboard and .dev.vars locally.
 * NOTE: The anon key is intentionally public — it is safe to expose client-side.
 * Supabase Row-Level Security (RLS) policies protect all sensitive data server-side.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Primary: try env vars (Vite dev server or Cloudflare Workers runtime)
// Fallback: hardcoded public project credentials so the CRM works from any URL/port
const FALLBACK_URL = "https://hcnbgtnghvyyokspotfe.supabase.co";
const FALLBACK_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjbmJndG5naHZ5eW9rc3BvdGZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MDU0NTQsImV4cCI6MjA5ODQ4MTQ1NH0.pKGKeiIS6xK2A54LRcp5W4e3Z82_cmtv9xxNipTMQC8";

const supabaseUrl = (import.meta.env?.VITE_SUPABASE_URL ||
  (typeof process !== "undefined" ? process.env?.VITE_SUPABASE_URL : "") ||
  FALLBACK_URL) as string;

const supabaseAnonKey = (import.meta.env?.VITE_SUPABASE_ANON_KEY ||
  (typeof process !== "undefined" ? process.env?.VITE_SUPABASE_ANON_KEY : "") ||
  FALLBACK_KEY) as string;

console.log(
  "[Gatepath Supabase Init] URL:",
  supabaseUrl ? "Connected ✓" : "MISSING",
  "| Key:",
  supabaseAnonKey ? "Loaded ✓" : "MISSING",
);

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      "x-application-name": "gatepath-realtors",
    },
  },
});
