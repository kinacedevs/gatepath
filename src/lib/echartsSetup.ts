/**
 * Gatepath Realtors — ECharts modular registration
 *
 * `echarts-for-react`'s default export (`import ReactECharts from
 * "echarts-for-react"`) pulls in the ENTIRE `echarts` package — every chart
 * type, every renderer — regardless of which chart you actually render.
 * Confirmed the hard way: with just Gauge + Funnel wired into one route,
 * that route's client bundle came out at 1.6MB (vs 5-450KB for every other
 * admin route). This file registers only the pieces the admin console
 * actually uses via `echarts/core`, imported once here — every chart
 * component uses `echarts-for-react/lib/core` + this `echarts` instance
 * instead of the default full-bundle import. Add a chart type/component
 * here (and nowhere else) the moment a new one is actually needed.
 */
import * as echarts from "echarts/core";
import { GaugeChart, FunnelChart } from "echarts/charts";
import { TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([GaugeChart, FunnelChart, TooltipComponent, CanvasRenderer]);

export { echarts };
