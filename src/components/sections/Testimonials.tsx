import { useEffect, useState } from "react";
import { Reveal } from "@/components/Reveal";
import { supabase } from "@/lib/supabase";
import type { Testimonial } from "@/lib/types";

export function Testimonials() {
  const [items, setItems] = useState<Testimonial[]>([]);

  useEffect(() => {
    const fetchTestimonials = async () => {
      const { data } = await supabase
        .from("testimonials")
        .select("*")
        .eq("is_published", true)
        .order("display_order");
      setItems((data as Testimonial[]) ?? []);
    };
    fetchTestimonials();
  }, []);

  // No fabricated fallback content — if the CEO hasn't added any real
  // testimonials yet, hide the section rather than show placeholder quotes.
  if (items.length === 0) return null;

  return (
    <section className="bg-background py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <Reveal className="text-center max-w-3xl mx-auto">
          <span className="eyebrow">Client Stories</span>
          <h2 className="mt-5 font-serif font-semibold text-[36px] md:text-[52px] text-primary leading-[1.15]">
            What Our Landowners Say
          </h2>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          {items.map((t) => (
            <Reveal
              key={t.id}
              className="relative bg-white rounded-lg p-9 border-t-4 border-accent shadow-[var(--shadow-card)] hover:-translate-y-1 hover:shadow-[var(--shadow-hover)] transition-all duration-400 flex flex-col"
            >
              <div className="flex gap-0.5 text-accent text-lg">★★★★★</div>
              <div className="relative mt-4 flex-1">
                <span className="absolute -top-4 -left-2 font-serif text-[60px] leading-none text-accent/80">
                  "
                </span>
                <p className="relative font-serif italic text-[20px] text-foreground leading-[1.7]">
                  {t.quote}
                </p>
              </div>
              <div className="mt-6 h-px w-10 bg-accent" />
              <div className="mt-5 flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary text-white flex items-center justify-center font-sans font-semibold text-[14px]">
                  {t.client_initials}
                </div>
                <div>
                  <div className="font-sans font-semibold text-[16px] text-primary">
                    {t.client_name}
                  </div>
                  {t.tag && <div className="font-sans text-[13px] text-accent">{t.tag}</div>}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
