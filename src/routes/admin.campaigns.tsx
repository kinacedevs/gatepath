/**
 * Gatepath Realtors — Campaigns & Marketing (Phase 5A mechanical split)
 * Relocated verbatim from the old "campaigns" tab (admin.tsx, previously
 * ~2495-2602), including the embedded Global Media Manager (phase hero
 * image / diaspora banner / thumbnail / brochure URL editor). Same JSX,
 * same inline styles, same NAVY hex — copied as-is, not redesigned. The one
 * real change: this tab's own scoped fetch (phases + affiliates) replaces
 * the old shared 9-table Promise.all.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Megaphone, Check, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Phase, Affiliate } from "@/lib/types";

export const Route = createFileRoute("/admin/campaigns")({
  component: CampaignsAndMarketing,
});

const NAVY = "#0C1A30";
const GOLD_DARK = "var(--accent-dark)";
const CANVAS = "var(--stone)";
const CARD_BORDER = "#E5E0D8";

function CampaignsAndMarketing() {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Media Manager States
  const [mediaEditingPhaseId, setMediaEditingPhaseId] = useState("");
  const [mediaHeroImage, setMediaHeroImage] = useState("");
  const [mediaDiasporaImage, setMediaDiasporaImage] = useState("");
  const [mediaThumbnail, setMediaThumbnail] = useState("");
  const [mediaBrochure, setMediaBrochure] = useState("");
  const [mediaPlotMap, setMediaPlotMap] = useState("");
  const [mediaSaveLoading, setMediaSaveLoading] = useState(false);
  const [mediaSaveMsg, setMediaSaveMsg] = useState<string | null>(null);

  const loadData = async () => {
    setDataLoading(true);
    try {
      const [phasesRes, affiliatesRes] = await Promise.all([
        supabase.from("phases").select("*").order("name"),
        supabase.from("affiliates").select("*").order("created_at", { ascending: false }),
      ]);

      setPhases((phasesRes.data as Phase[]) ?? []);
      setAffiliates((affiliatesRes.data as Affiliate[]) ?? []);
    } catch (err) {
      console.error("Error loading campaigns data:", err);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveMediaUrls = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaEditingPhaseId) return;
    setMediaSaveLoading(true);
    setMediaSaveMsg(null);

    const { error } = await ((supabase as any)
      .from("phases")
      .update({
        hero_image_urls: mediaHeroImage.trim() ? [mediaHeroImage.trim()] : null,
        diaspora_image_url: mediaDiasporaImage.trim() || null,
        image_url: mediaThumbnail.trim() || null,
        brochure_url: mediaBrochure.trim() || null,
        plot_map_url: mediaPlotMap.trim() || null,
      })
      .eq("id", mediaEditingPhaseId));

    if (error) {
      setMediaSaveMsg("Error saving media URLs: " + error.message);
    } else {
      setMediaSaveMsg("Media URLs saved successfully!");
      loadData();
    }
    setMediaSaveLoading(false);
  };

  void dataLoading;

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 24, color: NAVY, margin: 0 }}>Campaigns & Marketing</h1>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280", marginTop: 4 }}>
          Manage Affiliate Partners and Global Brand Media (Posters, Heroes, Locations).
        </p>
      </div>

      {/* MEDIA MANAGER */}
      <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${CARD_BORDER}`, padding: 32, boxShadow: "0 2px 12px rgba(12,26,48,0.05)", marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: CANVAS, display: "flex", alignItems: "center", justifyContent: "center", color: GOLD_DARK }}>
            <Megaphone size={20} />
          </div>
          <div>
            <h2 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 18, color: NAVY, margin: 0 }}>Global Media Manager</h2>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280", margin: 0 }}>Update posters, hero sections, and project photos.</p>
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: NAVY, display: "block", marginBottom: 8, textTransform: "uppercase" }}>Select Phase to Update Media</label>
          <select
            value={mediaEditingPhaseId}
            onChange={(e) => {
              const id = e.target.value;
              setMediaEditingPhaseId(id);
              const p = phases.find(ph => ph.id === id);
              if (p) {
                setMediaHeroImage(p.hero_image_urls?.[0] || "");
                setMediaDiasporaImage(p.diaspora_image_url || "");
                setMediaBrochure(p.brochure_url || "");
                setMediaPlotMap(p.plot_map_url || "");
                setMediaThumbnail(p.image_url || "");
              }
            }}
            style={{ width: "100%", padding: "12px 16px", borderRadius: 8, border: `1px solid ${CARD_BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 14, outline: "none" }}
          >
            <option value="">-- Select a Project Phase --</option>
            {phases.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {mediaEditingPhaseId && (
          <form onSubmit={handleSaveMediaUrls} style={{ background: CANVAS, borderRadius: 12, padding: 24 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: "#6B7280", display: "block", marginBottom: 6, textTransform: "uppercase" }}>Hero Section Image URL (Main Poster)</label>
                <input type="url" value={mediaHeroImage} onChange={(e) => setMediaHeroImage(e.target.value)} placeholder="https://..." style={{ width: "100%", padding: 10, borderRadius: 6, border: `1px solid ${CARD_BORDER}`, fontSize: 13, fontFamily: "Inter, sans-serif" }} />
              </div>
              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: "#6B7280", display: "block", marginBottom: 6, textTransform: "uppercase" }}>Diaspora Hub Banner URL</label>
                <input type="url" value={mediaDiasporaImage} onChange={(e) => setMediaDiasporaImage(e.target.value)} placeholder="https://..." style={{ width: "100%", padding: 10, borderRadius: 6, border: `1px solid ${CARD_BORDER}`, fontSize: 13, fontFamily: "Inter, sans-serif" }} />
              </div>
              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: "#6B7280", display: "block", marginBottom: 6, textTransform: "uppercase" }}>Project Thumbnail (Card Image)</label>
                <input type="url" value={mediaThumbnail} onChange={(e) => setMediaThumbnail(e.target.value)} placeholder="https://..." style={{ width: "100%", padding: 10, borderRadius: 6, border: `1px solid ${CARD_BORDER}`, fontSize: 13, fontFamily: "Inter, sans-serif" }} />
              </div>
              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: "#6B7280", display: "block", marginBottom: 6, textTransform: "uppercase" }}>Brochure PDF URL</label>
                <input type="url" value={mediaBrochure} onChange={(e) => setMediaBrochure(e.target.value)} placeholder="https://..." style={{ width: "100%", padding: 10, borderRadius: 6, border: `1px solid ${CARD_BORDER}`, fontSize: 13, fontFamily: "Inter, sans-serif" }} />
              </div>
            </div>
            {mediaSaveMsg && (
              <div style={{ marginTop: 16, padding: "10px 14px", background: mediaSaveMsg.includes("Error") ? "#FEE2E2" : "#D1FAE5", border: `1px solid ${mediaSaveMsg.includes("Error") ? "#FECACA" : "#A7F3D0"}`, borderRadius: 8, color: mediaSaveMsg.includes("Error") ? "#DC2626" : "#059669", fontFamily: "Inter, sans-serif", fontSize: 13 }}>
                {mediaSaveMsg}
              </div>
            )}
            <button type="submit" disabled={mediaSaveLoading} style={{ marginTop: 20, padding: "12px 24px", background: NAVY, color: "#fff", borderRadius: 8, border: "none", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
              {mediaSaveLoading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save Media URLs
            </button>
          </form>
        )}
      </div>

      {/* AFFILIATES TABLE */}
      <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${CARD_BORDER}`, boxShadow: "0 2px 12px rgba(12,26,48,0.05)", overflow: "hidden" }}>
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${CARD_BORDER}` }}>
          <h3 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 16, color: NAVY, margin: 0 }}>Affiliate Partners</h3>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead style={{ background: CANVAS, borderBottom: `1px solid ${CARD_BORDER}` }}>
            <tr>
              <th style={{ padding: "16px 24px", fontFamily: "Montserrat, sans-serif", fontSize: 12, fontWeight: 700, color: NAVY, textTransform: "uppercase" }}>Partner Name</th>
              <th style={{ padding: "16px 24px", fontFamily: "Montserrat, sans-serif", fontSize: 12, fontWeight: 700, color: NAVY, textTransform: "uppercase" }}>Contact</th>
              <th style={{ padding: "16px 24px", fontFamily: "Montserrat, sans-serif", fontSize: 12, fontWeight: 700, color: NAVY, textTransform: "uppercase" }}>Referral Code</th>
              <th style={{ padding: "16px 24px", fontFamily: "Montserrat, sans-serif", fontSize: 12, fontWeight: 700, color: NAVY, textTransform: "uppercase" }}>Commission</th>
            </tr>
          </thead>
          <tbody>
            {affiliates.length === 0 ? (
              <tr><td colSpan={4} style={{ padding: 32, textAlign: "center", color: "#6B7280", fontFamily: "Inter, sans-serif" }}>No affiliates registered yet.</td></tr>
            ) : affiliates.map((aff) => (
              <tr key={aff.id} style={{ borderBottom: "1px solid " + CARD_BORDER }}>
                <td style={{ padding: "16px 24px", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14, color: NAVY }}>{aff.partner_name}</td>
                <td style={{ padding: "16px 24px", fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280" }}>{aff.phone}<br/>{aff.email}</td>
                <td style={{ padding: "16px 24px" }}><span style={{ background: CANVAS, padding: "4px 8px", borderRadius: 6, fontFamily: "monospace", fontSize: 13, color: NAVY, border: `1px dashed var(--accent)` }}>{aff.referral_code}</span></td>
                <td style={{ padding: "16px 24px", fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, color: "#059669" }}>{aff.commission_rate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
