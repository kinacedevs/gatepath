import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => ((m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry)),
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

export default {
  async fetch(request: Request, env: any, ctx: any) {
    try {
      const url = new URL(request.url);
      const isGet = request.method === "GET";
      
      // Determine if the route is cacheable (anonymous read-only pages)
      const isCacheable = isGet && 
        !url.pathname.startsWith("/admin") && 
        !url.pathname.startsWith("/document") &&
        !url.pathname.startsWith("/api");

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
          if (!cacheHeader || (!cacheHeader.includes("private") && !cacheHeader.includes("no-store"))) {
            const responseToCache = new Response(normalized.body, normalized);
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

      return normalized;
    } catch (error) {
      console.error(error);
      return brandedErrorResponse();
    }
  },
};
