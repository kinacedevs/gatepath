import React from "react";
import type { Plot } from "@/lib/types";

interface BarakaPlainsMapProps {
  plots: Plot[];
  selectedPlotId: string | null;
  onSelectPlot: (plot: Plot) => void;
}

export function BarakaPlainsMap({ plots, selectedPlotId, onSelectPlot }: BarakaPlainsMapProps) {
  // Map plot_number to status & plot object
  const plotMap = new Map<number, Plot>();
  plots.forEach((p) => plotMap.set(p.plot_number, p));

  // Defined positions matching the physical survey map for Baraka Plains Phase 6 (18 plots)
  const plotLayout = [
    // Top Row: Plots 12 - 16 (0.05 Ha / 50x100)
    { num: 12, x: 40, y: 40, width: 90, height: 110, ha: "0.05 Ha" },
    { num: 13, x: 140, y: 40, width: 90, height: 110, ha: "0.05 Ha" },
    { num: 14, x: 240, y: 40, width: 90, height: 110, ha: "0.05 Ha" },
    { num: 15, x: 340, y: 40, width: 90, height: 110, ha: "0.05 Ha" },
    { num: 16, x: 440, y: 40, width: 90, height: 110, ha: "0.05 Ha" },

    // Middle Row: Plots 8, 9, 10, 11, 2
    { num: 8, x: 40, y: 210, width: 90, height: 110, ha: "0.04 Ha" },
    { num: 9, x: 140, y: 210, width: 90, height: 110, ha: "0.04 Ha" },
    { num: 10, x: 240, y: 210, width: 90, height: 110, ha: "0.04 Ha" },
    { num: 11, x: 340, y: 210, width: 90, height: 110, ha: "0.04 Ha" },
    { num: 2, x: 440, y: 210, width: 90, height: 110, ha: "0.04 Ha" },

    // Bottom Row: Plots 7, 6, 5, 4, 3, 1
    { num: 7, x: 40, y: 380, width: 70, height: 110, ha: "0.04 Ha" },
    { num: 6, x: 120, y: 380, width: 70, height: 110, ha: "0.04 Ha" },
    { num: 5, x: 200, y: 380, width: 70, height: 110, ha: "0.04 Ha" },
    { num: 4, x: 280, y: 380, width: 70, height: 110, ha: "0.04 Ha" },
    { num: 3, x: 360, y: 380, width: 70, height: 110, ha: "0.04 Ha" },
    { num: 1, x: 440, y: 380, width: 70, height: 110, ha: "0.04 Ha" },

    // Commercial Plots: 17, 18
    { num: 17, x: 550, y: 40, width: 110, height: 110, ha: "Commercial" },
    { num: 18, x: 550, y: 210, width: 110, height: 110, ha: "Commercial" },
  ];

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "available":
        return { fill: "#DCFCE7", stroke: "var(--available)", text: "#15803D" };
      case "booked":
        return { fill: "#FEF3C7", stroke: "#F59E0B", text: "#B45309" };
      case "sold":
        return { fill: "#FEE2E2", stroke: "var(--destructive)", text: "#B91C1C" };
      default:
        return { fill: "#E2E8F0", stroke: "#94A3B8", text: "#475569" };
    }
  };

  return (
    <div className="w-full bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
      {/* Header & Map Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h3 className="font-headline-md text-lg text-primary-deep font-bold">Baraka Plains Phase 6 — Masterplan Map</h3>
          <p className="text-xs text-slate-500">Matuu, Machakos County • Exact Physical Survey Replica</p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-semibold">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-available"></span> Available</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#F59E0B]"></span> Booked</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-destructive"></span> Sold</span>
        </div>
      </div>

      {/* SVG Container */}
      <div className="overflow-x-auto">
        <svg viewBox="0 0 700 520" className="w-full min-w-[650px] h-auto font-sans select-none">
          {/* Background Grid Accent */}
          <rect width="700" height="520" fill="#F8FAFC" rx="12" />

          {/* 9m Internal Access Road 1 */}
          <rect x="30" y="160" width="510" height="40" fill="#CBD5E1" rx="4" />
          <text x="260" y="184" fill="#475569" fontSize="11" fontWeight="700" letterSpacing="0.1em">
            INTERNAL ACCESS ROAD (9M WIDE)
          </text>

          {/* 9m Internal Access Road 2 */}
          <rect x="30" y="330" width="510" height="40" fill="#CBD5E1" rx="4" />
          <text x="260" y="354" fill="#475569" fontSize="11" fontWeight="700" letterSpacing="0.1em">
            ACCESS ROAD (9M WIDE)
          </text>

          {/* Diagonal Main Road */}
          <polygon points="530,0 700,120 700,520 660,520 490,0" fill="#94A3B8" opacity="0.4" />
          <text x="580" y="320" fill="#334155" fontSize="11" fontWeight="700" transform="rotate(45 580 320)">
            MAIN THIKA - GARISSA HIGHWAY (EXISTING)
          </text>

          {/* Plots Render Loop */}
          {plotLayout.map((layout) => {
            const plotObj = plotMap.get(layout.num);
            const colors = getStatusColor(plotObj?.status);
            const isSelected = selectedPlotId === plotObj?.id;

            return (
              <g
                key={layout.num}
                onClick={() => plotObj && onSelectPlot(plotObj)}
                className={`cursor-pointer transition-all duration-200 ${
                  plotObj?.status === "available" ? "hover:opacity-90 hover:scale-[1.02]" : ""
                }`}
                style={{ transformOrigin: `${layout.x + layout.width / 2}px ${layout.y + layout.height / 2}px` }}
              >
                <rect
                  x={layout.x}
                  y={layout.y}
                  width={layout.width}
                  height={layout.height}
                  fill={colors.fill}
                  stroke={isSelected ? "var(--accent)" : colors.stroke}
                  strokeWidth={isSelected ? "4" : "2"}
                  rx="6"
                />

                {/* Plot Title */}
                <text
                  x={layout.x + layout.width / 2}
                  y={layout.y + 35}
                  textAnchor="middle"
                  fill={colors.text}
                  fontSize="10"
                  fontWeight="800"
                >
                  PLOT
                </text>

                <text
                  x={layout.x + layout.width / 2}
                  y={layout.y + 60}
                  textAnchor="middle"
                  fill={colors.text}
                  fontSize="22"
                  fontWeight="900"
                  fontFamily="Montserrat, sans-serif"
                >
                  #{layout.num}
                </text>

                {/* Size / Status badge */}
                <text
                  x={layout.x + layout.width / 2}
                  y={layout.y + 85}
                  textAnchor="middle"
                  fill={colors.text}
                  fontSize="9"
                  fontWeight="700"
                  className="uppercase tracking-wider"
                >
                  {plotObj?.status || layout.ha}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
        <span>* Survey beacons verified by Ministry of Lands</span>
        <span>Click any available plot unit to inspect pricing & payment terms</span>
      </div>
    </div>
  );
}
