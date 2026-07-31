import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { getChartTheme, getChartPalette } from "@/lib/chartTheme";

/** Part-to-whole chart, used sparingly (VIZ_BLUEPRINT Appendix B: "Part-to-whole → donut"). */
export function SplitDonutChart({
  data,
  height = 220,
}: {
  data: { name: string; value: number; color?: string }[];
  height?: number;
}) {
  const theme = getChartTheme();
  const palette = getChartPalette();

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius="60%"
          outerRadius="85%"
          paddingAngle={2}
          strokeWidth={0}
        >
          {data.map((entry, i) => (
            <Cell key={entry.name} fill={entry.color ?? palette[i % palette.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            fontFamily: "Inter, sans-serif",
            fontSize: 12,
            borderRadius: 8,
            border: `1px solid ${theme.grid}`,
          }}
        />
        <Legend
          verticalAlign="bottom"
          height={28}
          wrapperStyle={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: theme.text }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
