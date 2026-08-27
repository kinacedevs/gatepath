/**
 * Gatepath Realtors — Client Portal Auth & Data (Server Functions)
 *
 * Fixes CRITIQUE P0-3. The old portal generated its OTP with Math.random()
 * in the browser, displayed it on screen in a "WhatsApp OTP Code" box,
 * stored it as plaintext, and verified it with a direct client-side query.
 * The "session" was sessionStorage["gatepath_portal_email"] — settable to
 * any value in devtools to view any client's data.
 *
 * Uses the service-role client from lib/supabaseAdmin.ts — see that file's
 * warning before touching this one.
 */
import { createServerFn } from "@tanstack/react-start";
import { getServiceClient } from "./supabaseAdmin";
import { sendResendEmail, sendAfricaTalkingSms } from "./notifications";
import { checkAndRecordRateLimit } from "./rateLimiter";

const OTP_TTL_MS = 5 * 60 * 1000;
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

function generateOtp(): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return String(100000 + (arr[0] % 900000));
}

async function hashOtp(otp: string, email: string): Promise<string> {
  // Salted with the email so the same OTP value never hashes the same way
  // across two different accounts.
  const data = new TextEncoder().encode(`${otp}:${email}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const requestPortalOtpFn = createServerFn({ method: "POST" })
  .validator((d: { email: string; phone: string }) => d)
  .handler(async ({ data }) => {
    const email = data.email.toLowerCase().trim();
    const phone = data.phone.replace(/[\s-]/g, "").trim();

    if (!email || !phone) {
      return { success: false as const, error: "Email and phone are required." };
    }

    // Module 3 audit finding: this endpoint had no throttling at all — a
    // real OTP-spam / SMS+email cost-amplification vector, already flagged
    // in docs/SECURITY_HARDENING.md. 3 requests / 15 minutes, checked
    // before the inquiries lookup so a blocked request never even queries
    // for a matching client.
    const rateLimit = await checkAndRecordRateLimit(`otp-request:${email}`, 3, 15 * 60);
    if (!rateLimit.allowed) {
      return {
        success: false as const,
        error: `Too many code requests. Please try again in ${Math.ceil(rateLimit.retryAfterSeconds / 60)} minute(s).`,
      };
    }

    const service = getServiceClient();

    const { data: inquiries, error: lookupErr } = await (service as any)
      .from("inquiries")
      .select("id, client_email, client_phone")
      .eq("client_email", email);

    if (lookupErr) {
      return { success: false as const, error: "Connection failure. Please try again." };
    }

    const matched = (inquiries || []).find((i: any) => {
      const dbPhone = (i.client_phone || "").replace(/[\s-]/g, "");
      return dbPhone.includes(phone) || phone.includes(dbPhone);
    });

    if (!matched) {
      return {
        success: false as const,
        error: "The email and phone number combination do not match any client profile.",
      };
    }

    const otp = generateOtp();
    const otpHash = await hashOtp(otp, email);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

    const { error: insertErr } = await (service as any)
      .from("client_otps")
      .insert({ email, phone, otp_code: otpHash, expires_at: expiresAt, attempts: 0 });

    if (insertErr) {
      // Never silently proceed to send a code that can't be verified — this
      // exact failure mode (insert error ignored, real SMS/email sent anyway)
      // is what caused every portal OTP to be unverifiable until migration
      // 0036 widened otp_code from varchar(6) to text.
      console.error("[Portal] Failed to persist OTP record:", insertErr);
      return {
        success: false as const,
        error:
          "Couldn't generate your verification code. Please try again shortly or contact support.",
      };
    }

    const [emailResult, smsResult] = await Promise.all([
      sendResendEmail(
        email,
        "Your Gatepath Client Portal Verification Code",
        `<p>Your one-time verification code is <strong style="font-size:20px">${otp}</strong>.</p><p>It expires in 5 minutes. If you didn't request this, you can ignore this email.</p>`,
      ),
      sendAfricaTalkingSms(
        phone,
        `Your Gatepath Client Portal code is ${otp}. Expires in 5 minutes.`,
      ),
    ]);

    if (!emailResult.success && !smsResult.success) {
      console.error("[Portal] OTP dispatch failed on both channels:", emailResult, smsResult);
      return {
        success: false as const,
        error: "Couldn't send your verification code. Please try again shortly or contact support.",
      };
    }

    return { success: true as const };
  });

