/**
 * Gatepath Realtors — Internal API (Part 2, Module 16)
 *
 * SERVER-ONLY. Imported exclusively by src/server.ts (the Cloudflare
 * Worker's actual fetch entry, never bundled to the client) — never import
 * this from a route or component file. That import-graph discipline is
 * what keeps getServiceClient() (see supabaseAdmin.ts's own warning) from
 * ever reaching the browser, the same safety boundary createServerFn gets
 * from build-time stripping, enforced here by hand since this file isn't
 * a createServerFn (no file-based API-route factory exists in this
 * TanStack Start version — checked directly in node_modules).
 *
 * Auth: `Authorization: Bearer <key>`, hashed and matched against
 * api_keys.key_hash (src/lib/apiKeyActions.ts issues real keys). Reads are
 * deliberately redacted — client_id_passport/client_kra_pin/kin_* never
 * appear here, since an API key could end up inside a third-party
 * automation tool. Lead creation requires the same NOT NULL fields the
 * real inquiries schema requires — no fabricated placeholder values for
 * what a given external source doesn't collect.
 */
import { z } from "zod";
import { getServiceClient } from "./supabaseAdmin";
import { checkAndRecordRateLimit } from "./rateLimiter";
import { sendResendEmail, sendAfricaTalkingSms } from "./notifications";
import { getTemplateOrDefault, renderTemplate } from "./messageTemplateActions";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "Cache-Control": "private, no-store" },
  });
}

async function hashKey(rawKey: string): Promise<string> {
  const data = new TextEncoder().encode(rawKey);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

type Scope = "leads:read" | "leads:write" | "plots:read" | "notify:send";

async function authenticate(
  request: Request,
): Promise<
  | { ok: true; scopes: Scope[]; keyId: string; fieldMapping: Record<string, string> | null }
  | { ok: false; response: Response }
> {
  const authHeader = request.headers.get("authorization") ?? "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return {
      ok: false,
      response: json({ error: "Missing Authorization: Bearer <key> header." }, 401),
    };
  }

  const service = getServiceClient();
  const keyHash = await hashKey(match[1].trim());

  const { data: keyRow } = await (service as any)
    .from("api_keys")
    .select("id, scopes, revoked_at, field_mapping")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (!keyRow || keyRow.revoked_at) {
    return { ok: false, response: json({ error: "Invalid or revoked API key." }, 401) };
  }

  await (service as any)
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", keyRow.id);

  return {
    ok: true,
    scopes: (keyRow.scopes as Scope[]) ?? [],
    keyId: keyRow.id,
    fieldMapping: keyRow.field_mapping ?? null,
  };
}

function requireScope(scopes: Scope[], required: Scope): Response | null {
  if (!scopes.includes(required)) {
    return json({ error: `This key doesn't have the '${required}' scope.` }, 403);
  }
  return null;
}

const LEAD_SAFE_COLUMNS =
  "id, client_full_name, client_phone, client_email, status, heard_from, phase_name, price, created_at";

async function handleLeadsList(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);
  const offset = Number(url.searchParams.get("offset")) || 0;

  const service = getServiceClient();
  const { data, error } = await (service as any)
    .from("inquiries")
    .select(LEAD_SAFE_COLUMNS)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return json({ error: error.message }, 500);
  return json({ data, limit, offset });
}

async function handleLeadDetail(id: string): Promise<Response> {
  const service = getServiceClient();
  const { data, error } = await (service as any)
    .from("inquiries")
    .select(LEAD_SAFE_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) return json({ error: error.message }, 500);
  if (!data) return json({ error: "Lead not found." }, 404);
  return json({ data });
}

