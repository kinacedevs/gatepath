/**
 * Gatepath Realtors — Inquiry Context
 * Expanded to match the real Gatepath Sales Booking Form (photo reference).
 * Persisted to sessionStorage so refreshing doesn't lose data.
 */
import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export interface InquiryFormData {
  // ── Plot Details (pre-filled from URL / plot map) ──
  phaseSlug: string;
  phaseName: string;
  phaseNumber: string;
  plotId: string;
  plotNumber: string;
  plotSize: string;
  plotPrice: number;
  plotLocation: string;

  // ── Special Instructions (Sales Booking Form) ──
  termsOfPayment: "cash" | "installment" | "";
  price: number;
  discount: number;
  deposit: number;
  balance: number;
  paymentPeriodMonths: number;
  monthlyPayment: number;

  // ── Client Details (Sales Booking Form) ──
  fullName: string;
  dateOfBirth: string;
  phone: string;
  postalAddress: string;
  email: string;
  kraPin: string;
  idNumber: string;        // ID/PASSPORT No
  occupation: string;

  // ── Next of Kin (Sales Booking Form) ──
  kinFullName: string;
  kinPhone: string;
  kinDob: string;
  kinRelationship: string;
  kinIdPassport: string;

  // ── How did you hear about us? ──
  heardFrom: string;

  // ── Legacy / Extra (kept for payment + visit flow) ──
  paymentPreference: string;
  locationPreference: string;
  questions: string;

  // ── Step 2 — Site visit ──
  visitDate: string;
  visitTime: string;
  attendees: string;
  visitNotes: string;

  // ── Step 3 — Payment ──
  depositAmount: number;
  loanPeriod: number;
  paymentMethod: string;

  // ── Step 4 — Reservation hold option ──
  reservePlot: boolean;
  transportMode: "air" | "road" | "self" | "";
}

const defaultForm: InquiryFormData = {
  phaseSlug: "",
  phaseName: "",
  phaseNumber: "",
  plotId: "",
  plotNumber: "",
  plotSize: "",
  plotPrice: 0,
  plotLocation: "",
  termsOfPayment: "",
  price: 0,
  discount: 0,
  deposit: 0,
  balance: 0,
  paymentPeriodMonths: 6,
  monthlyPayment: 0,
  fullName: "",
  dateOfBirth: "",
  phone: "",
  postalAddress: "",
  email: "",
  kraPin: "",
  idNumber: "",
  occupation: "",
  kinFullName: "",
  kinPhone: "",
  kinDob: "",
  kinRelationship: "",
  kinIdPassport: "",
  heardFrom: "",
  paymentPreference: "",
  locationPreference: "",
  questions: "",
  visitDate: "",
  visitTime: "morning",
  attendees: "1",
  visitNotes: "",
  depositAmount: 0,
  loanPeriod: 6,
  paymentMethod: "mpesa",
  reservePlot: false,
  transportMode: "",
};

const SESSION_KEY = "gatepath_inquiry_v2";

function loadFromSession(): InquiryFormData {
  if (typeof window === "undefined") return defaultForm;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) return { ...defaultForm, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return defaultForm;
}

const InquiryContext = createContext<{
  form: InquiryFormData;
  setForm: (data: Partial<InquiryFormData>) => void;
  resetForm: () => void;
}>({ form: defaultForm, setForm: () => {}, resetForm: () => {} });

export function InquiryProvider({ children }: { children: ReactNode }) {
  const [form, setFormState] = useState<InquiryFormData>(loadFromSession);

  // Persist every change to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(form));
    } catch {
      /* storage quota exceeded — ignore */
    }
  }, [form]);

  const setForm = (data: Partial<InquiryFormData>) =>
    setFormState((prev) => ({ ...prev, ...data }));

  const resetForm = () => {
    setFormState(defaultForm);
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
  };

  return (
    <InquiryContext.Provider value={{ form, setForm, resetForm }}>
      {children}
    </InquiryContext.Provider>
  );
}

export const useInquiry = () => useContext(InquiryContext);
