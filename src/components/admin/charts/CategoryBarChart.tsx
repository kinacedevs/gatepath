import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { getChartTheme, getChartPalette } from "@/lib/chartTheme";

/** Category comparison chart (VIZ_BLUEPRINT Appendix B: "Comparison across categories → bar"). */
export function CategoryBarChart({
  data,
  xKey,
  yKey,
  height = 220,
  color,
  horizontal = false,
  valueFormatter,
}: {
  data: Record<string, unknown>[];
  xKey: string;
  yKey: string;
  height?: number;
  /** Single color for every bar. Omit to cycle the brand palette per bar. */
  color?: string;
  horizontal?: boolean;
  valueFormatter?: (value: number) => string;
}) {
  const theme = getChartTheme();
  const palette = getChartPalette();

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout={horizontal ? "vertical" : "horizontal"}
        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={theme.grid}
          vertical={horizontal}
          horizontal={!horizontal}
        />
        {horizontal ? (
          <>
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: theme.text, fontFamily: "Inter, sans-serif" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={valueFormatter}
            />
            <YAxis
              type="category"
              dataKey={xKey}
              tick={{ fontSize: 11, fill: theme.text, fontFamily: "Inter, sans-serif" }}
              axisLine={false}
              tickLine={false}
              width={90}
            />
          </>
        ) : (
          <>
            <XAxis
              dataKey={xKey}
              tick={{ fontSize: 11, fill: theme.text, fontFamily: "Inter, sans-serif" }}
              axisLine={{ stroke: theme.grid }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: theme.text, fontFamily: "Inter, sans-serif" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={valueFormatter}
            />
          </>
        )}
        <Tooltip
          cursor={{ fill: theme.grid, opacity: 0.3 }}
          formatter={(value: number) => (valueFormatter ? valueFormatter(value) : value)}
          contentStyle={{
            fontFamily: "Inter, sans-serif",
            fontSize: 12,
            borderRadius: 8,
            border: `1px solid ${theme.grid}`,
          }}
        />
        <Bar dataKey={yKey} radius={[4, 4, 4, 4]} fill={color ?? theme.primary}>
          {!color && data.map((_, i) => <Cell key={i} fill={palette[i % palette.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
