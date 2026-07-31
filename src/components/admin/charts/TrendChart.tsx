import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getChartTheme } from "@/lib/chartTheme";

/** Trend-over-time chart (VIZ_BLUEPRINT Appendix B: "Trend over time → line/area"). */
export function TrendChart({
  data,
  xKey,
  yKey,
  height = 220,
  color,
  valueFormatter,
}: {
  data: Record<string, unknown>[];
  xKey: string;
  yKey: string;
  height?: number;
  color?: string;
  valueFormatter?: (value: number) => string;
}) {
  const theme = getChartTheme();
  const stroke = color ?? theme.primary;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={stroke} stopOpacity={0.25} />
            <stop offset="95%" stopColor={stroke} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
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
          width={valueFormatter ? 56 : 32}
        />
        <Tooltip
          formatter={(value: number) => (valueFormatter ? valueFormatter(value) : value)}
          contentStyle={{
            fontFamily: "Inter, sans-serif",
            fontSize: 12,
            borderRadius: 8,
            border: `1px solid ${theme.grid}`,
          }}
        />
        <Area
          type="monotone"
          dataKey={yKey}
          stroke={stroke}
          fill="url(#trendFill)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
