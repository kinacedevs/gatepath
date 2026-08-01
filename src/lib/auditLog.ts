/**
 * Gatepath Realtors — Audit Log Helper (Part 2, Module 10)
 * Not a server function itself — a small helper called from INSIDE
 * already-verified server function handlers that already hold a service
 * client and a verified caller identity. Wired into this session's own
 * newly-built server functions only (Document Vault, Buyer Preferences,
 * Tasks, Escalations). Deliberately NOT wired into the older protected
 * write paths (paymentActions.ts/inquiryActions.ts/bookingActions.ts/
 * plotActions.ts) — those stay exactly as CLAUDE.md protects them; wiring
 * a real audit trail into conveyancing/payment/status-transition logic is
 * separate, dedicated, separately-reviewed work, not folded in here.
 *
 * Failures here are swallowed (logged to console, never thrown) — an
 * audit-log write must never block or fail the real operation it's
 * describing.
 */

interface AuditEventInput {
  actorEmail: string | null;
  actorName: string | null;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown>;
}

export async function logAuditEvent(serviceClient: any, event: AuditEventInput): Promise<void> {
  try {
    await serviceClient.from("audit_log").insert({
      actor_email: event.actorEmail,
      actor_name: event.actorName,
      action: event.action,
      entity_type: event.entityType,
      entity_id: event.entityId ?? null,
      details: event.details ?? null,
    });
  } catch (err) {
    console.error("[AuditLog] Failed to record event:", event.action, err);
  }
}
