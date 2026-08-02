-- Gatepath Realtors — Referral & Testimonial Capture (Part 2, Module 14)
-- ============================================================================
-- submitted_by_inquiry_id: nullable — null means staff-authored (existing
-- behaviour, unchanged); set means a client submitted it themselves via
-- the portal (src/lib/portalActions.ts's submitTestimonialFn, service
-- role only). No RLS change needed on testimonials — the client-facing
-- insert always goes through that service-role server function, never a
-- direct client insert, so the existing admin-full-access / public-
-- select-where-published policies already cover this correctly.
--
-- testimonial_requested_at / referral_invite_sent_at: pure annotations on
-- inquiries (not a status transition), same shape as bookings.staff_
-- feedback/feedback_logged_at from migration 0012.
--
-- SAFE TO RE-RUN: idempotent throughout.
-- ============================================================================

alter table public.testimonials
  add column if not exists submitted_by_inquiry_id uuid references public.inquiries(id) on delete set null;

alter table public.inquiries
  add column if not exists testimonial_requested_at timestamptz;

alter table public.inquiries
  add column if not exists referral_invite_sent_at timestamptz;
