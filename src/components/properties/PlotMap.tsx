import { useState, useRef } from "react";
import type { Plot } from "@/lib/phases";

const PLOT_W = 80;
const PLOT_H = 100;
const GAP = 6;
const LEFT_PAD = 40;
const TOP_PAD = 40;
const ROAD_GAP = 28; // internal road between row 2 and 3
const RIGHT_PAD = 50;
const BOTTOM_PAD = 50;

const COLORS = {
  available: { fill: "#22C55E", stroke: "#16A34A" },
  booked: { fill: "#F59E0B", stroke: "#D97706" },
  sold: { fill: "#EF4444", stroke: "#DC2626" },
};

function darken(hex: string, amt = 0.15) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.round(((n >> 16) & 255) * (1 - amt)));
  const g = Math.max(0, Math.round(((n >> 8) & 255) * (1 - amt)));
  const b = Math.max(0, Math.round((n & 255) * (1 - amt)));
  return `rgb(${r},${g},${b})`;
}

export function PlotMap({
  plots,
  selectedId,
  onSelect,
  showAvailableOnly,
}: {
  plots: Plot[];
  selectedId: number | null;
  onSelect: (p: Plot) => void;
  showAvailableOnly: boolean;
}) {
  const [hovered, setHovered] = useState<{ plot: Plot; x: number; y: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const cols = Math.max(...plots.map((p) => p.col));
  const rows = Math.max(...plots.map((p) => p.row));
  const width = LEFT_PAD + cols * PLOT_W + (cols - 1) * GAP + RIGHT_PAD;
  const height = TOP_PAD + rows * PLOT_H + (rows - 1) * GAP + ROAD_GAP + BOTTOM_PAD;

  const yFor = (row: number) =>
    TOP_PAD + (row - 1) * (PLOT_H + GAP) + (row >= 3 ? ROAD_GAP : 0);
  const xFor = (col: number) => LEFT_PAD + (col - 1) * (PLOT_W + GAP);

  return (
    <div ref={wrapRef} className="relative w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        role="img"
        aria-label="Phase plot map"
      >
        {/* Background */}
        <rect width={width} height={height} fill="#F8F4EE" rx="8" />

        {/* Compass rose top-right */}
        <g transform={`translate(${width - 35}, 28)`} stroke="#5A5A5A" strokeWidth="1" fill="none">
          <line x1="0" y1="-12" x2="0" y2="12" />
          <line x1="-12" y1="0" x2="12" y2="0" />
          <text x="0" y="-15" textAnchor="middle" fontSize="9" fill="#0B7FC7" fontFamily="Montserrat" fontWeight="600" stroke="none">N</text>
          <text x="0" y="22" textAnchor="middle" fontSize="8" fill="#5A5A5A" fontFamily="Montserrat" stroke="none">S</text>
          <text x="-18" y="3" textAnchor="middle" fontSize="8" fill="#5A5A5A" fontFamily="Montserrat" stroke="none">W</text>
          <text x="18" y="3" textAnchor="middle" fontSize="8" fill="#5A5A5A" fontFamily="Montserrat" stroke="none">E</text>
        </g>

        {/* Access road label (left, rotated) */}
        <text
          x={12}
          y={height / 2}
          transform={`rotate(-90, 12, ${height / 2})`}
          textAnchor="middle"
          fontSize="10"
          fontFamily="Montserrat"
          fontWeight="500"
          fill="#5A5A5A"
          letterSpacing="2"
        >
          ACCESS ROAD
        </text>

        {/* Internal road label (between row 2 and 3) */}
        {rows >= 3 && (
          <>
            <rect
              x={LEFT_PAD - 4}
              y={TOP_PAD + 2 * (PLOT_H + GAP) - GAP}
              width={cols * (PLOT_W + GAP) - GAP + 8}
              height={ROAD_GAP}
              fill="#E5E0D8"
              rx="2"
            />
            <text
              x={LEFT_PAD + (cols * (PLOT_W + GAP)) / 2}
              y={TOP_PAD + 2 * (PLOT_H + GAP) - GAP + ROAD_GAP / 2 + 3}
              textAnchor="middle"
              fontSize="10"
              fontFamily="Montserrat"
              fontWeight="500"
              fill="#5A5A5A"
              letterSpacing="2"
            >
              INTERNAL ROAD
            </text>
          </>
        )}

        {/* Main tarmac road bottom */}
        <rect
          x={LEFT_PAD - 4}
          y={height - BOTTOM_PAD + 8}
          width={cols * (PLOT_W + GAP) - GAP + 8}
          height={18}
          fill="#3A3A3A"
          rx="2"
        />
        <text
          x={LEFT_PAD + (cols * (PLOT_W + GAP)) / 2}
          y={height - BOTTOM_PAD + 21}
          textAnchor="middle"
          fontSize="10"
          fontFamily="Montserrat"
          fontWeight="500"
          fill="#F8F4EE"
          letterSpacing="2"
        >
          MAIN TARMAC ROAD
        </text>

        {/* Plots */}
        {plots.map((p) => {
          const c = COLORS[p.status];
          const x = xFor(p.col);
          const y = yFor(p.row);
          const isSelected = selectedId === p.id;
          const isHovered = hovered?.plot.id === p.id;
          const dimmed = showAvailableOnly && p.status !== "available";
          const fill =
            isHovered && p.status === "available" ? darken(c.fill, 0.15) : c.fill;
          return (
            <g
              key={p.id}
              opacity={dimmed ? 0.25 : 1}
              style={{
                cursor: p.status === "available" ? "pointer" : "not-allowed",
                transformOrigin: `${x + PLOT_W / 2}px ${y + PLOT_H / 2}px`,
                transform: isHovered && p.status === "available" ? "scale(1.03)" : "scale(1)",
                transition: "transform 0.2s ease",
              }}
              onMouseEnter={(e) => {
                const rect = wrapRef.current?.getBoundingClientRect();
                if (!rect) return;
                setHovered({
                  plot: p,
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top,
                });
              }}
              onMouseMove={(e) => {
                const rect = wrapRef.current?.getBoundingClientRect();
                if (!rect) return;
                setHovered({
                  plot: p,
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top,
                });
              }}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onSelect(p)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(p);
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={`Plot ${p.id}, ${p.status}, Ksh ${p.price.toLocaleString()}`}
            >
              <rect
                x={x}
                y={y}
                width={PLOT_W}
                height={PLOT_H}
                fill={fill}
                stroke={isSelected ? "#0B7FC7" : c.stroke}
                strokeWidth={isSelected ? 3 : 1.5}
                rx="3"
                style={
                  isSelected
                    ? { filter: "drop-shadow(0 0 8px rgba(11,127,199,0.4))" }
                    : undefined
                }
              />
              <text
                x={x + PLOT_W / 2}
                y={y + PLOT_H / 2 + 4}
                textAnchor="middle"
                fontSize="13"
                fontFamily="Montserrat"
                fontWeight="700"
                fill="white"
                pointerEvents="none"
              >
                #{p.id}
              </text>
              {p.status === "sold" && (
                <line
                  x1={x + 6}
                  y1={y + PLOT_H - 6}
                  x2={x + PLOT_W - 6}
                  y2={y + 6}
                  stroke="white"
                  strokeWidth="2"
                  pointerEvents="none"
                />
              )}
              {p.status === "booked" && (
                <text
                  x={x + PLOT_W - 8}
                  y={y + 14}
                  textAnchor="end"
                  fontSize="11"
                  pointerEvents="none"
                >
                  🔒
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute z-10 bg-primary text-white text-[12px] font-medium px-3 py-1.5 rounded-md shadow-lg whitespace-nowrap"
          style={{
            left: hovered.x + 14,
            top: hovered.y + 14,
            fontFamily: "Inter",
          }}
        >
          {hovered.plot.status === "available"
            ? `Plot #${hovered.plot.id} — Ksh ${hovered.plot.price.toLocaleString()}`
            : `Plot #${hovered.plot.id} — ${hovered.plot.status}`}
        </div>
      )}
    </div>
  );
}