export const verifyPortalOtpFn = createServerFn({ method: "POST" })
  .validator((d: { email: string; otp: string }) => d)
  .handler(async ({ data }) => {
    const email = data.email.toLowerCase().trim();
    const otp = data.otp.trim();

    if (!email || !otp) {
      return { success: false as const, error: "Enter the code you received." };
    }

    const service = getServiceClient();

    const { data: otpRow } = await (service as any)
      .from("client_otps")
      .select("*")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!otpRow) {
      return { success: false as const, error: "Request a new code first." };
    }

    if (new Date(otpRow.expires_at).getTime() < Date.now()) {
      return { success: false as const, error: "This code has expired. Please request a new one." };
    }

    if (otpRow.attempts >= MAX_OTP_ATTEMPTS) {
      return {
        success: false as const,
        error: "Too many incorrect attempts. Please request a new code.",
      };
    }

    const submittedHash = await hashOtp(otp, email);

    if (submittedHash !== otpRow.otp_code) {
      await (service as any)
        .from("client_otps")
        .update({ attempts: otpRow.attempts + 1 })
        .eq("id", otpRow.id);
      return { success: false as const, error: "Incorrect code. Please try again." };
    }

    const { data: session, error: sessionErr } = await (service as any)
      .from("portal_sessions")
      .insert({ email, expires_at: new Date(Date.now() + SESSION_TTL_MS).toISOString() })
      .select("token")
      .single();

    if (sessionErr || !session) {
      return { success: false as const, error: "Could not start your session. Please try again." };
    }

    return { success: true as const, sessionToken: session.token as string };
  });

async function resolveSessionEmail(sessionToken: string): Promise<string | null> {
  if (!sessionToken) return null;
  const service = getServiceClient();
  const { data: session } = await (service as any)
    .from("portal_sessions")
    .select("email, expires_at")
    .eq("token", sessionToken)
    .maybeSingle();

  if (!session || new Date(session.expires_at).getTime() < Date.now()) {
    return null;
  }
  return session.email as string;
}

export const getPortalDataFn = createServerFn({ method: "POST" })
  .validator((d: { sessionToken: string }) => d)
  .handler(async ({ data }) => {
    const email = await resolveSessionEmail(data.sessionToken);
    if (!email) {
      return { success: false as const, error: "Your session expired. Please sign in again." };
    }

    const service = getServiceClient();

    const { data: inquiries } = await (service as any)
      .from("inquiries")
      .select("*")
      .eq("client_email", email);

    const inqIds = (inquiries || []).map((i: any) => i.id);
    const phaseIds = Array.from(
      new Set((inquiries || []).map((i: any) => i.phase_id).filter(Boolean)),
    );

    const { data: payments } = inqIds.length
      ? await (service as any).from("payments").select("*").in("inquiry_id", inqIds)
      : { data: [] };

    const { data: bookings } = inqIds.length
      ? await (service as any).from("bookings").select("*").in("inquiry_id", inqIds)
      : { data: [] };

    const { data: offers } = inqIds.length
      ? await (service as any).from("offers").select("*").in("inquiry_id", inqIds)
      : { data: [] };

    const { data: agreements } = inqIds.length
      ? await (service as any).from("agreements").select("*").in("inquiry_id", inqIds)
      : { data: [] };

    const { data: interactions } = inqIds.length
      ? await (service as any).from("interaction_log").select("*").in("inquiry_id", inqIds)
      : { data: [] };

    const { data: documents } = inqIds.length
      ? await (service as any).from("document_records").select("*").in("inquiry_id", inqIds)
      : { data: [] };

    const { data: phases } = phaseIds.length
      ? await (service as any).from("phases").select("id, youtube_video_url").in("id", phaseIds)
      : { data: [] };

    const { data: testimonials } = inqIds.length
      ? await (service as any)
          .from("testimonials")
          .select("submitted_by_inquiry_id")
          .in("submitted_by_inquiry_id", inqIds)
      : { data: [] };

    return {
      success: true as const,
      inquiries: inquiries || [],
      payments: payments || [],
      bookings: bookings || [],
      offers: offers || [],
      agreements: agreements || [],
      interactions: interactions || [],
      documents: documents || [],
      phases: phases || [],
      testimonials: testimonials || [],
    };
  });

/**
 * Lets a client submit their own testimonial from the portal — the real,
 * novel gap Module 14 fills (every testimonial before this was staff-
 * authored). Ownership verified the same way assertPortalOwnsInquiryFn
 * does. One submission per inquiry — a second attempt is rejected rather
 * than creating a duplicate. Always inserts with is_published: false;
 * approval happens in admin.site-content.tsx's Testimonials tab, same
 * mechanism that already gates the public site.
 */
