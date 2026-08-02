/**
 * Gatepath Realtors — Database Types
 * Matches the Supabase schema v3 exactly.
 */

// ─── Row types (what comes back from SELECT) ─────────────────────────────────

export type Phase = {
  id: string;
  slug: string;
  phase_number: number | null;
  name: string;
  location: string;
  region: string;
  county: string | null;
  status: "active" | "coming_soon" | "sold_out";
  description: string | null;
  features: string[];
  image_url: string | null;
  youtube_video_url: string | null;
  /** PDF brochure URL (uploaded & managed from admin Media tab) */
  brochure_url: string | null;
  /** Plot map PDF URL for client download */
  plot_map_url: string | null;
  /** JSON-encoded array of hero carousel image URLs */
  hero_image_urls: string[] | null;
  /** Diaspora section banner override image URL */
  diaspora_image_url: string | null;
  total_plots: number;
  available_count: number;
  booked_count: number;
  sold_count: number;
  created_at: string;
  updated_at: string;
};

export type PlotSize = {
  id: string;
  phase_id: string;
  label: string;
  size_description: string | null;
  area_ha: number | null;
  cash_price: number;
  installment_price: number | null;
  installment_months: number | null;
  plot_type: "residential" | "commercial" | "agricultural" | "mixed";
  is_default: boolean;
  created_at: string;
};

export type Plot = {
  id: string;
  phase_id: string;
  size_id: string | null;
  plot_number: number;
  row_num: number;
  col_num: number;
  status: "available" | "booked" | "sold";
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  plot_sizes?: PlotSize;
};

export type Inquiry = {
  id: string;
  phase_id: string | null;
  plot_id: string | null;
  project_name: string | null;
  plot_number_ref: number | null;
  booking_date: string | null;
  cro_name: string | null;
  cro_phone: string | null;
  terms_of_payment: "cash" | "installment" | null;
  price: number | null;
  discount: number | null;
  deposit: number | null;
  balance: number | null;
  payment_period_months: number | null;
  monthly_payment: number | null;
  client_full_name: string;
  client_dob: string | null;
  client_phone: string;
  client_postal_address: string | null;
  client_email: string;
  client_kra_pin: string | null;
  client_id_passport: string;
  client_occupation: string | null;
  kin_full_name: string | null;
  kin_phone: string | null;
  kin_dob: string | null;
  kin_relationship: string | null;
  kin_id_passport: string | null;
  client_country: string | null;
  client_county: string | null;
  client_city: string | null;
  kin_occupation: string | null;
  kin_country_of_residence: string | null;
  kin_county: string | null;
  kin_city: string | null;
  kin_kra_pin: string | null;
  phase_name: string | null;
  phase_slug: string | null;
  plot_size: string | null;
  plot_price: number | null;
  plot_location: string | null;
  payment_preference: string | null;
  location_preference: string | null;
  questions: string | null;
  heard_from: string | null;
  referred_by: string | null;
  /** null = never asked (historical rows); true/false = an actual answer.
   * Added migration 0013 — never defaults to false, since that would
   * falsely imply "asked and declined." */
  marketing_opt_in: boolean | null;
  /** Pure annotations, not a status transition. Added migration 0017. */
  testimonial_requested_at: string | null;
  referral_invite_sent_at: string | null;
  status: "pending" | "reviewed" | "approved" | "rejected";
  created_at: string;
  updated_at: string;
};

