/**
 * Gatepath Realtors — Downloads (Phase 40B)
 *
 * Answers Optiven's "Newsletters & Downloads" module honestly: aggregates
 * real, already-existing per-phase documents (brochure_url, plot_map_url,
 * collected via Campaigns & Content since Phase 36) into one browsable
 * list instead of only being reachable one phase at a time. No new
 * schema, no fabricated documents — a pure read across data already
 * collected.
 */
import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { SectionHeroMedia } from "@/components/SectionHeroMedia";
import { supabase } from "@/lib/supabase";
import { FileText, Map as MapIcon, Download } from "lucide-react";

export const Route = createFileRoute("/downloads")({
  component: DownloadsPage,
  head: () => ({
    meta: [
      { title: "Downloads — Gatepath Realtors" },
      {
        name: "description",
        content:
          "Download brochures and plot maps for Gatepath Realtors' land projects across Kenya.",
      },
    ],
  }),
});

type PhaseDocs = {
  name: string;
  slug: string;
  brochure_url: string | null;
  plot_map_url: string | null;
};

function DownloadsPage() {
  const [phases, setPhases] = useState<PhaseDocs[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await (supabase as any)
        .from("phases")
        .select("name, slug, brochure_url, plot_map_url")
        .eq("is_archived", false)
        .order("name");
      setPhases(((data ?? []) as PhaseDocs[]).filter((p) => p.brochure_url || p.plot_map_url));
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-ivory text-foreground font-sans">
      <Navbar />

      <section className="relative pt-32 pb-16 bg-primary-deep text-white overflow-hidden">
        <SectionHeroMedia sectionKey="downloads" alt="Gatepath Realtors documents" />
        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-10">
          <span className="px-3 py-1 bg-accent/20 text-accent border border-accent/30 text-xs font-bold rounded-full uppercase tracking-wider">
            Documents
          </span>
          <h1 className="mt-4 font-serif font-bold text-4xl sm:text-5xl leading-tight">
            Downloads
          </h1>
          <p className="mt-3 text-base text-slate-300 max-w-2xl leading-relaxed">
            Project brochures and plot maps for every active phase, in one place.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 lg:px-10 py-12">
        {loading ? (
          <div className="py-24 text-center text-sm text-slate-500">Loading downloads…</div>
        ) : phases.length === 0 ? (
          <div className="py-24 text-center text-sm text-slate-500">
            No documents uploaded yet — check back soon, or{" "}
            <Link to="/properties" className="text-primary underline">
              browse our properties
            </Link>{" "}
            directly.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {phases.map((p) => (
              <div
                key={p.slug}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-xl border border-[#E5E0D8] p-5 shadow-sm"
              >
                <div>
                  <Link
                    to="/properties/$slug"
                    params={{ slug: p.slug }}
                    className="font-serif font-bold text-lg text-primary hover:text-primary-deep transition-colors"
                  >
                    {p.name}
                  </Link>
                </div>
                <div className="flex flex-wrap gap-2">
                  {p.brochure_url && (
                    <a
                      href={p.brochure_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary border border-[#EBE8E0] rounded-md px-3 py-2 hover:border-primary transition-colors"
                    >
                      <FileText size={14} /> Brochure <Download size={12} />
                    </a>
                  )}
                  {p.plot_map_url && (
                    <a
                      href={p.plot_map_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary border border-[#EBE8E0] rounded-md px-3 py-2 hover:border-primary transition-colors"
                    >
                      <MapIcon size={14} /> Plot Map <Download size={12} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Footer />
      <WhatsAppButton />
    </div>
  );
}
