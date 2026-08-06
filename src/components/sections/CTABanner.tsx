import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Reveal } from "@/components/Reveal";
import { supabase } from "@/lib/supabase";

const DEFAULT_WHATSAPP_NUMBER = "254799488488";

export function CTABanner() {
  const [whatsappNumber, setWhatsappNumber] = useState(DEFAULT_WHATSAPP_NUMBER);

  useEffect(() => {
    const fetchContactInfo = async () => {
      try {
        const { data } = await (supabase as any)
          .from("site_banners")
          .select("data")
          .eq("id", "contact_info")
          .maybeSingle();
        // Only override if a real CEO-set number exists — otherwise keep
        // the default that's already rendering, no flash-to-nothing.
        const number = data?.data?.whatsapp_number;
        if (typeof number === "string" && number.trim()) {
          setWhatsappNumber(number.trim());
        }
      } catch {
        // Default number is already showing — nothing to do.
      }
    };
    fetchContactInfo();
  }, []);

  return (
    <section className="relative bg-gradient-to-br from-primary to-accent">
      <div className="mx-auto max-w-4xl px-6 lg:px-10 py-28 md:py-32 text-center">
        <Reveal>
          <h2 className="font-serif font-bold text-[38px] md:text-[56px] text-white leading-[1.1]">
            Your Plot is Waiting.
            <br />
            Take the First Step Today.
          </h2>
          <p className="mt-8 text-[17px] md:text-[19px] font-light text-white/90 leading-[1.75] max-w-2xl mx-auto">
            Browse available plots across Malindi, Sagana, Diani, Nanyuki, Thika and 7 more
            locations. Secure yours with a simple deposit — and receive your signed agreement the
            same day.
          </p>
          <div className="mt-10 flex flex-wrap gap-5 justify-center">
            <Link
              to="/properties"
              className="inline-flex items-center justify-center bg-accent text-white px-11 py-4 text-base font-semibold rounded-md hover:bg-accent-dark hover:scale-[1.02] transition-all duration-300"
            >
              Browse Available Plots →
            </Link>
            <a
              href={`https://wa.me/${whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center bg-white text-primary border-2 border-white px-11 py-4 text-base font-semibold rounded-md hover:bg-primary hover:text-white transition-all duration-300"
            >
              WhatsApp Us Now
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