export type Booking = {
  id: string;
  inquiry_id: string | null;
  visit_date: string | null;
  visit_time: "morning" | "afternoon";
  attendees: number;
  visit_notes: string | null;
  visit_type: "physical" | "virtual";
  pickup_location: string | null;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  /** Staff post-visit feedback — distinct from visit_notes (the client's
   * own pre-visit note). Added migration 0012. */
  staff_feedback: string | null;
  feedback_logged_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Payment = {
  id: string;
  inquiry_id: string | null;
  plot_id: string | null;
  paystack_reference: string | null;
  amount: number;
  deposit_amount: number | null;
  loan_period_months: number | null;
  payment_method: string | null;
  currency: string;
  status: "pending" | "success" | "failed" | "abandoned";
  paystack_response: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type Agreement = {
  id: string;
  payment_id: string | null;
  inquiry_id: string | null;
  ceo_signed: boolean;
  ceo_signed_at: string | null;
  pdf_receipt_url: string | null;
  pdf_agreement_url: string | null;
  email_sent: boolean;
  sms_sent: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * Issued on the first (deposit/reservation) payment against an inquiry —
 * distinct from `Agreement`, which only becomes valid once the client has
 * paid the full purchase price. See paymentActions.ts's recordVerifiedPayment.
 */
export type Offer = {
  id: string;
  inquiry_id: string;
  payment_id: string | null;
  ceo_signed: boolean;
  ceo_signed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminUser = {
  id: string;
  email: string;
  full_name: string | null;
  role: "ceo" | "manager" | "agent";
  /** 0–1 decimal (e.g. 0.03 = 3%). Nullable — not set = "not configured
   * yet", never a fabricated 0%. Added migration 0015. */
  commission_rate: number | null;
  created_at: string;
};

export type Affiliate = {
  id: string;
  partner_name: string;
  phone: string;
  email: string;
  referral_code: string;
  commission_rate: number;
  created_at: string;
};

export type SiteBanner = {
  id: string;
  data: Record<string, any>;
  updated_at: string;
};

export type Testimonial = {
  id: string;
  client_name: string;
  client_initials: string;
  quote: string;
  tag: string | null;
  is_published: boolean;
  display_order: number;
  /** null = staff-authored (existing behavior); set = submitted by the
   * client themselves via the portal. Added migration 0017. */
  submitted_by_inquiry_id: string | null;
  created_at: string;
};

export type TeamProfile = {
  id: string;
  full_name: string;
  role_title: string;
  photo_url: string | null;
  bio: string | null;
  is_published: boolean;
  display_order: number;
  created_at: string;
};

export type Faq = {
  id: string;
  question: string;
  answer: string;
  category: string;
  is_published: boolean;
  display_order: number;
  created_at: string;
};

export type DocumentType =
  "agreement" | "offer" | "receipt" | "title_deed" | "id_copy" | "poa" | "other";

export type DocumentRecord = {
  id: string;
  inquiry_id: string | null;
  document_type: DocumentType;
  storage_path: string;
  file_name: string;
  file_size_bytes: number | null;
  notes: string | null;
  uploaded_by_email: string | null;
  uploaded_by_name: string | null;
  created_at: string;
};

export type AuditLog = {
  id: string;
  actor_email: string | null;
  actor_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

export type BuyerPreference = {
  id: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  preferred_phase_id: string | null;
  preferred_location: string | null;
  min_budget_kes: number | null;
  max_budget_kes: number | null;
  stated_currency: string;
  notes: string | null;
  is_active: boolean;
  created_by_email: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
};

export type CommissionPayout = {
  id: string;
  inquiry_id: string;
  agent_email: string;
  agent_name: string | null;
  commission_rate_applied: number;
  commission_amount_kes: number;
  paid_at: string;
  paid_by_email: string | null;
  paid_by_name: string | null;
  created_at: string;
};

export type Goal = {
  id: string;
  agent_id: string | null;
  phase_id: string | null;
  metric: "revenue_kes" | "deals_closed" | "plots_sold";
  period_type: "month" | "quarter";
  period_start: string;
  target_value: number;
  created_by_email: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
};

export type ApiKey = {
  id: string;
  name: string;
  key_hash: string;
  key_prefix: string;
  scopes: string[];
  /** Optional external-field -> our-field remap for POST /api/v1/leads,
   * e.g. { "full_name": "client_full_name" }. Added migration 0020. */
  field_mapping: Record<string, string> | null;
  created_by_email: string | null;
  created_by_name: string | null;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

export type MessageTemplate = {
  id: string;
  key: string;
  name: string;
  channel: string;
  subject: string | null;
  body: string;
  updated_by_email: string | null;
  updated_by_name: string | null;
  updated_at: string;
};

export type Task = {
  id: string;
  title: string;
  description: string | null;
  due_at: string | null;
  assigned_to_email: string | null;
  assigned_to_name: string | null;
  related_inquiry_id: string | null;
  priority: "low" | "medium" | "high";
  status: "pending" | "completed" | "cancelled";
  created_by_email: string | null;
  created_by_name: string | null;
  created_at: string;
  completed_at: string | null;
};

export type InteractionLog = {
  id: string;
  inquiry_id: string;
  channel: "call" | "email" | "whatsapp" | "sms" | "site_visit" | "other";
  direction: "outbound" | "inbound";
  /** Meaningful only when channel === "call". Added migration 0014. */
  call_outcome:
    "connected" | "voicemail" | "no_answer" | "wrong_number" | "callback_requested" | null;
  notes: string | null;
  logged_by_name: string | null;
  logged_by_email: string | null;
  /** Optional GPS capture, meaningful mainly for channel === "site_visit".
   * Added migration 0018. Never required — capture can fail or not apply. */
  latitude: number | null;
  longitude: number | null;
  occurred_at: string;
  created_at: string;
};

export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  featured_image: string | null;
  category: "Investment" | "Legal" | "Buying Guide" | "Company News";
  author_name: string;
  tags: string[];
  status: "draft" | "published";
  created_at: string;
  updated_at: string;
};

// ─── Insert types ─────────────────────────────────────────────────────────────

export type InquiryInsert = Omit<Inquiry, "id" | "created_at" | "updated_at" | "status"> & {
  status?: "pending";
};

export type BookingInsert = Omit<Booking, "id" | "created_at" | "updated_at" | "status"> & {
  status?: "pending";
};

export type PaymentInsert = Omit<Payment, "id" | "created_at" | "updated_at" | "status"> & {
  status?: "pending";
};

// ─── Database generic type for Supabase client ────────────────────────────────

export type Database = {
  public: {
    Tables: {
      phases: {
        Row: Phase;
        Insert: Omit<Phase, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Phase, "id" | "created_at" | "updated_at">>;
      };
      plot_sizes: {
        Row: PlotSize;
        Insert: Omit<PlotSize, "id" | "created_at">;
        Update: Partial<Omit<PlotSize, "id" | "created_at">>;
      };
      plots: {
        Row: Plot;
        Insert: Omit<Plot, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Plot, "id" | "created_at" | "updated_at">>;
      };
      inquiries: {
        Row: Inquiry;
        Insert: Omit<Inquiry, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Inquiry, "id" | "created_at" | "updated_at">>;
      };
      bookings: {
        Row: Booking;
        Insert: Omit<Booking, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Booking, "id" | "created_at" | "updated_at">>;
      };
      payments: {
        Row: Payment;
        Insert: Omit<Payment, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Payment, "id" | "created_at" | "updated_at">>;
      };
      agreements: {
        Row: Agreement;
        Insert: Omit<Agreement, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Agreement, "id" | "created_at" | "updated_at">>;
      };
      offers: {
        Row: Offer;
        Insert: Omit<Offer, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Offer, "id" | "created_at" | "updated_at">>;
      };
      admin_users: {
        Row: AdminUser;
        Insert: Omit<AdminUser, "created_at">;
        Update: Partial<Omit<AdminUser, "id" | "created_at">>;
      };
      blog_posts: {
        Row: BlogPost;
        Insert: Omit<BlogPost, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<BlogPost, "id" | "created_at" | "updated_at">>;
      };
      affiliates: {
        Row: Affiliate;
        Insert: Omit<Affiliate, "id" | "created_at">;
        Update: Partial<Omit<Affiliate, "id" | "created_at">>;
      };
      site_banners: {
        Row: SiteBanner;
        Insert: { id: string; data: Record<string, any> };
        Update: { data?: Record<string, any>; updated_at?: string };
      };
      testimonials: {
        Row: Testimonial;
        Insert: Omit<Testimonial, "id" | "created_at">;
        Update: Partial<Omit<Testimonial, "id" | "created_at">>;
      };
      team_profiles: {
        Row: TeamProfile;
        Insert: Omit<TeamProfile, "id" | "created_at">;
        Update: Partial<Omit<TeamProfile, "id" | "created_at">>;
      };
      faqs: {
        Row: Faq;
        Insert: Omit<Faq, "id" | "created_at">;
        Update: Partial<Omit<Faq, "id" | "created_at">>;
      };
      interaction_log: {
        Row: InteractionLog;
        Insert: Omit<InteractionLog, "id" | "created_at">;
        Update: Partial<Omit<InteractionLog, "id" | "created_at">>;
      };
      tasks: {
        Row: Task;
        Insert: Omit<Task, "id" | "created_at">;
        Update: Partial<Omit<Task, "id" | "created_at">>;
      };
      buyer_preferences: {
        Row: BuyerPreference;
        Insert: Omit<BuyerPreference, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<BuyerPreference, "id" | "created_at" | "updated_at">>;
      };
      document_records: {
        Row: DocumentRecord;
        Insert: Omit<DocumentRecord, "id" | "created_at">;
        Update: Partial<Omit<DocumentRecord, "id" | "created_at">>;
      };
      audit_log: {
        Row: AuditLog;
        Insert: Omit<AuditLog, "id" | "created_at">;
        Update: Partial<Omit<AuditLog, "id" | "created_at">>;
      };
      commission_payouts: {
        Row: CommissionPayout;
        Insert: Omit<CommissionPayout, "id" | "created_at">;
        Update: Partial<Omit<CommissionPayout, "id" | "created_at">>;
      };
      goals: {
        Row: Goal;
        Insert: Omit<Goal, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Goal, "id" | "created_at" | "updated_at">>;
      };
      api_keys: {
        Row: ApiKey;
        Insert: Omit<ApiKey, "id" | "created_at">;
        Update: Partial<Omit<ApiKey, "id" | "created_at">>;
      };
      message_templates: {
        Row: MessageTemplate;
        Insert: Omit<MessageTemplate, "id" | "updated_at">;
        Update: Partial<Omit<MessageTemplate, "id" | "updated_at">>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      // Permissive record — prevents supabase.rpc() from collapsing to never
      [key: string]: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
