import { useState } from "react";
import { Facebook, Instagram, Music2, Phone, Mail, Building2, Send } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { useContactInfo } from "@/hooks/useContactInfo";
import logoIcon from "@/assets/logo-icon.png";

const locations = [
  "Malindi",
  "Mambrui",
  "Gongoni",
  "Diani",
  "Matuu",
  "Sagana",
  "Makutano",
  "Thika",
  "Juja",
  "Kithimani",
  "Kiambu",
  "Nanyuki",
];

export function Footer() {
  const contact = useContactInfo();
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterSubmitting, setNewsletterSubmitting] = useState(false);
  const [newsletterMsg, setNewsletterMsg] = useState<string | null>(null);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewsletterSubmitting(true);
    setNewsletterMsg(null);

    try {
      const { error } = await (supabase as any)
        .from("newsletter_subscribers")
        .insert({ email: newsletterEmail.trim().toLowerCase(), source: "website" });

      if (error) {
        setNewsletterMsg(
          error.code === "23505"
            ? "You're already on the list!"
            : "Something went wrong — please try again.",
        );
        return;
      }
      setNewsletterEmail("");
      setNewsletterMsg("Subscribed! Thanks for joining.");
    } catch {
      setNewsletterMsg("Something went wrong — please try again.");
    } finally {
      setNewsletterSubmitting(false);
    }
  };

  return (
    <footer id="contact" className="bg-footer-deep text-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 pt-20 pb-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
        {/* Brand */}
        <div>
          <Link to="/" aria-label="Gatepath Realtors — Home" className="flex items-center gap-3">
            <img
              src={logoIcon}
              alt="Gatepath Realtors"
              loading="lazy"
              style={{
                height: 64,
                width: 64,
                objectFit: "contain",
                display: "block",
                filter: "drop-shadow(0 2px 8px rgba(232,160,32,0.25))",
              }}
            />
            <span className="flex flex-col leading-tight">
              <span className="font-serif font-bold text-[20px] tracking-[0.03em] text-white">
                GATEPATH
              </span>
              <span className="font-serif font-bold text-[20px] tracking-[0.03em] text-accent -mt-1">
                REALTORS
              </span>
            </span>
          </Link>

          <p className="mt-4 font-serif italic text-[18px] text-accent">
            "Your Interest is Our Priority."
          </p>
          <p className="mt-4 text-[14px] text-white/60 leading-relaxed">
            Trusted Kenyan land specialists. From the Coast to the Highlands — we help you own a
            piece of Kenya.
          </p>
          <div className="mt-6 flex gap-3">
            {[
              { Icon: Facebook, href: contact.facebookUrl },
              { Icon: Instagram, href: contact.instagramUrl },
              { Icon: Music2, href: contact.tiktokUrl },
            ].map(({ Icon, href }, i) => (
              <a
                key={i}
                href={href}
                target={href === "#" ? undefined : "_blank"}
                rel={href === "#" ? undefined : "noopener noreferrer"}
                className="h-10 w-10 rounded-full border border-accent flex items-center justify-center text-white hover:bg-accent hover:text-primary transition-colors"
              >
                <Icon size={16} strokeWidth={1.5} />
              </a>
            ))}
          </div>

          <form onSubmit={handleNewsletterSubmit} className="mt-6 max-w-xs">
            <h4 className="font-numbers font-medium text-[11px] tracking-[0.3em] text-accent mb-2">
              STAY UPDATED
            </h4>
            <div className="flex gap-2">
              <input
                type="email"
                required
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder="Your email"
                className="min-w-0 flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-white/40 outline-none focus:border-accent"
              />
              <button
                type="submit"
                disabled={newsletterSubmitting}
                aria-label="Subscribe"
                className="shrink-0 w-10 h-10 rounded-lg bg-accent text-primary flex items-center justify-center hover:bg-accent-dark transition-colors disabled:opacity-60"
              >
                <Send size={15} />
              </button>
            </div>
            {newsletterMsg && <p className="mt-2 text-[12px] text-white/70">{newsletterMsg}</p>}
          </form>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="font-numbers font-medium text-[11px] tracking-[0.3em] text-accent">
            QUICK LINKS
          </h4>
          <ul className="mt-5 space-y-3 text-[14px] text-white/70">
            {[
              ["Home", "/"],
              ["Properties", "/properties"],
              ["Locations", "/properties"],
              ["Blog", "/blog"],
              ["About Us", "#about"],
              ["Contact", "#contact"],
            ].map(([l, h]) => (
              <li key={l}>
                {h.startsWith("/") ? (
                  <Link to={h} className="hover:text-accent hover:underline transition-colors">
                    {l}
                  </Link>
                ) : (
                  <a href={h} className="hover:text-accent hover:underline transition-colors">
                    {l}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Locations */}
        <div>
          <h4 className="font-numbers font-medium text-[11px] tracking-[0.3em] text-accent">
            WHERE WE OPERATE
          </h4>
          <ul className="mt-5 grid grid-cols-2 gap-x-3 gap-y-2 text-[14px] text-white/70">
            {locations.map((l) => (
              <li key={l}>
                <a href="#locations" className="hover:text-accent transition-colors">
                  {l}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="font-numbers font-medium text-[11px] tracking-[0.3em] text-accent">
            GET IN TOUCH
          </h4>
          <ul className="mt-5 space-y-4">
            <li>
              <a
                href={`tel:${contact.phone.replace(/\s/g, "")}`}
                className="inline-flex items-center gap-2 text-[15px] font-medium text-white hover:text-accent"
              >
                <Phone size={14} className="shrink-0" /> {contact.phone}
              </a>
            </li>
            <li>
              <a
                href={`mailto:${contact.email}`}
                className="inline-flex items-center gap-2 text-[14px] text-accent hover:underline"
              >
                <Mail size={14} className="shrink-0" /> {contact.email}
              </a>
            </li>
            <li className="flex items-start gap-2 text-[13px] text-white/60 leading-relaxed">
              <Building2 size={14} className="shrink-0 mt-0.5" />
              <span>
                {contact.addressLine1}
                <br />
                {contact.addressLine2}
              </span>
            </li>
            <li className="text-[13px] text-white/50">{contact.hours}</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-6 lg:px-10 py-6 flex flex-col md:flex-row justify-between gap-2 text-[13px] text-white/50">
          <span>© {new Date().getFullYear()} Gatepath Realtors. All rights reserved.</span>
          <div className="flex gap-5">
            <Link to="/privacy" className="hover:text-accent">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-accent">
              Terms of Use
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
