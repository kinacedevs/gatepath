/**
 * Gatepath Realtors — Campaigns & Content (VIZ_BLUEPRINT Phase 2, Slice 9)
 * Consolidates two previously separate Phase 5A mechanical splits into one
 * tabbed screen: the Media Manager + Affiliates table that already lived
 * here, plus the full Blog CRUD that lived at /admin/blog — a real, working
 * screen that was unreachable from the nav (AdminShell.tsx's nav entry has
 * said "Campaigns & Blog" since Phase 5A, anticipating exactly this fix).
 * /admin/blog now redirects here.
 *
 * No CLAUDE.md violation to fix in this slice: the Media Manager's
 * `phases.update()` and the Blog CRUD's `blog_posts` writes are direct
 * client calls, but neither table is in CLAUDE.md's forbidden list
 * (payments/agreements/bookings/plots.status) — same conclusion already
 * reached for the near-identical phases.youtube_video_url write left alone
 * in the Plot Inventory slice. All handler logic below is unchanged from
 * the two original files, only restyled and reorganized into tabs.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Megaphone, Check, Loader2, Plus, BookOpen, Edit2, X, Flame, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAdminSession } from "@/context/AdminSessionContext";
import { KpiCard } from "@/components/admin/KpiCard";
import { SectionCard } from "@/components/admin/SectionCard";
import { EmptyState } from "@/components/admin/EmptyState";
import { FreshnessStamp } from "@/components/admin/FreshnessStamp";
import { CategoryBarChart } from "@/components/admin/charts/CategoryBarChart";
import { TrendChart } from "@/components/admin/charts/TrendChart";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { locationToSlug } from "@/lib/locations";
import { MediaDropzone } from "@/components/admin/MediaDropzone";
import { MediaSlide } from "@/components/MediaSlide";
import type { Phase, Affiliate, BlogPost, NewsletterSubscriber } from "@/lib/types";

export const Route = createFileRoute("/admin/campaigns")({
  component: CampaignsAndContent,
});

function monthLabel(d: Date) {
  return d.toLocaleDateString("en-KE", { month: "short" });
}

function CampaignsAndContent() {
  const { adminRole, adminName } = useAdminSession();

  const [phases, setPhases] = useState<Phase[]>([]);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [newsletterSubscribers, setNewsletterSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Media Manager states
  const [mediaEditingPhaseId, setMediaEditingPhaseId] = useState("");
  const [mediaHeroImages, setMediaHeroImages] = useState<string[]>([]);
  const [mediaThumbnails, setMediaThumbnails] = useState<string[]>([]);
  const [mediaBrochure, setMediaBrochure] = useState("");
  const [mediaPlotMap, setMediaPlotMap] = useState("");
  const [mediaSitePlanImage, setMediaSitePlanImage] = useState("");
  const [mediaSaveLoading, setMediaSaveLoading] = useState(false);
  const [mediaSaveMsg, setMediaSaveMsg] = useState<string | null>(null);

  // Blog Management states — unchanged (folded in from admin.blog.tsx)
  const [creatingBlog, setCreatingBlog] = useState(false);
  const [editingBlog, setEditingBlog] = useState<BlogPost | null>(null);
  const [blogTitle, setBlogTitle] = useState("");
  const [blogSlug, setBlogSlug] = useState("");
  const [blogCategory, setBlogCategory] = useState<
    "Investment" | "Legal" | "Buying Guide" | "Company News" | "Project Update"
  >("Investment");
  const [blogSummary, setBlogSummary] = useState("");
  const [blogContent, setBlogContent] = useState("");
  const [blogTags, setBlogTags] = useState("");
  const [blogFeaturedImages, setBlogFeaturedImages] = useState<string[]>([]);
  const [blogStatus, setBlogStatus] = useState<"draft" | "published">("published");
  const [blogMetaTitle, setBlogMetaTitle] = useState("");
  const [blogMetaDescription, setBlogMetaDescription] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [phasesRes, affiliatesRes, blogRes, bannersRes, newsletterRes] = await Promise.all([
        supabase.from("phases").select("*").order("name"),
        supabase.from("affiliates").select("*").order("created_at", { ascending: false }),
        supabase.from("blog_posts").select("*").order("created_at", { ascending: false }),
        (supabase as any)
          .from("site_banners")
          .select("*")
          .in("id", ["location_images", "trust_bar_stats"]),
        (supabase as any)
          .from("newsletter_subscribers")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);

      setPhases((phasesRes.data as Phase[]) ?? []);
      setAffiliates((affiliatesRes.data as Affiliate[]) ?? []);
      setBlogPosts((blogRes.data as BlogPost[]) ?? []);
      setNewsletterSubscribers((newsletterRes.data as NewsletterSubscriber[]) ?? []);

      const banners = (bannersRes.data as { id: string; data: any }[]) ?? [];
      const locBanner = banners.find((b) => b.id === "location_images");
      const rawLocationImages = (locBanner?.data ?? {}) as Record<string, string | string[]>;
      const normalizedLocationImages: Record<string, string[]> = {};
      for (const [name, val] of Object.entries(rawLocationImages)) {
        normalizedLocationImages[name] = Array.isArray(val) ? val : val ? [val] : [];
      }
      setLocationImages(normalizedLocationImages);
      const trustBanner = banners.find((b) => b.id === "trust_bar_stats");
      setTrustSinceYear(
        trustBanner?.data?.trusted_since_year ? String(trustBanner.data.trusted_since_year) : "",
      );
      setTrustSatisfactionLabel(trustBanner?.data?.client_satisfaction_label ?? "");
    } catch (err) {
      console.error("Error loading campaigns data:", err);
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveMediaUrls = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminRole === "agent") {
      alert("Access Denied: Agents cannot manage media.");
      return;
    }
    if (!mediaEditingPhaseId) return;
    setMediaSaveLoading(true);
    setMediaSaveMsg(null);

    try {
      const { error } = await (supabase as any)
        .from("phases")
        .update({
          hero_image_urls: mediaHeroImages.length ? mediaHeroImages : null,
          image_urls: mediaThumbnails.length ? mediaThumbnails : null,
          brochure_url: mediaBrochure.trim() || null,
          plot_map_url: mediaPlotMap.trim() || null,
          site_plan_image_url: mediaSitePlanImage.trim() || null,
        })
        .eq("id", mediaEditingPhaseId);

      if (error) {
        setMediaSaveMsg("Error saving media URLs: " + error.message);
      } else {
        setMediaSaveMsg("Media URLs saved successfully!");
        loadData();
      }
    } catch (err: any) {
      setMediaSaveMsg("Something went wrong: " + (err?.message || "Unknown error."));
    } finally {
      setMediaSaveLoading(false);
    }
  };

  const handleSaveBlogPost = async (e: React.FormEvent) => {
    e.preventDefault();

    if (adminRole === "agent") {
      alert("Access Denied: Agents cannot manage blog posts.");
      return;
    }

    const postData = {
      title: blogTitle.trim(),
      slug:
        blogSlug.trim() ||
        blogTitle
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, ""),
      category: blogCategory,
      summary: blogSummary.trim(),
      content: blogContent.trim(),
      tags: blogTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      featured_images: blogFeaturedImages.length ? blogFeaturedImages : null,
      status: blogStatus,
      author_name: adminName || "Joe Muchiri",
      meta_title: blogMetaTitle.trim() || null,
      meta_description: blogMetaDescription.trim() || null,
    };

    try {
      if (editingBlog) {
        const { error } = await (supabase as any)
          .from("blog_posts")
          .update(postData)
          .eq("id", editingBlog.id);

        if (error) {
          alert("Error updating blog post: " + error.message);
        } else {
          setEditingBlog(null);
          setCreatingBlog(false);
          loadData();
        }
      } else {
        const { error } = await (supabase as any).from("blog_posts").insert(postData);

        if (error) {
          alert("Error creating blog post: " + error.message);
        } else {
          setCreatingBlog(false);
          loadData();
        }
      }
    } catch (err: any) {
      alert("Something went wrong saving the blog post: " + (err?.message || "Unknown error."));
    }
  };

  const handleDeleteBlogPost = async (id: string) => {
    if (adminRole === "agent") {
      alert("Access Denied: Agents cannot delete blog posts.");
      return;
    }

    if (!confirm("Are you sure you want to delete this blog post?")) return;

    try {
      const { error } = await supabase.from("blog_posts").delete().eq("id", id);

      if (error) {
        alert("Error deleting post: " + error.message);
      } else {
        loadData();
      }
    } catch (err: any) {
      alert("Something went wrong deleting the post: " + (err?.message || "Unknown error."));
    }
  };

  const openCreateBlog = () => {
    setEditingBlog(null);
    setBlogTitle("");
    setBlogSlug("");
    setBlogCategory("Investment");
    setBlogSummary("");
    setBlogContent("");
    setBlogTags("");
    setBlogFeaturedImages([]);
    setBlogStatus("published");
    setBlogMetaTitle("");
    setBlogMetaDescription("");
    setCreatingBlog(true);
  };

  const openEditBlog = (post: BlogPost) => {
    setEditingBlog(post);
    setBlogTitle(post.title);
    setBlogSlug(post.slug);
    setBlogCategory(post.category);
    setBlogSummary(post.summary);
    setBlogContent(post.content);
    setBlogTags(post.tags.join(", "));
    setBlogFeaturedImages(
      post.featured_images?.length
        ? post.featured_images
        : post.featured_image
          ? [post.featured_image]
          : [],
    );
    setBlogStatus(post.status);
    setBlogMetaTitle(post.meta_title || "");
    setBlogMetaDescription(post.meta_description || "");
    setCreatingBlog(true);
  };

  // ── Hot Picks (Part 3, Slice B) ──
  const [hotPickDrafts, setHotPickDrafts] = useState<
    Record<string, { isHotPick: boolean; order: string; expiresAt: string; badgeText: string }>
  >({});
  const [hotPickSaving, setHotPickSaving] = useState<string | null>(null);
  const [hotPickMsg, setHotPickMsg] = useState<string | null>(null);

  useEffect(() => {
    const drafts: typeof hotPickDrafts = {};
    for (const p of phases) {
      drafts[p.id] = {
        isHotPick: p.is_hot_pick,
        order: String(p.hot_pick_order ?? 0),
        expiresAt: p.hot_pick_expires_at ? p.hot_pick_expires_at.slice(0, 10) : "",
        badgeText: p.hot_pick_badge_text ?? "",
      };
    }
    setHotPickDrafts(drafts);
  }, [phases]);

  const handleSaveHotPick = async (phaseId: string) => {
    if (adminRole === "agent") {
      alert("Access Denied: Agents cannot manage Hot Picks.");
      return;
    }
    const draft = hotPickDrafts[phaseId];
    if (!draft) return;
    setHotPickSaving(phaseId);
    setHotPickMsg(null);

    try {
      const { error } = await (supabase as any)
        .from("phases")
        .update({
          is_hot_pick: draft.isHotPick,
          hot_pick_order: Number(draft.order) || 0,
          hot_pick_expires_at: draft.expiresAt || null,
          hot_pick_badge_text: draft.badgeText.trim() || null,
        })
        .eq("id", phaseId);

      if (error) {
        setHotPickMsg("Error saving: " + error.message);
      } else {
        setHotPickMsg("Saved.");
        loadData();
      }
    } catch (err: any) {
      setHotPickMsg("Something went wrong: " + (err?.message || "Unknown error."));
    } finally {
      setHotPickSaving(null);
    }
  };

  // ── Homepage Content: Location Images + Trust Bar Stats (Part 3, Slice C) ──
  const [locationImages, setLocationImages] = useState<Record<string, string[]>>({});
  const [trustSinceYear, setTrustSinceYear] = useState("");
  const [trustSatisfactionLabel, setTrustSatisfactionLabel] = useState("");
  const [homeContentSaving, setHomeContentSaving] = useState(false);
  const [homeContentMsg, setHomeContentMsg] = useState<string | null>(null);

  const handleSaveLocationImages = async () => {
    if (adminRole === "agent") {
      alert("Access Denied: Agents cannot manage homepage content.");
      return;
    }
    setHomeContentSaving(true);
    setHomeContentMsg(null);

    try {
      const { error } = await (supabase as any)
        .from("site_banners")
        .upsert(
          { id: "location_images", data: locationImages, updated_at: new Date().toISOString() },
          { onConflict: "id" },
        );
      setHomeContentMsg(error ? "Error saving: " + error.message : "Location images saved.");
    } catch (err: any) {
      setHomeContentMsg("Something went wrong: " + (err?.message || "Unknown error."));
    } finally {
      setHomeContentSaving(false);
    }
  };

  const handleSaveTrustBarStats = async () => {
    if (adminRole === "agent") {
      alert("Access Denied: Agents cannot manage homepage content.");
      return;
    }
    setHomeContentSaving(true);
    setHomeContentMsg(null);

    try {
      const { error } = await (supabase as any).from("site_banners").upsert(
        {
          id: "trust_bar_stats",
          data: {
            trusted_since_year: trustSinceYear ? Number(trustSinceYear) : null,
            client_satisfaction_label: trustSatisfactionLabel.trim() || null,
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );
      setHomeContentMsg(error ? "Error saving: " + error.message : "Trust bar stats saved.");
    } catch (err: any) {
      setHomeContentMsg("Something went wrong: " + (err?.message || "Unknown error."));
    } finally {
      setHomeContentSaving(false);
    }
  };

  // ── KPIs & charts (docs/VIZ_SPEC.md §10 — only the real items) ──
  const totalPosts = blogPosts.length;
  const publishedCount = blogPosts.filter((p) => p.status === "published").length;
  const draftCount = blogPosts.filter((p) => p.status === "draft").length;
  const totalAffiliates = affiliates.length;
  const activeHotPicksCount = phases.filter(
    (p) =>
      p.is_hot_pick && (!p.hot_pick_expires_at || new Date(p.hot_pick_expires_at) > new Date()),
  ).length;

  const postsByCategory = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of blogPosts) {
      counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
  }, [blogPosts]);

  const postsOverTime = useMemo(() => {
    const now = new Date();
    const monthBuckets = new Map<string, number>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthBuckets.set(`${d.getFullYear()}-${d.getMonth()}`, 0);
    }
    for (const p of blogPosts) {
      const d = new Date(p.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (monthBuckets.has(key)) monthBuckets.set(key, (monthBuckets.get(key) ?? 0) + 1);
    }
    return Array.from(monthBuckets.entries()).map(([key, value]) => {
      const [y, m] = key.split("-").map(Number);
      return { month: monthLabel(new Date(y, m, 1)), value };
    });
  }, [blogPosts]);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-primary font-bold">
            Campaigns &amp; Content
          </h1>
          <p className="text-body-md text-on-surface-variant">
            Manage project media, blog content, and affiliate partners.
          </p>
        </div>
        <FreshnessStamp updatedAt={lastUpdated} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="Total Posts" value={loading ? "…" : String(totalPosts)} icon={BookOpen} />
        <KpiCard
          label="Published"
          value={loading ? "…" : String(publishedCount)}
          icon={Check}
          tone="success"
        />
        <KpiCard label="Drafts" value={loading ? "…" : String(draftCount)} icon={Edit2} />
        <KpiCard
          label="Total Affiliates"
          value={loading ? "…" : String(totalAffiliates)}
          icon={Megaphone}
        />
        <KpiCard
          label="Active Hot Picks"
          value={loading ? "…" : String(activeHotPicksCount)}
          icon={Flame}
          tone="warning"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Posts by Category">
          {loading ? (
            <Skeleton className="h-45 rounded-xl" />
          ) : postsByCategory.length === 0 ? (
            <EmptyState title="No posts yet" />
          ) : (
            <CategoryBarChart data={postsByCategory} xKey="name" yKey="value" height={200} />
          )}
        </SectionCard>
        <SectionCard title="Posts Published — Last 6 Months">
          {loading ? (
            <Skeleton className="h-45 rounded-xl" />
          ) : (
            <TrendChart data={postsOverTime} xKey="month" yKey="value" height={200} />
          )}
        </SectionCard>
      </div>

      <Tabs defaultValue="media" className="flex flex-col gap-4">
        <TabsList className="w-fit">
          <TabsTrigger value="media">Media Manager</TabsTrigger>
          <TabsTrigger value="hotpicks">Hot Picks</TabsTrigger>
          <TabsTrigger value="homepage">Homepage Content</TabsTrigger>
          <TabsTrigger value="blog">Blog Posts</TabsTrigger>
          <TabsTrigger value="newsletter">Newsletter</TabsTrigger>
          <TabsTrigger value="affiliates">Affiliates</TabsTrigger>
        </TabsList>

        {/* ── MEDIA MANAGER ── */}
        <TabsContent value="media">
          <div className="luxury-card rounded-xl p-8 bg-white">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center text-accent-dark">
                <Megaphone size={20} />
              </div>
              <div>
                <h2 className="font-headline-md text-lg text-primary font-bold">
                  Global Media Manager
                </h2>
                <p className="text-[13px] text-on-surface-variant">
                  Update posters, hero sections, and project photos.
                </p>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-semibold text-primary uppercase mb-2">
                Select Phase to Update Media
              </label>
              <select
                value={mediaEditingPhaseId}
                onChange={(e) => {
                  const id = e.target.value;
                  setMediaEditingPhaseId(id);
                  const p = phases.find((ph) => ph.id === id);
                  if (p) {
                    setMediaHeroImages(Array.isArray(p.hero_image_urls) ? p.hero_image_urls : []);
                    setMediaBrochure(p.brochure_url || "");
                    setMediaThumbnails(
                      p.image_urls?.length ? p.image_urls : p.image_url ? [p.image_url] : [],
                    );
                    setMediaPlotMap(p.plot_map_url || "");
                    setMediaSitePlanImage(p.site_plan_image_url || "");
                  }
                }}
                className="w-full px-4 py-3 rounded-lg border border-outline-variant/40 text-[14px] outline-none"
              >
                <option value="">-- Select a Project Phase --</option>
                {phases.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {mediaEditingPhaseId && (
              <form
                onSubmit={handleSaveMediaUrls}
                className="bg-surface-container-low rounded-xl p-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[11px] font-semibold text-on-surface-variant uppercase mb-1.5">
                      Hero Section Photos &amp; Videos (rotates as a carousel, drag to reorder)
                    </label>
                    <MediaDropzone
                      value={mediaHeroImages}
                      onChange={(v) => setMediaHeroImages(v as string[])}
                      multi
                      accept="image/*,video/*"
                      category="phase-hero"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-on-surface-variant uppercase mb-1.5">
                      Project Photos &amp; Videos (Card Image + Gallery)
                    </label>
                    <MediaDropzone
                      value={mediaThumbnails}
                      onChange={(v) => setMediaThumbnails(v as string[])}
                      multi
                      accept="image/*,video/*"
                      category="phase-thumbnail"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-on-surface-variant uppercase mb-1.5">
                      Brochure PDF
                    </label>
                    <MediaDropzone
                      value={mediaBrochure}
                      onChange={(v) => setMediaBrochure(v as string)}
                      category="phase-brochure"
                      accept=".pdf,application/pdf"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-on-surface-variant uppercase mb-1.5">
                      Plot Map PDF
                    </label>
                    <MediaDropzone
                      value={mediaPlotMap}
                      onChange={(v) => setMediaPlotMap(v as string)}
                      category="phase-plot-map"
                      accept=".pdf,application/pdf"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-on-surface-variant uppercase mb-1.5">
                      Site Plan Image (for interactive map)
                    </label>
                    <p className="text-[11px] text-on-surface-variant/70 mb-1.5">
                      A plain photo/scan of the real site plan (not a PDF) — used as the background
                      for the interactive plot map once every plot is positioned on it in Land
                      Inventory's "Position Plots" mode.
                    </p>
                    <MediaDropzone
                      value={mediaSitePlanImage}
                      onChange={(v) => setMediaSitePlanImage(v as string)}
                      category="phase-site-plan"
                      accept="image/*"
                    />
                  </div>
                </div>
                {mediaSaveMsg && (
                  <div
                    className={`mt-4 px-3.5 py-2.5 rounded-lg text-[13px] ${
                      mediaSaveMsg.includes("Error")
                        ? "bg-error/10 text-error"
                        : "bg-success-container/15 text-on-success-container"
                    }`}
                  >
                    {mediaSaveMsg}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={mediaSaveLoading}
                  className="mt-5 px-6 py-3 bg-primary-container text-white rounded-lg font-semibold text-sm inline-flex items-center gap-2"
                >
                  {mediaSaveLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}{" "}
                  Save Media URLs
                </button>
              </form>
            )}
          </div>
        </TabsContent>

        {/* ── HOT PICKS ── */}
        <TabsContent value="hotpicks">
          <div className="luxury-card rounded-xl p-8 bg-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center text-accent-dark">
                <Flame size={20} />
              </div>
              <div>
                <h2 className="font-headline-md text-lg text-primary font-bold">
                  Weekly Hot Picks
                </h2>
                <p className="text-[13px] text-on-surface-variant">
                  Manually feature specific phases on the homepage, in your chosen order, with an
                  optional expiry and badge text. If none are featured (or all have expired), the
                  homepage falls back to its automatic "selling fastest right now" selection.
                </p>
              </div>
            </div>

            {hotPickMsg && (
              <div
                className={`mt-4 px-3.5 py-2.5 rounded-lg text-[13px] ${
                  hotPickMsg.includes("Error")
                    ? "bg-error/10 text-error"
                    : "bg-success-container/15 text-on-success-container"
                }`}
              >
                {hotPickMsg}
              </div>
            )}

            {phases.length === 0 ? (
              <div className="mt-6">
                <EmptyState title="No phases yet" />
              </div>
            ) : (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead className="border-b border-outline-variant/20">
                    <tr className="text-[11px] uppercase text-on-surface-variant">
                      <th className="py-2 pr-4">Phase</th>
                      <th className="py-2 pr-4">Featured</th>
                      <th className="py-2 pr-4">Order</th>
                      <th className="py-2 pr-4">Expires</th>
                      <th className="py-2 pr-4">Badge Text</th>
                      <th className="py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {phases.map((p) => {
                      const draft = hotPickDrafts[p.id];
                      if (!draft) return null;
                      const isExpired = draft.expiresAt && new Date(draft.expiresAt) < new Date();
                      return (
                        <tr key={p.id}>
                          <td className="py-2.5 pr-4 font-semibold">
                            {p.name}
                            {isExpired && (
                              <span className="ml-2 text-[10px] text-error font-bold uppercase">
                                Expired
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 pr-4">
                            <input
                              type="checkbox"
                              checked={draft.isHotPick}
                              onChange={(e) =>
                                setHotPickDrafts((prev) => ({
                                  ...prev,
                                  [p.id]: { ...draft, isHotPick: e.target.checked },
                                }))
                              }
                            />
                          </td>
                          <td className="py-2.5 pr-4">
                            <input
                              type="number"
                              value={draft.order}
                              onChange={(e) =>
                                setHotPickDrafts((prev) => ({
                                  ...prev,
                                  [p.id]: { ...draft, order: e.target.value },
                                }))
                              }
                              className="w-16 p-1.5 border border-outline-variant/40 rounded-md text-xs"
                            />
                          </td>
                          <td className="py-2.5 pr-4">
                            <input
                              type="date"
                              value={draft.expiresAt}
                              onChange={(e) =>
                                setHotPickDrafts((prev) => ({
                                  ...prev,
                                  [p.id]: { ...draft, expiresAt: e.target.value },
                                }))
                              }
                              className="p-1.5 border border-outline-variant/40 rounded-md text-xs"
                            />
                          </td>
                          <td className="py-2.5 pr-4">
                            <input
                              type="text"
                              value={draft.badgeText}
                              onChange={(e) =>
                                setHotPickDrafts((prev) => ({
                                  ...prev,
                                  [p.id]: { ...draft, badgeText: e.target.value },
                                }))
                              }
                              placeholder="Hot Pick"
                              className="w-full min-w-[140px] p-1.5 border border-outline-variant/40 rounded-md text-xs"
                            />
                          </td>
                          <td className="py-2.5 text-right">
                            <button
                              onClick={() => handleSaveHotPick(p.id)}
                              disabled={hotPickSaving === p.id}
                              className="px-3 py-1.5 bg-primary text-white font-label-md text-xs rounded-lg hover:opacity-90 disabled:opacity-60"
                            >
                              {hotPickSaving === p.id ? "Saving..." : "Save"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── HOMEPAGE CONTENT ── */}
        <TabsContent value="homepage">
          <div className="flex flex-col gap-6">
            {homeContentMsg && (
              <div
                className={`px-3.5 py-2.5 rounded-lg text-[13px] ${
                  homeContentMsg.includes("Error")
                    ? "bg-error/10 text-error"
                    : "bg-success-container/15 text-on-success-container"
                }`}
              >
                {homeContentMsg}
              </div>
            )}

            <div className="luxury-card rounded-xl p-8 bg-white">
              <h2 className="font-headline-md text-lg text-primary font-bold mb-1">
                Location Images
              </h2>
              <p className="text-[13px] text-on-surface-variant mb-5">
                Override the stock photo shown for each featured location on the homepage. Pricing
                and plot counts there are always live from real inventory — this only controls the
                photo.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.keys(locationToSlug).map((name) => (
                  <div key={name}>
                    <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">
                      {name}
                    </label>
                    <MediaDropzone
                      value={locationImages[name] || []}
                      onChange={(v) =>
                        setLocationImages((prev) => ({ ...prev, [name]: v as string[] }))
                      }
                      multi
                      accept="image/*,video/*"
                      category="location"
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={handleSaveLocationImages}
                disabled={homeContentSaving}
                className="mt-5 px-6 py-3 bg-primary-container text-white rounded-lg font-semibold text-sm disabled:opacity-60"
              >
                {homeContentSaving ? "Saving..." : "Save Location Images"}
              </button>
            </div>

            <div className="luxury-card rounded-xl p-8 bg-white">
              <h2 className="font-headline-md text-lg text-primary font-bold mb-1">
                Trust Bar Stats
              </h2>
              <p className="text-[13px] text-on-surface-variant mb-5">
                "Plots Sold" and "Prime Locations" on the homepage are always real, live counts from
                inventory. These two aren't tracked anywhere in the system, so they're set here
                directly.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">
                    Trusted Since (Year)
                  </label>
                  <input
                    type="number"
                    value={trustSinceYear}
                    onChange={(e) => setTrustSinceYear(e.target.value)}
                    placeholder="2020"
                    className="w-full p-2.5 border border-outline-variant/40 rounded-lg text-[13px] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">
                    Client Satisfaction Label
                  </label>
                  <input
                    type="text"
                    value={trustSatisfactionLabel}
                    onChange={(e) => setTrustSatisfactionLabel(e.target.value)}
                    placeholder="5★"
                    className="w-full p-2.5 border border-outline-variant/40 rounded-lg text-[13px] outline-none"
                  />
                </div>
              </div>
              <button
                onClick={handleSaveTrustBarStats}
                disabled={homeContentSaving}
                className="mt-5 px-6 py-3 bg-primary-container text-white rounded-lg font-semibold text-sm disabled:opacity-60"
              >
                {homeContentSaving ? "Saving..." : "Save Trust Bar Stats"}
              </button>
            </div>
          </div>
        </TabsContent>

        {/* ── BLOG POSTS ── */}
        <TabsContent value="blog">
          <div className="flex justify-end mb-3">
            {adminRole !== "agent" && (
              <button
                onClick={openCreateBlog}
                className="flex items-center gap-1.5 px-4.5 py-2.5 bg-accent rounded-lg text-white font-bold text-[13px]"
              >
                <Plus size={14} /> Add New Article
              </button>
            )}
          </div>
          <div className="luxury-card rounded-xl shadow-sm overflow-hidden bg-white">
            {blogPosts.length === 0 ? (
              <EmptyState icon={BookOpen} title="No articles in the database yet." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low border-b border-outline-variant/30">
                      {["Image", "Title & Summary", "Category", "Author", "Status", "Actions"].map(
                        (h) => (
                          <th
                            key={h}
                            className="px-5 py-3 text-left font-label-md text-[11px] text-on-surface-variant uppercase tracking-wide"
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {blogPosts.map((post) => (
                      <tr
                        key={post.id}
                        className="hover:bg-surface-container-low/50 transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <div className="w-14 h-9.5 rounded-md overflow-hidden bg-surface-container-low border border-outline-variant/30">
                            {(post.featured_images?.[0] ?? post.featured_image) && (
                              <MediaSlide
                                src={(post.featured_images?.[0] ?? post.featured_image) as string}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 max-w-70">
                          <div className="font-semibold text-[13px] text-primary-container truncate">
                            {post.title}
                          </div>
                          <div className="text-[12px] text-on-surface-variant truncate mt-0.5">
                            {post.summary}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-[13px] text-on-surface">{post.category}</td>
                        <td className="px-5 py-3.5 text-[13px] text-on-surface-variant">
                          {post.author_name}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${
                              post.status === "published"
                                ? "bg-success-container/15 text-on-success-container"
                                : "bg-warning-container/15 text-on-warning-container"
                            }`}
                          >
                            {post.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          {adminRole !== "agent" ? (
                            <div className="flex gap-1.5 justify-end">
                              <button
                                onClick={() => openEditBlog(post)}
                                title="Edit"
                                className="p-1.5 border border-outline-variant/40 rounded-md bg-white text-on-surface-variant"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteBlogPost(post.id)}
                                title="Delete"
                                className="p-1.5 border border-outline-variant/40 rounded-md bg-white text-on-surface-variant"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-on-surface-variant italic">
                              View only
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── NEWSLETTER ── */}
        <TabsContent value="newsletter">
          <div className="flex flex-col gap-4">
            <KpiCard
              label="Total Subscribers"
              value={loading ? "…" : String(newsletterSubscribers.length)}
              icon={Mail}
            />
            <div className="luxury-card rounded-xl shadow-sm overflow-hidden bg-white">
              {newsletterSubscribers.length === 0 ? (
                <div className="p-6">
                  <EmptyState title="No newsletter subscribers yet" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-surface-container-low border-b border-outline-variant/30">
                      <tr>
                        <th className="px-6 py-3 font-label-md text-on-surface-variant uppercase text-[11px]">
                          Email
                        </th>
                        <th className="px-6 py-3 font-label-md text-on-surface-variant uppercase text-[11px]">
                          Signed Up
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10">
                      {newsletterSubscribers.map((s) => (
                        <tr key={s.id}>
                          <td className="px-6 py-3 text-body-md text-on-surface">{s.email}</td>
                          <td className="px-6 py-3 text-body-md text-on-surface-variant">
                            {new Date(s.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── AFFILIATES ── */}
        <TabsContent value="affiliates">
          <div className="luxury-card rounded-xl shadow-sm overflow-hidden bg-white">
            <div className="px-6 py-4 border-b border-outline-variant/30">
              <h3 className="font-headline-md text-sm text-primary font-bold">
                Affiliate Partners
              </h3>
            </div>
            <table className="w-full border-collapse text-left">
              <thead className="bg-surface-container-low border-b border-outline-variant/30">
                <tr>
                  {["Partner Name", "Contact", "Referral Code", "Commission"].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-4 font-label-md text-[12px] text-primary uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {affiliates.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-on-surface-variant">
                      No affiliates registered yet.
                    </td>
                  </tr>
                ) : (
                  affiliates.map((aff) => (
                    <tr key={aff.id}>
                      <td className="px-6 py-4 font-semibold text-[14px] text-primary-container">
                        {aff.partner_name}
                      </td>
                      <td className="px-6 py-4 text-[13px] text-on-surface-variant">
                        {aff.phone}
                        <br />
                        {aff.email}
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-surface-container-low px-2 py-1 rounded-md font-mono text-[13px] text-primary-container border border-dashed border-accent">
                          {aff.referral_code}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-[14px] text-on-success-container">
                        {aff.commission_rate}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* ══════════════════════════════════════════════
          MODAL: CREATE / EDIT BLOG POST — logic unchanged, restyled only
      ══════════════════════════════════════════════ */}
      {creatingBlog && (
        <div className="fixed inset-0 z-100 bg-primary-container/55 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-165 rounded-2xl p-9 shadow-2xl max-h-[88vh] overflow-y-auto relative">
            <button
              onClick={() => setCreatingBlog(false)}
              className="absolute top-5 right-5 text-on-surface-variant hover:text-on-surface"
            >
              <X size={20} />
            </button>

            <h3 className="font-headline-lg text-[22px] text-primary font-bold">
              {editingBlog ? "Edit Article" : "Create New Article"}
            </h3>
            <p className="text-[13px] text-on-surface-variant mt-1.5">
              Publish SEO-optimized guides and news updates.
            </p>

            <form onSubmit={handleSaveBlogPost} className="mt-6 flex flex-col gap-4.5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">
                    Title
                  </label>
                  <input
                    type="text"
                    required
                    value={blogTitle}
                    onChange={(e) => setBlogTitle(e.target.value)}
                    placeholder="e.g. How to Buy Land Safely"
                    className="w-full p-2.5 border border-outline-variant/40 rounded-lg text-[13px] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">
                    URL Slug
                  </label>
                  <input
                    type="text"
                    value={blogSlug}
                    onChange={(e) => setBlogSlug(e.target.value)}
                    placeholder="how-to-buy-land-safely"
                    className="w-full p-2.5 border border-outline-variant/40 rounded-lg text-[13px] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">
                    Category
                  </label>
                  <select
                    value={blogCategory}
                    onChange={(e: any) => setBlogCategory(e.target.value)}
                    className="w-full p-2.5 border border-outline-variant/40 rounded-lg text-[13px] bg-white outline-none"
                  >
                    <option value="Investment">Investment</option>
                    <option value="Legal">Legal</option>
                    <option value="Buying Guide">Buying Guide</option>
                    <option value="Company News">Company News</option>
                    <option value="Project Update">Project Update</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">
                    Status
                  </label>
                  <select
                    value={blogStatus}
                    onChange={(e: any) => setBlogStatus(e.target.value)}
                    className="w-full p-2.5 border border-outline-variant/40 rounded-lg text-[13px] bg-white outline-none"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">
                  Featured Photos &amp; Videos
                </label>
                <MediaDropzone
                  value={blogFeaturedImages}
                  onChange={(v) => setBlogFeaturedImages(v as string[])}
                  multi
                  accept="image/*,video/*"
                  category="blog"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">
                  Summary
                </label>
                <textarea
                  required
                  rows={2}
                  value={blogSummary}
                  onChange={(e) => setBlogSummary(e.target.value)}
                  placeholder="Brief preview summary for listing cards..."
                  className="w-full p-2.5 border border-outline-variant/40 rounded-lg text-[13px] outline-none resize-y"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">
                  Content (Use double line breaks for paragraphs, ### for headings)
                </label>
                <textarea
                  required
                  rows={8}
                  value={blogContent}
                  onChange={(e) => setBlogContent(e.target.value)}
                  placeholder="Write article body here..."
                  className="w-full p-2.5 border border-outline-variant/40 rounded-lg text-[13px] outline-none resize-y"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={blogTags}
                  onChange={(e) => setBlogTags(e.target.value)}
                  placeholder="Title Deeds, Legal, Diaspora"
                  className="w-full p-2.5 border border-outline-variant/40 rounded-lg text-[13px] outline-none"
                />
              </div>

              <div className="pt-2.5 border-t border-outline-variant/20 space-y-3">
                <p className="text-[11px] text-on-surface-variant">
                  Optional — search engine/social-share overrides. Leave blank to use the title and
                  summary above.
                </p>
                <div>
                  <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">
                    Meta Title
                  </label>
                  <input
                    type="text"
                    value={blogMetaTitle}
                    onChange={(e) => setBlogMetaTitle(e.target.value)}
                    placeholder={blogTitle || "Defaults to the post title"}
                    className="w-full p-2.5 border border-outline-variant/40 rounded-lg text-[13px] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">
                    Meta Description
                  </label>
                  <textarea
                    rows={2}
                    value={blogMetaDescription}
                    onChange={(e) => setBlogMetaDescription(e.target.value)}
                    placeholder={blogSummary || "Defaults to the post summary"}
                    className="w-full p-2.5 border border-outline-variant/40 rounded-lg text-[13px] outline-none resize-y"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2.5 border-t border-outline-variant/30">
                <button
                  type="button"
                  onClick={() => setCreatingBlog(false)}
                  className="px-5 py-2.5 border border-outline-variant/40 rounded-lg bg-white text-on-surface font-semibold text-[13px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-accent rounded-lg text-white font-bold text-[13px]"
                >
                  Save Post
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