export const submitTestimonialFn = createServerFn({ method: "POST" })
  .validator((d: { sessionToken: string; inquiryId: string; quote: string }) => d)
  .handler(async ({ data }) => {
    const email = await resolveSessionEmail(data.sessionToken);
    if (!email) {
      return { success: false as const, error: "Your session expired. Please sign in again." };
    }

    const quote = data.quote.trim().slice(0, 1000);
    if (quote.length < 10) {
      return { success: false as const, error: "Please share a few more details." };
    }

    const service = getServiceClient();

    const { data: inquiry } = await (service as any)
      .from("inquiries")
      .select("id, client_email, client_full_name, phase_name")
      .eq("id", data.inquiryId)
      .maybeSingle();

    if (!inquiry || inquiry.client_email?.toLowerCase() !== email) {
      return { success: false as const, error: "This inquiry doesn't belong to your account." };
    }

    // "Handover-eligible" means fully paid AND finalized — an agreements row
    // alone only means payment cleared (paymentActions.ts inserts it with
    // ceo_signed: false); the CEO's own countersignature is the real signal
    // this deal is done, matching how admin.referrals-testimonials.tsx and
    // conveyancingStages.ts's stage 10 both already treat ceo_signed.
    const { data: agreement } = await (service as any)
      .from("agreements")
      .select("ceo_signed")
      .eq("inquiry_id", data.inquiryId)
      .maybeSingle();

    if (!agreement?.ceo_signed) {
      return {
        success: false as const,
        error: "Testimonials open up once your deal is fully finalized.",
      };
    }

    const { data: existing } = await (service as any)
      .from("testimonials")
      .select("id")
      .eq("submitted_by_inquiry_id", data.inquiryId)
      .maybeSingle();

    if (existing) {
      return { success: false as const, error: "You've already shared a testimonial for this." };
    }

    const nameParts = (inquiry.client_full_name || "").trim().split(/\s+/);
    const initials = nameParts
      .map((p: string) => p[0])
      .join("")
      .slice(0, 3)
      .toUpperCase();

    const { error } = await (service as any).from("testimonials").insert({
      client_name: inquiry.client_full_name,
      client_initials: initials || "?",
      quote,
      tag: inquiry.phase_name || null,
      is_published: false,
      display_order: 0,
      submitted_by_inquiry_id: data.inquiryId,
    });

    if (error) return { success: false as const, error: error.message };
    return { success: true as const };
  });

/**
 * Portal-side counterpart to documentVaultActions.ts's getDocumentSignedUrlFn
 * — same signed-URL mechanism, but ownership is verified against the
 * caller's own portal session (their client_email) rather than a staff
 * admin_users row, since portal clients have no Supabase Auth JWT at all.
 */
export const getPortalDocumentSignedUrlFn = createServerFn({ method: "POST" })
  .validator((d: { sessionToken: string; documentId: string }) => d)
  .handler(async ({ data }) => {
    const email = await resolveSessionEmail(data.sessionToken);
    if (!email) {
      return { success: false as const, error: "Your session expired. Please sign in again." };
    }

    const service = getServiceClient();

    const { data: record } = await (service as any)
      .from("document_records")
      .select("storage_path, inquiry_id")
      .eq("id", data.documentId)
      .maybeSingle();

    if (!record) return { success: false as const, error: "Document not found." };

    const { data: inquiry } = await (service as any)
      .from("inquiries")
      .select("client_email")
      .eq("id", record.inquiry_id)
      .maybeSingle();

    if (!inquiry || inquiry.client_email?.toLowerCase() !== email) {
      return { success: false as const, error: "This document doesn't belong to your account." };
    }

    const { data: signed, error } = await service.storage
      .from("documents")
      .createSignedUrl(record.storage_path, 300);

    if (error || !signed) {
      return { success: false as const, error: error?.message ?? "Could not sign URL." };
    }

    return { success: true as const, signedUrl: signed.signedUrl };
  });

/**
 * Used by the in-portal installment payment flow to prove the caller is the
 * one who's actually logged in before letting them pay against a given
 * inquiry — payment.tsx's verifyPaymentFn doesn't have a portal session to
 * check, so the portal calls this first.
 */
export const assertPortalOwnsInquiryFn = createServerFn({ method: "POST" })
  .validator((d: { sessionToken: string; inquiryId: string }) => d)
  .handler(async ({ data }) => {
    const email = await resolveSessionEmail(data.sessionToken);
    if (!email) {
      return { success: false as const, error: "Your session expired. Please sign in again." };
    }

    const service = getServiceClient();
    const { data: inquiry } = await (service as any)
      .from("inquiries")
      .select("id, client_email")
      .eq("id", data.inquiryId)
      .maybeSingle();

    if (!inquiry || inquiry.client_email?.toLowerCase() !== email) {
      return { success: false as const, error: "This inquiry doesn't belong to your account." };
    }

    return { success: true as const };
  });
