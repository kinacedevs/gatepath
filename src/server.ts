import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { handleApiRequest } from "./lib/apiRoutes";
import { handlePaystackWebhook } from "./lib/paystackWebhook";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry),
    );
  }
  return serverEntryPromise;
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

// Public marketing routes that render identical HTML for every anonymous
// visitor. Anything not listed here is never written to the shared edge cache.
const PUBLIC_EXACT_ROUTES = new Set([
  "/",
  "/about",
  "/contact",
  "/locations",
  "/partner",
  "/privacy",
  "/blog",
  "/properties",
  "/diaspora",
]);

// Prefixes whose sub-paths are also public (e.g. /blog/my-post).
const PUBLIC_ROUTE_PREFIXES = ["/blog/", "/properties/"];

// Routes that render per-client data and must never be cached or stored.
// Kept explicit so the intent is reviewable alongside the allowlist.
const PRIVATE_ROUTE_PREFIXES = [
  "/portal",
  "/thank-you",
  "/admin",
  "/document",
  "/api",
  "/webhooks",
  "/inquire",
  "/payment",
  "/book-visit",
];

function isPublicCacheableRoute(pathname: string): boolean {
  // Normalise a trailing slash so "/about/" matches "/about".
  const path = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;

  if (isPrivateRoute(path)) return false;
  if (PUBLIC_EXACT_ROUTES.has(path)) return true;
  return PUBLIC_ROUTE_PREFIXES.some((prefix) => path.startsWith(prefix));
}

function isPrivateRoute(pathname: string): boolean {
  return PRIVATE_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

// Personalised responses must not be stored by the Cloudflare cache, any
// intermediary proxy, or the browser's back/forward cache.
function withNoStore(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
  headers.set("Vary", "Cookie");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: any, ctx: any) {
    try {
      const url = new URL(request.url);

      // Part 2, Module 16 — clean internal API. Dispatched here, before the
      // TanStack SSR handler, and returned directly: its own responses are
      // already private/no-store (see apiRoutes.ts's json() helper), so no
      // further wrapping is needed.
      if (url.pathname.startsWith("/api/v1/")) {
        return await handleApiRequest(request);
      }

      // Module 3 / Phase 2a — real Paystack webhook, closing the
      // abandoned-tab gap docs/SECURITY_HARDENING.md flagged as open.
      // Dispatched the same way /api/v1/* is, before the SSR fallthrough.
      if (url.pathname === "/webhooks/paystack" && request.method === "POST") {
        return await handlePaystackWebhook(request);
      }

      const isGet = request.method === "GET";

      // Determine if the route is cacheable (anonymous read-only pages).
      // SECURITY: this is an allowlist on purpose. A denylist fails open —
      // every new personalised route added later would silently inherit
      // public edge caching and leak one client's HTML to the next visitor.
      const isCacheable = isGet && isPublicCacheableRoute(url.pathname);

      // Access Cloudflare global cache (wrapped in try/catch for local dev safety)
      const cache = typeof caches !== "undefined" ? (caches as any).default : null;

      if (isCacheable && cache) {
        try {
          const cachedResponse = await cache.match(request);
          if (cachedResponse) {
            console.log(`[Gatepath Edge Cache] HIT: ${url.pathname}`);
            return cachedResponse;
          }
        } catch (cacheErr) {
          console.warn("[Gatepath Edge Cache] Match error:", cacheErr);
        }
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      const normalized = await normalizeCatastrophicSsrResponse(response);

      // Cache successful SSR responses
      if (isCacheable && cache && normalized.status === 200) {
        try {
          const cacheHeader = normalized.headers.get("Cache-Control");
          // Only cache if not explicitly marked private/no-store
          if (
            !cacheHeader ||
            (!cacheHeader.includes("private") && !cacheHeader.includes("no-store"))
          ) {
            const responseToCache = new Response(normalized.clone().body, normalized);
            // Cache for 60 seconds at the edge
            responseToCache.headers.set("Cache-Control", "public, max-age=60");

            if (ctx && typeof (ctx as any).waitUntil === "function") {
              (ctx as any).waitUntil(cache.put(request, responseToCache.clone()));
            } else {
              await cache.put(request, responseToCache.clone());
            }
            console.log(`[Gatepath Edge Cache] MISS -> cached: ${url.pathname}`);
          }
        } catch (cacheErr) {
          console.warn("[Gatepath Edge Cache] Put error:", cacheErr);
        }
      }

      if (isPrivateRoute(url.pathname)) {
        return withNoStore(normalized);
      }

      return normalized;
    } catch (error) {
      console.error(error);
      return brandedErrorResponse();
    }
  },
};
