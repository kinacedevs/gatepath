import ReactEChartsCore from "echarts-for-react/lib/core";
import type { EChartsOption } from "echarts-for-react";
import { echarts } from "@/lib/echartsSetup";

/**
 * Collection-rate style gauge (Appendix G: "Apache ECharts — showpiece viz:
 * collection-rate gauge, density/heatmap, rich theming"). Colors are read
 * from the same CSS custom properties every other admin component uses —
 * no hex literals — so it always matches whatever the brand tokens resolve
 * to at render time.
 */
export function Gauge({
  value,
  label,
  height = 220,
}: {
  /** 0-100 */
  value: number;
  label: string;
  height?: number;
}) {
  const style = typeof window !== "undefined" ? getComputedStyle(document.documentElement) : null;
  const cerulean = style?.getPropertyValue("--primary").trim() || "#0B7FC7";
  const gold = style?.getPropertyValue("--accent").trim() || "#E8A020";
  const track = style?.getPropertyValue("--border").trim() || "#DCE4EC";
  const ink = style?.getPropertyValue("--foreground").trim() || "#1C1C1C";

  const option: EChartsOption = {
    series: [
      {
        type: "gauge",
        startAngle: 210,
        endAngle: -30,
        min: 0,
        max: 100,
        radius: "90%",
        axisLine: {
          lineStyle: {
            width: 14,
            color: [
              [value / 100, gold],
              [1, track],
            ],
          },
        },
        pointer: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        progress: { show: false },
        detail: {
          valueAnimation: true,
          formatter: "{value}%",
          color: ink,
          fontFamily: "Montserrat, sans-serif",
          fontWeight: 700,
          fontSize: 28,
          offsetCenter: [0, "0%"],
        },
        title: {
          fontFamily: "Inter, sans-serif",
          fontSize: 12,
          color: ink,
          offsetCenter: [0, "38%"],
        },
        data: [{ value: Math.round(value), name: label }],
        anchor: { show: false },
        emphasis: { disabled: true },
      },
    ],
    color: [cerulean],
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
