import React, { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { supabase } from "@/lib/supabase";
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  MessageCircle,
  Send,
  CheckCircle2,
  Loader2,
} from "lucide-react";

function sanitize(val: string): string {
  return val.replace(/[<>"'&]/g, "").trim();
}

// Same site_banners "contact_info" row Footer.tsx/WhatsAppButton.tsx/
// CTABanner.tsx already read — this is the page most directly about
// contact info, but it never queried it at all, so an edit in Site
// Content updated every other surface except this one.
const DEFAULT_CONTACT = {
  phone: "+254 799 488 488",
  whatsappNumber: "254799488488",
  email: "info@gatepathrealtors.com",
  addressLine1: "CNM Centre, 1st Floor",
  addressLine2: "Ruiru Eastern Bypass, Nairobi, Kenya",
};

export const Route = createFileRoute("/contact")({
  component: ContactPage,
  head: () => ({
    meta: [
      { title: "Contact Us — Gatepath Realtors | Call, WhatsApp, or Visit Us" },
      {
        name: "description",
        content:
          "Contact Gatepath Realtors. Call +254 799 488 488, chat on WhatsApp, or visit our head offices at CNM Centre, Ruiru Eastern Bypass, Nairobi.",
      },
    ],
  }),
});

function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [contact, setContact] = useState(DEFAULT_CONTACT);
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    subject: "Inquiry about Plots",
    message: "",
  });

  useEffect(() => {
    const fetchContactInfo = async () => {
      try {
        const { data } = await (supabase as any)
          .from("site_banners")
          .select("data")
          .eq("id", "contact_info")
          .maybeSingle();
        // Only override a field if the CEO has actually set it — otherwise
        // keep the matching default, no flash-to-empty.
        const d = data?.data;
        if (d) {
          setContact({
            phone: d.phone || DEFAULT_CONTACT.phone,
            whatsappNumber: d.whatsapp_number || DEFAULT_CONTACT.whatsappNumber,
            email: d.email || DEFAULT_CONTACT.email,
            addressLine1: d.address_line1 || DEFAULT_CONTACT.addressLine1,
            addressLine2: d.address_line2 || DEFAULT_CONTACT.addressLine2,
          });
        }
      } catch {
        // Defaults are already showing — nothing to do.
      }
    };
    fetchContactInfo();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    const { error } = await (supabase as any).from("inquiries").insert({
      client_full_name: sanitize(formData.fullName),
      client_email: formData.email.toLowerCase().trim(),
      client_phone: formData.phone.trim(),
      heard_from: "Contact Page",
      questions: `[${formData.subject}] ${sanitize(formData.message)}`,
      status: "pending",
    });

    setSubmitting(false);
    if (error) {
      setSubmitError(
        "Something went wrong sending your message. Please call or WhatsApp us directly.",
      );
      return;
    }
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-ivory text-foreground font-sans">
      <Navbar />

      {/* Hero Header */}
      <section className="relative pt-32 pb-20 bg-primary-deep text-white overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 lg:px-10 relative z-10">
          <div className="max-w-3xl space-y-4">
            <span className="px-3 py-1 bg-accent/20 text-accent border border-accent/30 text-xs font-bold rounded-full uppercase tracking-wider">
              WE ARE HERE FOR YOU
            </span>
            <h1 className="font-serif font-bold text-4xl sm:text-5xl lg:text-6xl leading-tight">
              Get in Touch with <span className="text-accent">Gatepath Realtors</span>
            </h1>
            <p className="text-base text-slate-300 max-w-2xl leading-relaxed">
              Have a question about our plots in Malindi, Sagana, Diani, or Matuu? Call us, chat via
              WhatsApp, or visit our head office in Ruiru, Nairobi.
            </p>
          </div>
        </div>
      </section>

      {/* Main Contact Grid Section */}
      <section className="mx-auto max-w-7xl px-6 lg:px-10 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Contact Cards Info Column */}
          <div className="lg:col-span-5 space-y-6">
            {/* Card 1: Direct Phone & WhatsApp */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#25D366]/15 flex items-center justify-center text-[#25D366]">
                <MessageCircle size={24} />
              </div>
              <div>
                <h3 className="font-serif font-bold text-xl text-primary-deep">
                  Direct Phone & WhatsApp
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Chat directly with a sales advisor or schedule a site visit.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <a
                  href={`https://wa.me/${contact.whatsappNumber}?text=Hello%20Gatepath%20Realtors%2C%20I%20would%20like%20to%20inquire.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-bold text-[#25D366] hover:underline"
                >
                  <MessageCircle size={16} /> WhatsApp: {contact.phone}
                </a>
                <p className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                  <Phone size={14} className="text-accent" /> Phone: {contact.phone}
                </p>
              </div>
            </div>

            {/* Card 2: Email & Office Address */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center text-primary">
                <MapPin size={24} />
              </div>
              <div>
                <h3 className="font-serif font-bold text-xl text-primary-deep">
                  Headquarters & Email
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Visit our customer operations office in Ruiru.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 space-y-2 text-xs text-slate-700">
                <p className="flex items-start gap-2">
                  <MapPin size={16} className="text-accent shrink-0 mt-0.5" />
                  <span>
                    <strong>{contact.addressLine1}</strong>
                    <br />
                    {contact.addressLine2}
                  </span>
                </p>
                <p className="flex items-center gap-2 pt-1">
                  <Mail size={16} className="text-accent shrink-0" />
                  <span>{contact.email}</span>
                </p>
              </div>
            </div>

            {/* Card 3: Opening Hours */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <Clock size={20} className="text-accent" />
                <h4 className="font-serif font-bold text-base text-primary-deep">Working Hours</h4>
              </div>
              <div className="text-xs text-slate-600 space-y-1 pt-1 border-t border-slate-100">
                <p className="flex justify-between">
                  <span>Monday – Friday:</span> <strong>8:00 AM – 6:00 PM</strong>
                </p>
                <p className="flex justify-between">
                  <span>Saturday:</span> <strong>9:00 AM – 4:00 PM</strong>
                </p>
                <p className="flex justify-between text-slate-400">
                  <span>Sunday & Public Holidays:</span> <span>Closed</span>
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Inquiry Form Column */}
          <div className="lg:col-span-7">
            <div className="bg-white p-8 lg:p-10 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-accent">
                  ONLINE INQUIRY
                </span>
                <h3 className="font-serif font-bold text-2xl text-primary-deep mt-1">
                  Send Us a Message
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Our sales team responds within 2 hours during office hours.
                </p>
              </div>

              {submitted ? (
                <div className="p-8 bg-green-50 rounded-2xl border border-green-200 text-center space-y-3">
                  <CheckCircle2 size={48} className="text-green-600 mx-auto" />
                  <h4 className="font-serif font-bold text-xl text-green-900">
                    Thank You! Message Received
                  </h4>
                  <p className="text-xs text-green-700 max-w-md mx-auto">
                    We have received your message. A Gatepath Realtor representative will contact
                    you shortly via phone or WhatsApp.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        placeholder="John Doe"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Phone / WhatsApp *</label>
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+254 700 000 000"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="john@example.com"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Subject</label>
                    <select
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-primary"
                    >
                      <option value="Inquiry about Plots">Inquiry about Plots</option>
                      <option value="Book Free Site Visit">Book Free Site Visit</option>
                      <option value="Diaspora Remote Purchase">Diaspora Remote Purchase</option>
                      <option value="Title Deed Inquiry">Title Deed Inquiry</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Your Message *</label>
                    <textarea
                      rows={4}
                      required
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Specify the plot or location you are interested in..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-primary"
                    />
                  </div>

                  {submitError && (
                    <p className="text-xs font-semibold text-red-600">{submitError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-4 bg-primary-deep hover:bg-footer-deep text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Sending...
                      </>
                    ) : (
                      <>
                        <Send size={16} /> Send Message Now
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Embedded Working Google Map */}
      <section className="mx-auto max-w-7xl px-6 lg:px-10 pb-16">
        <div className="w-full h-96 rounded-3xl overflow-hidden border border-slate-200 shadow-sm">
          <iframe
            title="Gatepath Realtors Ruiru Head Office Google Map"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15955.776264627253!2d36.9554!3d-1.1556!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x182f40076a0c0001%3A0x6b6c000000000000!2sRuiru%20Eastern%20Bypass%2C%20Nairobi!5e0!3m2!1sen!2ske!4v1700000000000!5m2!1sen!2ske"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen={false}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </section>

      <Footer />
      <WhatsAppButton />
    </div>
  );
}