// Module 3 audit finding: this is the one write endpoint reachable by a
// third party with just an API key, and it had no real runtime schema
// validation — the TS-typed .validator() pattern used elsewhere in this
// codebase is type-only, erased at build time. Real, first zod usage in
// this codebase (zod has been a declared dependency, imported nowhere,
// since it was added). Every field kept optional/loose where the DB
// column itself is nullable, matching the real schema rather than
// inventing stricter rules than the table enforces.
const leadCreateSchema = z.object({
  client_full_name: z.string().trim().min(1).max(200),
  client_email: z.string().trim().toLowerCase().email().max(320),
  client_phone: z.string().trim().min(6).max(30),
  client_id_passport: z.string().trim().min(1).max(50),
  heard_from: z.string().trim().max(100).optional(),
  questions: z.string().trim().max(2000).optional(),
});

/**
 * fieldMapping remaps external-field-name -> our-field-name BEFORE
 * validation, so a source whose webhook payload uses different keys
 * (e.g. "full_name" instead of "client_full_name") still lands correctly
 * — no bespoke code per vendor, just a per-key config (Settings
 * Expansion / admin.integrations.tsx).
 */
async function handleLeadCreate(
  request: Request,
  fieldMapping: Record<string, string> | null,
): Promise<Response> {
  let rawBody: Record<string, unknown>;
  try {
    rawBody = await request.json();
  } catch {
    return json({ error: "Request body must be valid JSON." }, 400);
  }

  const body: Record<string, unknown> = { ...rawBody };
  if (fieldMapping) {
    for (const [externalKey, ourKey] of Object.entries(fieldMapping)) {
      if (externalKey in rawBody) body[ourKey] = rawBody[externalKey];
    }
  }

  const parsed = leadCreateSchema.safeParse(body);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    return json({ error: `Invalid request body: ${issues.join("; ")}` }, 400);
  }
  const lead = parsed.data;

  const service = getServiceClient();
  const { data, error } = await (service as any)
    .from("inquiries")
    .insert({
      client_full_name: lead.client_full_name,
      client_email: lead.client_email,
      client_phone: lead.client_phone,
      client_id_passport: lead.client_id_passport,
      heard_from: lead.heard_from ?? null,
      questions: lead.questions ?? null,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) return json({ error: error.message }, 500);
  return json({ data }, 201);
}

async function handlePlotsList(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const status = url.searchParams.get("status");

  const service = getServiceClient();
  let query = (service as any)
    .from("plots")
    .select("plot_number, status, is_archived, phases(name, is_archived), plot_sizes(cash_price)")
    .order("plot_number", { ascending: true })
    .limit(200);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return json({ error: error.message }, 500);

  // Filtered in JS, not via .eq("is_archived", ...) — degrades gracefully
  // before migration 0022 is applied and the column doesn't exist yet
  // (undefined reads as "not archived", the pre-existing behavior).
  const visible = ((data as any[]) ?? [])
    .filter((row) => row.is_archived !== true && row.phases?.is_archived !== true)
    .map(({ is_archived: _archived, phases, ...rest }) => ({
      ...rest,
      phases: phases ? { name: phases.name } : null,
    }));

  return json({ data: visible });
}

// Module 3 audit finding: n8n never gets its own Resend/Africa's Talking
// credentials (docs/AUTOMATION_STRATEGY.md's decision #2) — every
// automation-triggered send routes through this endpoint instead, reusing
// Gatepath's existing provider integration, the message_templates
// fallback system, and one place responsible for delivery/compliance
// logic, rather than forking that into a second copy inside n8n.
const notifySendSchema = z.object({
  channel: z.enum(["email", "sms"]),
  to: z.string().trim().min(3).max(320),
  subject: z.string().trim().max(200).optional(),
  message: z.string().trim().min(1).max(5000),
  // Optional: render a saved message_templates row (Settings ->
  // Message Templates) instead of sending subject/message as-is —
  // {{var}} placeholders filled from `vars`. Falls back to the raw
  // subject/message passed above if the key has no saved template yet.
  templateKey: z.string().trim().max(100).optional(),
  vars: z.record(z.string(), z.string()).optional(),
});

