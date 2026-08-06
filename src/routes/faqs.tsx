/**
 * Gatepath Realtors — Frequently Asked Questions (Phase 40B)
 *
 * `faqs.category = 'general'` has existed in schema/RLS and the admin CRUD
 * since Phase 30 but was never given a public page — diaspora.tsx already
 * renders `category = 'diaspora'` entries inline on its own page. This adds
 * the missing general-audience view, plus surfaces the diaspora set here
 * too so there's one central "all FAQs" destination the header can link to.
 */
import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { SectionHeroMedia } from "@/components/SectionHeroMedia";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { supabase } from "@/lib/supabase";
import type { Faq } from "@/lib/types";

export const Route = createFileRoute("/faqs")({
  component: FaqsPage,
  head: () => ({
    meta: [
      { title: "Frequently Asked Questions — Gatepath Realtors" },
      {
        name: "description",
        content:
          "Answers to common questions about buying land with Gatepath Realtors — payments, title deeds, site visits, and diaspora purchases.",
      },
    ],
  }),
});

function FaqsPage() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("faqs")
        .select("*")
        .eq("is_published", true)
        .order("display_order");
      setFaqs((data as Faq[]) ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const general = faqs.filter((f) => f.category !== "diaspora");
  const diaspora = faqs.filter((f) => f.category === "diaspora");

  return (
    <div className="min-h-screen bg-ivory text-foreground font-sans">
      <Navbar />

      <section className="relative pt-32 pb-16 bg-primary-deep text-white overflow-hidden">
        <SectionHeroMedia sectionKey="faqs" alt="Gatepath Realtors FAQs" />
        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-10">
          <span className="px-3 py-1 bg-accent/20 text-accent border border-accent/30 text-xs font-bold rounded-full uppercase tracking-wider">
            Support
          </span>
          <h1 className="mt-4 font-serif font-bold text-4xl sm:text-5xl leading-tight">
            Frequently Asked Questions
          </h1>
          <p className="mt-3 text-base text-slate-300 max-w-2xl leading-relaxed">
            Straight answers about buying, paying for, and owning land with Gatepath Realtors.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 lg:px-10 py-12 space-y-14">
        {loading ? (
          <div className="py-16 text-center text-sm text-slate-500">Loading FAQs…</div>
        ) : faqs.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-500">
            No FAQs published yet — check back soon.
          </div>
        ) : (
          <>
            {general.length > 0 && (
              <div>
                <h2 className="font-serif font-bold text-2xl text-primary mb-4">General</h2>
                <Accordion
                  type="single"
                  collapsible
                  className="bg-white rounded-xl border border-[#E5E0D8] px-5"
                >
                  {general.map((f) => (
                    <AccordionItem key={f.id} value={f.id}>
                      <AccordionTrigger className="text-[15px] font-semibold text-foreground">
                        {f.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-[14px] text-muted-foreground leading-relaxed">
                        {f.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )}

            {diaspora.length > 0 && (
              <div>
                <h2 className="font-serif font-bold text-2xl text-primary mb-4">
                  Diaspora Investment
                </h2>
                <Accordion
                  type="single"
                  collapsible
                  className="bg-white rounded-xl border border-[#E5E0D8] px-5"
                >
                  {diaspora.map((f) => (
                    <AccordionItem key={f.id} value={f.id}>
                      <AccordionTrigger className="text-[15px] font-semibold text-foreground">
                        {f.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-[14px] text-muted-foreground leading-relaxed">
                        {f.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )}
          </>
        )}
      </section>

      <Footer />
      <WhatsAppButton />
    </div>
  );
}
