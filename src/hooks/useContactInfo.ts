import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface ContactInfo {
  phone: string;
  whatsappNumber: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  hours: string;
  facebookUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  youtubeUrl: string;
}

const DEFAULT_CONTACT: ContactInfo = {
  phone: "+254 799 488 488",
  whatsappNumber: "254799488488",
  email: "info@gatepathrealtors.com",
  addressLine1: "1st Floor, CNM Centre,",
  addressLine2: "Ruiru Eastern Bypass, Nairobi",
  hours: "Mon–Fri: 8am–6pm | Sat: 9am–4pm",
  facebookUrl: "#",
  instagramUrl: "#",
  tiktokUrl: "#",
  youtubeUrl: "#",
};

// Shared by Navbar, Footer, and WhatsAppButton so the `site_banners` row
// `contact_info` (CEO-editable via Site Content) is only fetched once per
// mounted consumer instead of three near-identical copies of the same
// query. Defaults render immediately; a real saved value only ever
// overrides, never flashes to empty.
export function useContactInfo(): ContactInfo {
  const [contact, setContact] = useState<ContactInfo>(DEFAULT_CONTACT);

  useEffect(() => {
    const fetchContactInfo = async () => {
      try {
        const { data } = await (supabase as any)
          .from("site_banners")
          .select("data")
          .eq("id", "contact_info")
          .maybeSingle();
        const d = data?.data;
        if (d) {
          setContact({
            phone: d.phone || DEFAULT_CONTACT.phone,
            whatsappNumber: d.whatsapp_number || DEFAULT_CONTACT.whatsappNumber,
            email: d.email || DEFAULT_CONTACT.email,
            addressLine1: d.address_line1 || DEFAULT_CONTACT.addressLine1,
            addressLine2: d.address_line2 || DEFAULT_CONTACT.addressLine2,
            hours: d.hours || DEFAULT_CONTACT.hours,
            facebookUrl: d.facebook_url || DEFAULT_CONTACT.facebookUrl,
            instagramUrl: d.instagram_url || DEFAULT_CONTACT.instagramUrl,
            tiktokUrl: d.tiktok_url || DEFAULT_CONTACT.tiktokUrl,
            youtubeUrl: d.youtube_url || DEFAULT_CONTACT.youtubeUrl,
          });
        }
      } catch {
        // Defaults are already showing — nothing to do.
      }
    };
    fetchContactInfo();
  }, []);

  return contact;
}
