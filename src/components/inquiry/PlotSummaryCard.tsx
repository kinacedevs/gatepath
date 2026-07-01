import { MapPin } from "lucide-react";
import { useInquiry } from "@/context/InquiryContext";

export function PlotSummaryCard() {
  const { form } = useInquiry();
  return (
    <div
      className="hidden lg:block rounded-lg p-5"
      style={{
        background: "rgba(255,255,255,0.1)",
        border: "1px solid rgba(255,255,255,0.2)",
      }}
    >
      <div
        style={{
          fontFamily: "Montserrat, sans-serif",
          fontWeight: 500,
          fontSize: 11,
          color: "#E8A020",
          letterSpacing: "0.15em",
        }}
      >
        YOUR SELECTED PLOT
      </div>
      <div
        className="mt-2"
        style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 15, color: "#FFFFFF" }}
      >
        {form.phaseNumber ? `Phase ${form.phaseNumber} — ${form.phaseName}` : form.phaseName || "—"}
      </div>
      <div
        className="mt-1"
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontWeight: 600,
          fontSize: 24,
          color: "#FFFFFF",
        }}
      >
        Plot #{form.plotNumber || "—"}
      </div>
      <div
        className="mt-1"
        style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "rgba(255,255,255,0.7)" }}
      >
        {form.plotSize}
      </div>
      <div
        className="mt-2"
        style={{
          fontFamily: "Montserrat, sans-serif",
          fontWeight: 700,
          fontSize: 22,
          color: "#E8A020",
        }}
      >
        Ksh {form.plotPrice.toLocaleString()}
      </div>
      <div
        className="mt-1 flex items-center gap-1.5"
        style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "rgba(255,255,255,0.65)" }}
      >
        <MapPin size={13} /> {form.plotLocation}
      </div>
    </div>
  );
}