async function handleNotifySend(request: Request): Promise<Response> {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return json({ error: "Request body must be valid JSON." }, 400);
  }

  const parsed = notifySendSchema.safeParse(rawBody);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    return json({ error: `Invalid request body: ${issues.join("; ")}` }, 400);
  }
  const body = parsed.data;
  const vars = body.vars ?? {};

  let subject = body.subject ?? "";
  let message = body.message;

  if (body.templateKey) {
    const service = getServiceClient();
    const template = await getTemplateOrDefault(service, body.templateKey, {
      subject,
      body: message,
    });
    subject = renderTemplate(template.subject, vars);
    message = renderTemplate(template.body, vars);
  } else {
    subject = renderTemplate(subject, vars);
    message = renderTemplate(message, vars);
  }

  if (body.channel === "email") {
    if (!subject) return json({ error: "subject is required for channel 'email'." }, 400);
    const result = await sendResendEmail(body.to, subject, message);
    if (!result.success) return json({ error: result.error ?? "Email send failed." }, 502);
    return json({ sent: true });
  }

  const result = await sendAfricaTalkingSms(body.to, message);
  if (!result.success) return json({ error: result.error ?? "SMS send failed." }, 502);
  return json({ sent: true });
}

/**
 * Wrapped in try/catch deliberately: this endpoint is reachable by plain
 * curl with just an API key, no browser session — unlike every other
 * server function this session, nothing upstream (a login flow, a portal
 * OTP check) already guarantees a working request shape before this code
 * runs. Any unexpected failure (a misconfigured secret, a transient DB
 * error) must still come back as clean JSON, never leak into server.ts's
 * generic branded HTML error page — a real client of this API only ever
 * expects JSON.
 */
export async function handleApiRequest(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const segments = url.pathname
      .replace(/^\/api\/v1\/?/, "")
      .split("/")
      .filter(Boolean);

    const auth = await authenticate(request);
    if (!auth.ok) return auth.response;

    // Module 3 audit finding: /api/v1/* had no rate limiting at all,
    // flagged explicitly in this endpoint's own earlier commit history —
    // now more relevant since n8n becomes a real, recurring caller.
    // Keyed per API key (not IP) since that's this surface's real
    // identity boundary. 60 requests/minute is a generous default for a
    // legitimate integration; a misconfigured or runaway workflow calling
    // in a tight loop is exactly what this catches.
    const rateLimit = await checkAndRecordRateLimit(`api-key:${auth.keyId}`, 60, 60);
    if (!rateLimit.allowed) {
      return json(
        { error: `Rate limit exceeded. Try again in ${rateLimit.retryAfterSeconds} second(s).` },
        429,
      );
    }

    // /leads
    if (segments[0] === "leads" && segments.length === 1) {
      if (request.method === "GET") {
        const scopeErr = requireScope(auth.scopes, "leads:read");
        if (scopeErr) return scopeErr;
        return await handleLeadsList(request);
      }
      if (request.method === "POST") {
        const scopeErr = requireScope(auth.scopes, "leads:write");
        if (scopeErr) return scopeErr;
        return await handleLeadCreate(request, auth.fieldMapping);
      }
    }

    // /leads/:id
    if (segments[0] === "leads" && segments.length === 2 && request.method === "GET") {
      const scopeErr = requireScope(auth.scopes, "leads:read");
      if (scopeErr) return scopeErr;
      return await handleLeadDetail(segments[1]);
    }

    // /plots
    if (segments[0] === "plots" && segments.length === 1 && request.method === "GET") {
      const scopeErr = requireScope(auth.scopes, "plots:read");
      if (scopeErr) return scopeErr;
      return await handlePlotsList(request);
    }

    // /notify — send an email/SMS through Gatepath's own provider
    // integration (Module 3 decision #2).
    if (segments[0] === "notify" && segments.length === 1 && request.method === "POST") {
      const scopeErr = requireScope(auth.scopes, "notify:send");
      if (scopeErr) return scopeErr;
      return await handleNotifySend(request);
    }

    return json({ error: "Not found." }, 404);
  } catch (err) {
    console.error("[API v1] Unhandled error:", err);
    return json({ error: "Internal server error." }, 500);
  }
}
