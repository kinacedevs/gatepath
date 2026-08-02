/**
 * Gatepath Realtors — Site Content (VIZ_BLUEPRINT Phase 9)
 * New screen closing the gap named in docs/EXPANSION_GAP_ANALYSIS.md:
 * site_banners already exists with correct RLS but had zero admin UI
 * writing to it, and Testimonials/Team Profiles/FAQs were 100% hardcoded
 * in public-site JSX. Five tabs, same shadcn Tabs consolidation pattern
 * as admin.campaigns.tsx: Branding & Banners and Contact Info write to
 * the existing site_banners table (zero new schema); Testimonials, Team
 * Profiles, and FAQs are new tables (migration 0006_content_cms.sql).
 *
 * Role gate matches the existing Blog Posts precedent exactly: agents get
 * view-only, blocked from create/update/delete client-side. This is
 * marketing content, not a financial/legal write, so no CEO-only gate.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Globe,
  Phone,
  Quote,
  Users,
  HelpCircle,
  Plus,
  Edit2,
  X,
  Check,
  Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAdminSession } from "@/context/AdminSessionContext";
import { KpiCard } from "@/components/admin/KpiCard";
import { SectionCard } from "@/components/admin/SectionCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { EmptyState } from "@/components/admin/EmptyState";
import { FreshnessStamp } from "@/components/admin/FreshnessStamp";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { SiteBanner, Testimonial, TeamProfile, Faq } from "@/lib/types";

export const Route = createFileRoute("/admin/site-content")({
  component: SiteContent,
});

function findBanner(banners: SiteBanner[], id: string) {
  return banners.find((b) => b.id === id)?.data ?? {};
}

function SiteContent() {
  const { adminRole } = useAdminSession();
  const canWrite = adminRole !== "agent";

  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [banners, setBanners] = useState<SiteBanner[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [teamProfiles, setTeamProfiles] = useState<TeamProfile[]>([]);
  const [faqs, setFaqs] = useState<Faq[]>([]);

  // ── Branding & Banners form state ──
  const [homepageHeroImages, setHomepageHeroImages] = useState("");
  const [diasporaHeroImage, setDiasporaHeroImage] = useState("");
  const [brandingLogoUrl, setBrandingLogoUrl] = useState("");
  const [brandingCompanyName, setBrandingCompanyName] = useState("");
  const [brandingSaveLoading, setBrandingSaveLoading] = useState(false);
  const [brandingSaveMsg, setBrandingSaveMsg] = useState<string | null>(null);

  // ── Contact Info form state ──
  const [contactPhone, setContactPhone] = useState("");
  const [contactWhatsapp, setContactWhatsapp] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactAddressLine1, setContactAddressLine1] = useState("");
  const [contactAddressLine2, setContactAddressLine2] = useState("");
  const [contactHours, setContactHours] = useState("");
  const [contactFacebook, setContactFacebook] = useState("");
  const [contactInstagram, setContactInstagram] = useState("");
  const [contactTiktok, setContactTiktok] = useState("");
  const [contactSaveLoading, setContactSaveLoading] = useState(false);
  const [contactSaveMsg, setContactSaveMsg] = useState<string | null>(null);

  // ── Testimonials CRUD state ──
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [creatingTestimonial, setCreatingTestimonial] = useState(false);
  const [tClientName, setTClientName] = useState("");
  const [tClientInitials, setTClientInitials] = useState("");
  const [tQuote, setTQuote] = useState("");
  const [tTag, setTTag] = useState("");
  const [tIsPublished, setTIsPublished] = useState(true);
  const [tDisplayOrder, setTDisplayOrder] = useState(0);

  // ── Team Profiles CRUD state ──
  const [editingTeam, setEditingTeam] = useState<TeamProfile | null>(null);
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [teamFullName, setTeamFullName] = useState("");
  const [teamRoleTitle, setTeamRoleTitle] = useState("");
  const [teamPhotoUrl, setTeamPhotoUrl] = useState("");
  const [teamBio, setTeamBio] = useState("");
  const [teamIsPublished, setTeamIsPublished] = useState(true);
  const [teamDisplayOrder, setTeamDisplayOrder] = useState(0);

  // ── FAQs CRUD state ──
  const [editingFaq, setEditingFaq] = useState<Faq | null>(null);
  const [creatingFaq, setCreatingFaq] = useState(false);
  const [faqQuestion, setFaqQuestion] = useState("");
  const [faqAnswer, setFaqAnswer] = useState("");
  const [faqCategory, setFaqCategory] = useState<"general" | "diaspora">("general");
  const [faqIsPublished, setFaqIsPublished] = useState(true);
  const [faqDisplayOrder, setFaqDisplayOrder] = useState(0);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bannersRes, testimonialsRes, teamRes, faqsRes] = await Promise.all([
        supabase
          .from("site_banners")
          .select("*")
          .in("id", ["homepage_hero", "diaspora_hero", "custom_branding", "contact_info"]),
        supabase.from("testimonials").select("*").order("display_order"),
        supabase.from("team_profiles").select("*").order("display_order"),
        supabase.from("faqs").select("*").order("display_order"),
      ]);

      const bannerRows = (bannersRes.data as SiteBanner[]) ?? [];
      setBanners(bannerRows);
      setTestimonials((testimonialsRes.data as Testimonial[]) ?? []);
      setTeamProfiles((teamRes.data as TeamProfile[]) ?? []);
      setFaqs((faqsRes.data as Faq[]) ?? []);

      const heroData = findBanner(bannerRows, "homepage_hero");
      setHomepageHeroImages(Array.isArray(heroData.images) ? heroData.images.join("\n") : "");
      const diasporaData = findBanner(bannerRows, "diaspora_hero");
      setDiasporaHeroImage(diasporaData.image_url ?? "");
      const brandingData = findBanner(bannerRows, "custom_branding");
      setBrandingLogoUrl(brandingData.logo_url ?? "");
      setBrandingCompanyName(brandingData.company_name ?? "");
      const contactData = findBanner(bannerRows, "contact_info");
      setContactPhone(contactData.phone ?? "");
      setContactWhatsapp(contactData.whatsapp_number ?? "");
      setContactEmail(contactData.email ?? "");
      setContactAddressLine1(contactData.address_line1 ?? "");
      setContactAddressLine2(contactData.address_line2 ?? "");
      setContactHours(contactData.hours ?? "");
      setContactFacebook(contactData.facebook_url ?? "");
      setContactInstagram(contactData.instagram_url ?? "");
      setContactTiktok(contactData.tiktok_url ?? "");
    } catch (err) {
      console.error("Error loading site content:", err);
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) {
      setBrandingSaveMsg("Access Denied: Agents cannot manage site content.");
      return;
    }
    setBrandingSaveLoading(true);
    setBrandingSaveMsg(null);
    const now = new Date().toISOString();
    const heroImages = homepageHeroImages
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const { error } = await (supabase as any).from("site_banners").upsert([
      { id: "homepage_hero", data: { images: heroImages }, updated_at: now },
      { id: "diaspora_hero", data: { image_url: diasporaHeroImage.trim() }, updated_at: now },
      {
        id: "custom_branding",
        data: { logo_url: brandingLogoUrl.trim(), company_name: brandingCompanyName.trim() },
        updated_at: now,
      },
    ]);
    if (error) {
      setBrandingSaveMsg("Error saving: " + error.message);
    } else {
      setBrandingSaveMsg("Branding & banners saved successfully!");
      loadData();
    }
    setBrandingSaveLoading(false);
  };

  const handleSaveContactInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) {
      setContactSaveMsg("Access Denied: Agents cannot manage site content.");
      return;
    }
    setContactSaveLoading(true);
    setContactSaveMsg(null);
    const { error } = await (supabase as any).from("site_banners").upsert([
      {
        id: "contact_info",
        data: {
          phone: contactPhone.trim(),
          whatsapp_number: contactWhatsapp.trim(),
          email: contactEmail.trim(),
          address_line1: contactAddressLine1.trim(),
          address_line2: contactAddressLine2.trim(),
          hours: contactHours.trim(),
          facebook_url: contactFacebook.trim(),
          instagram_url: contactInstagram.trim(),
          tiktok_url: contactTiktok.trim(),
        },
        updated_at: new Date().toISOString(),
      },
    ]);
    if (error) {
      setContactSaveMsg("Error saving: " + error.message);
    } else {
      setContactSaveMsg("Contact info saved successfully!");
      loadData();
    }
    setContactSaveLoading(false);
  };

  // ── Testimonials handlers ──
  const openCreateTestimonial = () => {
    setEditingTestimonial(null);
    setTClientName("");
    setTClientInitials("");
    setTQuote("");
    setTTag("");
    setTIsPublished(true);
    setTDisplayOrder(testimonials.length);
    setCreatingTestimonial(true);
  };
  const openEditTestimonial = (t: Testimonial) => {
    setEditingTestimonial(t);
    setTClientName(t.client_name);
    setTClientInitials(t.client_initials);
    setTQuote(t.quote);
    setTTag(t.tag ?? "");
    setTIsPublished(t.is_published);
    setTDisplayOrder(t.display_order);
    setCreatingTestimonial(true);
  };
  const handleSaveTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) {
      alert("Access Denied: Agents cannot manage site content.");
      return;
    }
    const payload = {
      client_name: tClientName.trim(),
      client_initials: tClientInitials.trim().toUpperCase(),
      quote: tQuote.trim(),
      tag: tTag.trim() || null,
      is_published: tIsPublished,
      display_order: tDisplayOrder,
    };
    const { error } = editingTestimonial
      ? await (supabase as any).from("testimonials").update(payload).eq("id", editingTestimonial.id)
      : await (supabase as any).from("testimonials").insert(payload);
    if (error) {
      alert("Error saving testimonial: " + error.message);
    } else {
      setCreatingTestimonial(false);
      loadData();
    }
  };
  const handleDeleteTestimonial = async (id: string) => {
    if (!canWrite) {
      alert("Access Denied: Agents cannot manage site content.");
      return;
    }
    if (!confirm("Delete this testimonial?")) return;
    const { error } = await supabase.from("testimonials").delete().eq("id", id);
    if (error) alert("Error deleting: " + error.message);
    else loadData();
  };
  // Client-submitted testimonials (Module 14) start as is_published: false —
  // approving flips the same flag that already gates the public site.
  const handleApproveTestimonial = async (id: string) => {
    if (!canWrite) {
      alert("Access Denied: Agents cannot manage site content.");
      return;
    }
    const { error } = await (supabase as any)
      .from("testimonials")
      .update({ is_published: true })
      .eq("id", id);
    if (error) alert("Error approving: " + error.message);
    else loadData();
  };
  const handleRejectTestimonial = async (id: string) => {
    if (!canWrite) {
      alert("Access Denied: Agents cannot manage site content.");
      return;
    }
    if (!confirm("Reject and delete this submitted testimonial?")) return;
    const { error } = await supabase.from("testimonials").delete().eq("id", id);
    if (error) alert("Error rejecting: " + error.message);
    else loadData();
  };

  // ── Team Profiles handlers ──
  const openCreateTeam = () => {
    setEditingTeam(null);
    setTeamFullName("");
    setTeamRoleTitle("");
    setTeamPhotoUrl("");
    setTeamBio("");
    setTeamIsPublished(true);
    setTeamDisplayOrder(teamProfiles.length);
    setCreatingTeam(true);
  };
  const openEditTeam = (m: TeamProfile) => {
    setEditingTeam(m);
    setTeamFullName(m.full_name);
    setTeamRoleTitle(m.role_title);
    setTeamPhotoUrl(m.photo_url ?? "");
    setTeamBio(m.bio ?? "");
    setTeamIsPublished(m.is_published);
    setTeamDisplayOrder(m.display_order);
    setCreatingTeam(true);
  };
  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) {
      alert("Access Denied: Agents cannot manage site content.");
      return;
    }
    const payload = {
      full_name: teamFullName.trim(),
      role_title: teamRoleTitle.trim(),
      photo_url: teamPhotoUrl.trim() || null,
      bio: teamBio.trim() || null,
      is_published: teamIsPublished,
      display_order: teamDisplayOrder,
    };
    const { error } = editingTeam
      ? await (supabase as any).from("team_profiles").update(payload).eq("id", editingTeam.id)
      : await (supabase as any).from("team_profiles").insert(payload);
    if (error) {
      alert("Error saving team profile: " + error.message);
    } else {
      setCreatingTeam(false);
      loadData();
    }
  };
  const handleDeleteTeam = async (id: string) => {
    if (!canWrite) {
      alert("Access Denied: Agents cannot manage site content.");
      return;
    }
    if (!confirm("Delete this team profile?")) return;
    const { error } = await supabase.from("team_profiles").delete().eq("id", id);
    if (error) alert("Error deleting: " + error.message);
    else loadData();
  };

  // ── FAQs handlers ──
  const openCreateFaq = () => {
    setEditingFaq(null);
    setFaqQuestion("");
    setFaqAnswer("");
    setFaqCategory("general");
    setFaqIsPublished(true);
    setFaqDisplayOrder(faqs.length);
    setCreatingFaq(true);
  };
  const openEditFaq = (f: Faq) => {
    setEditingFaq(f);
    setFaqQuestion(f.question);
    setFaqAnswer(f.answer);
    setFaqCategory(f.category === "diaspora" ? "diaspora" : "general");
    setFaqIsPublished(f.is_published);
    setFaqDisplayOrder(f.display_order);
    setCreatingFaq(true);
  };
  const handleSaveFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) {
      alert("Access Denied: Agents cannot manage site content.");
      return;
    }
    const payload = {
      question: faqQuestion.trim(),
      answer: faqAnswer.trim(),
      category: faqCategory,
      is_published: faqIsPublished,
      display_order: faqDisplayOrder,
    };
    const { error } = editingFaq
      ? await (supabase as any).from("faqs").update(payload).eq("id", editingFaq.id)
      : await (supabase as any).from("faqs").insert(payload);
    if (error) {
      alert("Error saving FAQ: " + error.message);
    } else {
      setCreatingFaq(false);
      loadData();
    }
  };
  const handleDeleteFaq = async (id: string) => {
    if (!canWrite) {
      alert("Access Denied: Agents cannot manage site content.");
      return;
    }
    if (!confirm("Delete this FAQ?")) return;
    const { error } = await supabase.from("faqs").delete().eq("id", id);
    if (error) alert("Error deleting: " + error.message);
    else loadData();
  };

  const publishedTestimonials = useMemo(
    () => testimonials.filter((t) => t.is_published).length,
    [testimonials],
  );
  const publishedTeam = useMemo(
    () => teamProfiles.filter((m) => m.is_published).length,
    [teamProfiles],
  );
  const publishedFaqs = useMemo(() => faqs.filter((f) => f.is_published).length, [faqs]);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-primary font-bold">Site Content</h1>
          <p className="text-body-md text-on-surface-variant">
            Manage the public site's branding, contact info, testimonials, team, and FAQs.
          </p>
        </div>
        <FreshnessStamp updatedAt={lastUpdated} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          label="Published Testimonials"
          value={loading ? "…" : String(publishedTestimonials)}
          icon={Quote}
        />
        <KpiCard label="Team Members" value={loading ? "…" : String(publishedTeam)} icon={Users} />
        <KpiCard
          label="Published FAQs"
          value={loading ? "…" : String(publishedFaqs)}
          icon={HelpCircle}
        />
      </div>

      <Tabs defaultValue="branding" className="flex flex-col gap-4">
        <TabsList className="w-fit flex-wrap h-auto">
          <TabsTrigger value="branding">Branding & Banners</TabsTrigger>
          <TabsTrigger value="contact">Contact Info</TabsTrigger>
          <TabsTrigger value="testimonials">Testimonials</TabsTrigger>
          <TabsTrigger value="team">Team Profiles</TabsTrigger>
          <TabsTrigger value="faqs">FAQs</TabsTrigger>
        </TabsList>

        {/* ── BRANDING & BANNERS ── */}
        <TabsContent value="branding">
          <SectionCard title="Global Branding & Banners">
            {loading ? (
              <Skeleton className="h-70 rounded-xl" />
            ) : (
              <form onSubmit={handleSaveBranding} className="flex flex-col gap-5">
                <div>
                  <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">
                    Homepage Hero Images (one URL per line, rotates as a carousel)
                  </label>
                  <textarea
                    rows={4}
                    value={homepageHeroImages}
                    onChange={(e) => setHomepageHeroImages(e.target.value)}
                    placeholder="https://..."
                    className="w-full p-2.5 border border-outline-variant/40 rounded-lg text-[13px] outline-none resize-y"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">
                    Diaspora Hub Hero Image URL
                  </label>
                  <input
                    type="url"
                    value={diasporaHeroImage}
                    onChange={(e) => setDiasporaHeroImage(e.target.value)}
                    placeholder="https://..."
                    className="w-full p-2.5 border border-outline-variant/40 rounded-lg text-[13px] outline-none"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">
                      Logo URL (used on generated documents)
                    </label>
                    <input
                      type="url"
                      value={brandingLogoUrl}
                      onChange={(e) => setBrandingLogoUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full p-2.5 border border-outline-variant/40 rounded-lg text-[13px] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">
                      Company Name (used on generated documents)
                    </label>
                    <input
                      type="text"
                      value={brandingCompanyName}
                      onChange={(e) => setBrandingCompanyName(e.target.value)}
                      placeholder="Gatepath Realtors"
                      className="w-full p-2.5 border border-outline-variant/40 rounded-lg text-[13px] outline-none"
                    />
                  </div>
                </div>
                {brandingSaveMsg && (
                  <div
                    className={`px-3.5 py-2.5 rounded-lg text-[13px] ${
                      brandingSaveMsg.includes("Error") || brandingSaveMsg.includes("Denied")
                        ? "bg-error/10 text-error"
                        : "bg-success-container/15 text-on-success-container"
                    }`}
                  >
                    {brandingSaveMsg}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={brandingSaveLoading}
                  className="self-start px-6 py-3 bg-primary-container text-white rounded-lg font-semibold text-sm inline-flex items-center gap-2"
                >
                  {brandingSaveLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}{" "}
                  Save Branding & Banners
                </button>
              </form>
            )}
          </SectionCard>
        </TabsContent>

        {/* ── CONTACT INFO ── */}
        <TabsContent value="contact">
          <SectionCard title="Contact Info">
            {loading ? (
              <Skeleton className="h-70 rounded-xl" />
            ) : (
              <form onSubmit={handleSaveContactInfo} className="flex flex-col gap-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="+254 799 488 488"
                      className="w-full p-2.5 border border-outline-variant/40 rounded-lg text-[13px] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">
                      WhatsApp Number (digits only, e.g. 254799488488)
                    </label>
                    <input
                      type="text"
                      value={contactWhatsapp}
                      onChange={(e) => setContactWhatsapp(e.target.value)}
                      placeholder="254799488488"
                      className="w-full p-2.5 border border-outline-variant/40 rounded-lg text-[13px] outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="info@gatepathrealtors.com"
                    className="w-full p-2.5 border border-outline-variant/40 rounded-lg text-[13px] outline-none"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">
                      Office Address — Line 1
                    </label>
                    <input
                      type="text"
                      value={contactAddressLine1}
                      onChange={(e) => setContactAddressLine1(e.target.value)}
                      placeholder="1st Floor, CNM Centre,"
                      className="w-full p-2.5 border border-outline-variant/40 rounded-lg text-[13px] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">
                      Office Address — Line 2
                    </label>
                    <input
                      type="text"
                      value={contactAddressLine2}
                      onChange={(e) => setContactAddressLine2(e.target.value)}
                      placeholder="Ruiru Eastern Bypass, Nairobi"
                      className="w-full p-2.5 border border-outline-variant/40 rounded-lg text-[13px] outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">
                    Office Hours
                  </label>
                  <input
                    type="text"
                    value={contactHours}
                    onChange={(e) => setContactHours(e.target.value)}
                    placeholder="Mon–Fri: 8am–6pm | Sat: 9am–4pm"
                    className="w-full p-2.5 border border-outline-variant/40 rounded-lg text-[13px] outline-none"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">
                      Facebook URL
                    </label>
                    <input
                      type="url"
                      value={contactFacebook}
                      onChange={(e) => setContactFacebook(e.target.value)}
                      placeholder="https://facebook.com/..."
                      className="w-full p-2.5 border border-outline-variant/40 rounded-lg text-[13px] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">
                      Instagram URL
                    </label>
                    <input
                      type="url"
                      value={contactInstagram}
                      onChange={(e) => setContactInstagram(e.target.value)}
                      placeholder="https://instagram.com/..."
                      className="w-full p-2.5 border border-outline-variant/40 rounded-lg text-[13px] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">
                      TikTok URL
                    </label>
                    <input
                      type="url"
                      value={contactTiktok}
                      onChange={(e) => setContactTiktok(e.target.value)}
                      placeholder="https://tiktok.com/@..."
                      className="w-full p-2.5 border border-outline-variant/40 rounded-lg text-[13px] outline-none"
                    />
                  </div>
                </div>
                {contactSaveMsg && (
                  <div
                    className={`px-3.5 py-2.5 rounded-lg text-[13px] ${
                      contactSaveMsg.includes("Error") || contactSaveMsg.includes("Denied")
                        ? "bg-error/10 text-error"
                        : "bg-success-container/15 text-on-success-container"
                    }`}
                  >
                    {contactSaveMsg}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={contactSaveLoading}
                  className="self-start px-6 py-3 bg-primary-container text-white rounded-lg font-semibold text-sm inline-flex items-center gap-2"
                >
                  {contactSaveLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}{" "}
                  Save Contact Info
                </button>
              </form>
            )}
          </SectionCard>
        </TabsContent>

        {/* ── TESTIMONIALS ── */}
        <TabsContent value="testimonials">
          {(() => {
            const pending = testimonials.filter(
              (t) => !t.is_published && t.submitted_by_inquiry_id,
            );
            return pending.length > 0 ? (
              <SectionCard title="Pending Review — Submitted by Clients" className="mb-4">
                <div className="flex flex-col gap-3">
                  {pending.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-start justify-between gap-4 p-3 bg-surface-container-low rounded-lg"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-[14px] text-primary-container">
                          {t.client_name}
                          {t.tag && (
                            <span className="text-[12px] text-on-surface-variant font-normal">
                              {" "}
                              · {t.tag}
                            </span>
                          )}
                        </div>
                        <p className="text-[13px] text-on-surface mt-1">{t.quote}</p>
                      </div>
                      {canWrite && (
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            onClick={() => handleApproveTestimonial(t.id)}
                            className="p-1.5 border border-success-container/40 rounded-md bg-white text-on-success-container"
                            title="Approve — publish to public site"
                          >
                            <Check size={13} />
                          </button>
                          <button
                            onClick={() => handleRejectTestimonial(t.id)}
                            className="p-1.5 border border-outline-variant/40 rounded-md bg-white text-error"
                            title="Reject and delete"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </SectionCard>
            ) : null;
          })()}

          <div className="flex justify-end mb-3">
            {canWrite && (
              <button
                onClick={openCreateTestimonial}
                className="flex items-center gap-1.5 px-4.5 py-2.5 bg-accent rounded-lg text-white font-bold text-[13px]"
              >
                <Plus size={14} /> Add Testimonial
              </button>
            )}
          </div>
          <div className="luxury-card rounded-xl shadow-sm overflow-hidden bg-white">
            {loading ? (
              <div className="p-6 flex flex-col gap-3">
                <Skeleton className="h-16 rounded-lg" />
                <Skeleton className="h-16 rounded-lg" />
              </div>
            ) : testimonials.length === 0 ? (
              <EmptyState icon={Quote} title="No testimonials yet." />
            ) : (
              <div className="divide-y divide-outline-variant/10">
                {testimonials.map((t) => (
                  <div key={t.id} className="flex items-start justify-between gap-4 px-6 py-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[14px] text-primary-container">
                          {t.client_name}
                        </span>
                        <StatusBadge tone={t.is_published ? "success" : "neutral"}>
                          {t.is_published ? "published" : "draft"}
                        </StatusBadge>
                      </div>
                      {t.tag && (
                        <div className="text-[12px] text-on-surface-variant mt-0.5">{t.tag}</div>
                      )}
                      <p className="text-[13px] text-on-surface mt-1.5 line-clamp-2">{t.quote}</p>
                    </div>
                    {canWrite && (
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => openEditTestimonial(t)}
                          className="p-1.5 border border-outline-variant/40 rounded-md bg-white text-on-surface-variant"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteTestimonial(t.id)}
                          className="p-1.5 border border-outline-variant/40 rounded-md bg-white text-on-surface-variant"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── TEAM PROFILES ── */}
        <TabsContent value="team">
          <div className="flex justify-end mb-3">
            {canWrite && (
              <button
                onClick={openCreateTeam}
                className="flex items-center gap-1.5 px-4.5 py-2.5 bg-accent rounded-lg text-white font-bold text-[13px]"
              >
                <Plus size={14} /> Add Team Member
              </button>
            )}
          </div>
          <div className="luxury-card rounded-xl shadow-sm overflow-hidden bg-white">
            {loading ? (
              <div className="p-6 flex flex-col gap-3">
                <Skeleton className="h-16 rounded-lg" />
                <Skeleton className="h-16 rounded-lg" />
              </div>
            ) : teamProfiles.length === 0 ? (
              <EmptyState icon={Users} title="No team profiles yet." />
            ) : (
              <div className="divide-y divide-outline-variant/10">
                {teamProfiles.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-4 px-6 py-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-full overflow-hidden bg-surface-container-low border border-outline-variant/30 shrink-0">
                        {m.photo_url && (
                          <img src={m.photo_url} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[14px] text-primary-container">
                            {m.full_name}
                          </span>
                          <StatusBadge tone={m.is_published ? "success" : "neutral"}>
                            {m.is_published ? "published" : "draft"}
                          </StatusBadge>
                        </div>
                        <div className="text-[12px] text-on-surface-variant">{m.role_title}</div>
                      </div>
                    </div>
                    {canWrite && (
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => openEditTeam(m)}
                          className="p-1.5 border border-outline-variant/40 rounded-md bg-white text-on-surface-variant"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteTeam(m.id)}
                          className="p-1.5 border border-outline-variant/40 rounded-md bg-white text-on-surface-variant"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── FAQS ── */}
        <TabsContent value="faqs">
          <div className="flex justify-end mb-3">
            {canWrite && (
              <button
                onClick={openCreateFaq}
                className="flex items-center gap-1.5 px-4.5 py-2.5 bg-accent rounded-lg text-white font-bold text-[13px]"
              >
                <Plus size={14} /> Add FAQ
              </button>
            )}
          </div>
          <div className="luxury-card rounded-xl shadow-sm overflow-hidden bg-white">
            {loading ? (
              <div className="p-6 flex flex-col gap-3">
                <Skeleton className="h-16 rounded-lg" />
                <Skeleton className="h-16 rounded-lg" />
              </div>
            ) : faqs.length === 0 ? (
              <EmptyState icon={HelpCircle} title="No FAQs yet." />
            ) : (
              <div className="divide-y divide-outline-variant/10">
                {faqs.map((f) => (
                  <div key={f.id} className="flex items-start justify-between gap-4 px-6 py-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[14px] text-primary-container">
                          {f.question}
                        </span>
                        <StatusBadge tone="neutral">{f.category}</StatusBadge>
                        <StatusBadge tone={f.is_published ? "success" : "neutral"}>
                          {f.is_published ? "published" : "draft"}
                        </StatusBadge>
                      </div>
                      <p className="text-[13px] text-on-surface-variant mt-1.5 line-clamp-2">
                        {f.answer}
                      </p>
                    </div>
                    {canWrite && (
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => openEditFaq(f)}
                          className="p-1.5 border border-outline-variant/40 rounded-md bg-white text-on-surface-variant"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteFaq(f.id)}
                          className="p-1.5 border border-outline-variant/40 rounded-md bg-white text-on-surface-variant"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ══════ MODAL: CREATE / EDIT TESTIMONIAL ══════ */}
      {creatingTestimonial && (
        <div className="fixed inset-0 z-100 bg-primary-container/55 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-130 rounded-2xl p-9 shadow-2xl max-h-[88vh] overflow-y-auto relative">
            <button
              onClick={() => setCreatingTestimonial(false)}
              className="absolute top-5 right-5 text-on-surface-variant hover:text-on-surface"
            >
              <X size={20} />
            </button>
            <h3 className="font-headline-lg text-[22px] text-primary font-bold">
              {editingTestimonial ? "Edit Testimonial" : "Add Testimonial"}
            </h3>
            <form onSubmit={handleSaveTestimonial} className="mt-6 flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-on-surface-variant uppercase mb-1.5">
                    Client Name
                  </label>
                  <input
                    type="text"
                    required
                    value={tClientName}
                    onChange={(e) => setTClientName(e.target.value)}
                    className="w-full p-2.5 border border-outline-variant/40 rounded-lg text-[13px] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-on-surface-variant uppercase mb-1.5">
                    Initials
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={2}
                    value={tClientInitials}
                    onChange={(e) => setTClientInitials(e.target.value)}
                    className="w-full p-2.5 border border-outline-variant/40 rounded-lg text-[13px] outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-on-surface-variant uppercase mb-1.5">
                  Tag (location, phase, e.g. "Sagana, Phase 2 Owner")
                </label>
                <input
                  type="text"
                  value={tTag}
                  onChange={(e) => setTTag(e.target.value)}
                  className="w-full p-2.5 border border-outline-variant/40 rounded-lg text-[13px] outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-on-surface-variant uppercase mb-1.5">
                  Quote
                </label>
                <textarea
                  required
                  rows={4}
                  value={tQuote}
                  onChange={(e) => setTQuote(e.target.value)}
                  className="w-full p-2.5 border border-outline-variant/40 rounded-lg text-[13px] outline-none resize-y"
                />
              </div>
              <label className="flex items-center gap-2 text-[13px] text-on-surface">
                <input
                  type="checkbox"
                  checked={tIsPublished}
                  onChange={(e) => setTIsPublished(e.target.checked)}
                />
                Published (visible on the public site)
              </label>
              <div className="flex justify-end gap-2.5 pt-2.5 border-t border-outline-variant/30">
                <button
                  type="button"
                  onClick={() => setCreatingTestimonial(false)}
                  className="px-5 py-2.5 border border-outline-variant/40 rounded-lg bg-white text-on-surface font-semibold text-[13px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-accent rounded-lg text-white font-bold text-[13px]"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════ MODAL: CREATE / EDIT TEAM PROFILE ══════ */}
      {creatingTeam && (
        <div className="fixed inset-0 z-100 bg-primary-container/55 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-130 rounded-2xl p-9 shadow-2xl max-h-[88vh] overflow-y-auto relative">
            <button
              onClick={() => setCreatingTeam(false)}
              className="absolute top-5 right-5 text-on-surface-variant hover:text-on-surface"
            >
              <X size={20} />
            </button>
            <h3 className="font-headline-lg text-[22px] text-primary font-bold">
              {editingTeam ? "Edit Team Profile" : "Add Team Member"}
            </h3>
            <form onSubmit={handleSaveTeam} className="mt-6 flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-on-surface-variant uppercase mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={teamFullName}
                    onChange={(e) => setTeamFullName(e.target.value)}
                    className="w-full p-2.5 border border-outline-variant/40 rounded-lg text-[13px] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-on-surface-variant uppercase mb-1.5">
                    Role Title
                  </label>
                  <input
                    type="text"
                    required
                    value={teamRoleTitle}
                    onChange={(e) => setTeamRoleTitle(e.target.value)}
                    className="w-full p-2.5 border border-outline-variant/40 rounded-lg text-[13px] outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-on-surface-variant uppercase mb-1.5">
                  Photo URL
                </label>
                <input
                  type="url"
                  value={teamPhotoUrl}
                  onChange={(e) => setTeamPhotoUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full p-2.5 border border-outline-variant/40 rounded-lg text-[13px] outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-on-surface-variant uppercase mb-1.5">
                  Bio
                </label>
                <textarea
                  rows={3}
                  value={teamBio}
                  onChange={(e) => setTeamBio(e.target.value)}
                  className="w-full p-2.5 border border-outline-variant/40 rounded-lg text-[13px] outline-none resize-y"
                />
              </div>
              <label className="flex items-center gap-2 text-[13px] text-on-surface">
                <input
                  type="checkbox"
                  checked={teamIsPublished}
                  onChange={(e) => setTeamIsPublished(e.target.checked)}
                />
                Published (visible on the public site)
              </label>
              <div className="flex justify-end gap-2.5 pt-2.5 border-t border-outline-variant/30">
                <button
                  type="button"
                  onClick={() => setCreatingTeam(false)}
                  className="px-5 py-2.5 border border-outline-variant/40 rounded-lg bg-white text-on-surface font-semibold text-[13px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-accent rounded-lg text-white font-bold text-[13px]"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════ MODAL: CREATE / EDIT FAQ ══════ */}
      {creatingFaq && (
        <div className="fixed inset-0 z-100 bg-primary-container/55 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-130 rounded-2xl p-9 shadow-2xl max-h-[88vh] overflow-y-auto relative">
            <button
              onClick={() => setCreatingFaq(false)}
              className="absolute top-5 right-5 text-on-surface-variant hover:text-on-surface"
            >
              <X size={20} />
            </button>
            <h3 className="font-headline-lg text-[22px] text-primary font-bold">
              {editingFaq ? "Edit FAQ" : "Add FAQ"}
            </h3>
            <form onSubmit={handleSaveFaq} className="mt-6 flex flex-col gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-on-surface-variant uppercase mb-1.5">
                  Category
                </label>
                <select
                  value={faqCategory}
                  onChange={(e: any) => setFaqCategory(e.target.value)}
                  className="w-full p-2.5 border border-outline-variant/40 rounded-lg text-[13px] bg-white outline-none"
                >
                  <option value="general">General</option>
                  <option value="diaspora">Diaspora</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-on-surface-variant uppercase mb-1.5">
                  Question
                </label>
                <input
                  type="text"
                  required
                  value={faqQuestion}
                  onChange={(e) => setFaqQuestion(e.target.value)}
                  className="w-full p-2.5 border border-outline-variant/40 rounded-lg text-[13px] outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-on-surface-variant uppercase mb-1.5">
                  Answer
                </label>
                <textarea
                  required
                  rows={4}
                  value={faqAnswer}
                  onChange={(e) => setFaqAnswer(e.target.value)}
                  className="w-full p-2.5 border border-outline-variant/40 rounded-lg text-[13px] outline-none resize-y"
                />
              </div>
              <label className="flex items-center gap-2 text-[13px] text-on-surface">
                <input
                  type="checkbox"
                  checked={faqIsPublished}
                  onChange={(e) => setFaqIsPublished(e.target.checked)}
                />
                Published (visible on the public site)
              </label>
              <div className="flex justify-end gap-2.5 pt-2.5 border-t border-outline-variant/30">
                <button
                  type="button"
                  onClick={() => setCreatingFaq(false)}
                  className="px-5 py-2.5 border border-outline-variant/40 rounded-lg bg-white text-on-surface font-semibold text-[13px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-accent rounded-lg text-white font-bold text-[13px]"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
