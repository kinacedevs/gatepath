/**
 * Gatepath Realtors — Photo & Video Gallery (Phase 40B)
 *
 * A real-content module answering Optiven's "Photo Gallery"/"Video
 * Gallery" pages, but built from data this platform already has rather
 * than a parallel upload system: every phase's own image_urls (photos and
 * videos, admin-uploaded via Campaigns & Content) plus published team
 * photos. No stock imagery, no fabricated content — only what staff have
 * actually uploaded, which is exactly the "prove real delivery" framing
 * this refinement pass is built around.
 */
import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { SectionHeroMedia } from "@/components/SectionHeroMedia";
import { MediaSlide } from "@/components/MediaSlide";
import { isVideoUrl } from "@/lib/media";
import { supabase } from "@/lib/supabase";
import { ImageIcon, Video, Images } from "lucide-react";

export const Route = createFileRoute("/gallery")({
  component: GalleryPage,
  head: () => ({
    meta: [
      { title: "Photo & Video Gallery — Gatepath Realtors" },
      {
        name: "description",
        content:
          "Real photos and videos from Gatepath Realtors' land projects and team — see the plots, progress, and people behind every sale.",
      },
    ],
  }),
});

type GalleryItem = {
  src: string;
  alt: string;
  kind: "photo" | "video";
  sourceLabel: string;
  phaseSlug?: string;
};

function GalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "photo" | "video">("all");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [phasesRes, teamRes] = await Promise.all([
        (supabase as any).from("phases").select("name, slug, image_urls").eq("is_archived", false),
        supabase.from("team_profiles").select("full_name, photo_urls").eq("is_published", true),
      ]);

      const gathered: GalleryItem[] = [];
      for (const phase of (phasesRes.data ?? []) as {
        name: string;
        slug: string;
        image_urls: string[] | null;
      }[]) {
        for (const url of phase.image_urls ?? []) {
          gathered.push({
            src: url,
            alt: phase.name,
            kind: isVideoUrl(url) ? "video" : "photo",
            sourceLabel: phase.name,
            phaseSlug: phase.slug,
          });
        }
      }
      for (const member of (teamRes.data ?? []) as {
        full_name: string;
        photo_urls: string[] | null;
      }[]) {
        for (const url of member.photo_urls ?? []) {
          gathered.push({
            src: url,
            alt: member.full_name,
            kind: isVideoUrl(url) ? "video" : "photo",
            sourceLabel: member.full_name,
          });
        }
      }
      setItems(gathered);
      setLoading(false);
    };
    load();
  }, []);

  const visible = items.filter((i) => filter === "all" || i.kind === filter);
  const photoCount = items.filter((i) => i.kind === "photo").length;
  const videoCount = items.filter((i) => i.kind === "video").length;

  return (
    <div className="min-h-screen bg-ivory text-foreground font-sans">
      <Navbar />

      <section className="relative pt-32 pb-16 bg-primary-deep text-white overflow-hidden">
        <SectionHeroMedia sectionKey="gallery" alt="Gatepath Realtors gallery" />
        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-10">
          <span className="px-3 py-1 bg-accent/20 text-accent border border-accent/30 text-xs font-bold rounded-full uppercase tracking-wider">
            Real Photos &amp; Videos
          </span>
          <h1 className="mt-4 font-serif font-bold text-4xl sm:text-5xl leading-tight">Gallery</h1>
          <p className="mt-3 text-base text-slate-300 max-w-2xl leading-relaxed">
            Every image and clip here comes straight from our actual projects and team — no stock
            photography.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 lg:px-10 py-12">
        <div className="flex flex-wrap items-center gap-3 mb-8">
          {(
            [
              ["all", `All (${items.length})`, Images],
              ["photo", `Photos (${photoCount})`, ImageIcon],
              ["video", `Videos (${videoCount})`, Video],
            ] as const
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                filter === key
                  ? "bg-primary text-white"
                  : "bg-white text-foreground border border-[#E5E0D8] hover:border-primary"
              }`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-24 text-center text-sm text-slate-500">Loading gallery…</div>
        ) : visible.length === 0 ? (
          <div className="py-24 text-center text-sm text-slate-500">
            No {filter !== "all" ? filter + "s" : "media"} uploaded yet — check back soon.
          </div>
        ) : (
          <div className="columns-2 sm:columns-3 lg:columns-4 gap-4 [column-fill:_balance]">
            {visible.map((item, i) => {
              const card = (
                <div className="mb-4 break-inside-avoid rounded-xl overflow-hidden border border-[#E5E0D8] bg-white shadow-[0_6px_20px_rgba(7,75,125,0.06)] group">
                  <MediaSlide
                    src={item.src}
                    alt={item.alt}
                    loading="lazy"
                    className="w-full h-auto block transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  <div className="px-3 py-2 text-[12px] font-semibold text-muted-foreground truncate">
                    {item.sourceLabel}
                  </div>
                </div>
              );
              return item.phaseSlug ? (
                <Link
                  key={i}
                  to="/properties/$slug"
                  params={{ slug: item.phaseSlug }}
                  className="block"
                >
                  {card}
                </Link>
              ) : (
                <div key={i}>{card}</div>
              );
            })}
          </div>
        )}
      </section>

      <Footer />
      <WhatsAppButton />
    </div>
  );
}
