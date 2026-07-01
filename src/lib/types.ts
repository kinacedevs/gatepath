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
  phase_name: string | null;
  phase_slug: string | null;
  plot_size: string | null;
  plot_price: number | null;
  plot_location: string | null;
  payment_preference: string | null;
  location_preference: string | null;
  questions: string | null;
  heard_from: string | null;
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
  status: "pending" | "confirmed" | "completed" | "cancelled";
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

export type AdminUser = {
  id: string;
  email: string;
  full_name: string | null;
  role: "ceo" | "manager" | "agent";
  created_at: string;
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
      admin_users: {
        Row: AdminUser;
        Insert: Omit<AdminUser, "created_at">;
        Update: Partial<Omit<AdminUser, "id" | "created_at">>;
      };
    };
  };
};
