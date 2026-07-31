import ReactEChartsCore from "echarts-for-react/lib/core";
import type { EChartsOption } from "echarts-for-react";
import { echarts } from "@/lib/echartsSetup";
import { getChartPalette, getChartTheme } from "@/lib/chartTheme";

/**
 * Stage-funnel showpiece (VIZ_BLUEPRINT Appendix C: "Lead funnel snapshot
 * (funnel · ECharts)"). Same CSS-custom-property theming approach as
 * Gauge.tsx — never a hardcoded hex.
 */
export function FunnelChart({
  data,
  height = 240,
}: {
  data: { name: string; value: number }[];
  height?: number;
}) {
  const theme = getChartTheme();
  const palette = getChartPalette();

  const option: EChartsOption = {
    tooltip: { trigger: "item", formatter: "{b}: {c}" },
    series: [
      {
        type: "funnel",
        left: "6%",
        right: "6%",
        top: 10,
        bottom: 10,
        width: "88%",
        minSize: "20%",
        maxSize: "100%",
        sort: "descending",
        gap: 3,
        label: {
          show: true,
          position: "inside",
          formatter: "{b}\n{c}",
          fontFamily: "Inter, sans-serif",
          fontSize: 12,
          color: "#fff",
          fontWeight: 600,
        },
        itemStyle: {
          borderColor: theme.grid,
          borderWidth: 0,
        },
        data: data.map((d, i) => ({
          name: d.name,
          value: d.value,
          itemStyle: { color: palette[i % palette.length] },
        })),
      },
    ],
  };

  return (
    <ReactEChartsCore
      echarts={echarts}
      option={option}
      style={{ height, width: "100%" }}
      notMerge
    />
  );
}
