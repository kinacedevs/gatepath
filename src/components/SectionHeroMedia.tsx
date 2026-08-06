/**
 * Gatepath Realtors — Section Hero Media (Phase 41)
 * Reusable rotating photo/video background for module landing-page heroes
 * (Properties, Locations, Gallery, Downloads, FAQs, Blog) that previously
 * showed only a flat brand colour (or, on Blog, a hardcoded stock photo).
 * Reuses the exact carousel infrastructure already proven for the
 * Homepage/Diaspora Hero (Phase 38): useRotatingCarousel + MediaSlide,
 * fetching a per-section site_banners row admin-editable from Site
 * Content. Renders nothing when no media is set, so the section's own
 * existing background colour shows through unchanged — zero regression
 * until an admin uploads media for that section.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRotatingCarousel } from "@/hooks/useRotatingCarousel";
import { MediaSlide } from "@/components/MediaSlide";

export function SectionHeroMedia({ sectionKey, alt }: { sectionKey: string; alt: string }) {
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data } = await (supabase as any)
          .from("site_banners")
          .select("data")
          .eq("id", `${sectionKey}_hero`)
          .maybeSingle();
        const imgs = data?.data?.images;
        if (!cancelled && Array.isArray(imgs) && imgs.length > 0) setImages(imgs);
      } catch {
        // No media set for this section — the section's own background
        // colour keeps showing, nothing to do.
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [sectionKey]);

  const current = useRotatingCarousel(images.length);

  if (images.length === 0) return null;

  return (
    <div className="absolute inset-0 overflow-hidden">
      {images.map((src, i) => (
        <div
          key={src}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            i === current ? "opacity-100" : "opacity-0"
          }`}
        >
          <MediaSlide
            src={src}
            alt={alt}
            loading={i === 0 ? "eager" : "lazy"}
            className="h-full w-full object-cover"
          />
        </div>
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-primary-deep/90 via-primary-deep/60 to-primary-deep/40" />
    </div>
  );
}
