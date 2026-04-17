/**
 * ChartRenderer.jsx — shared chart rendering component.
 * Handles both new flat shape { labels, values } and legacy { data, chart_config }.
 */
import React from "react";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend,
} from "chart.js";
import { Bar, Line, Pie } from "react-chartjs-2";

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend
);

const CHART_COLORS = [
  "#0d3347", "#c0605a", "#2196f3", "#4caf50",
  "#ff9800", "#9c27b0", "#00bcd4", "#ff5722",
  "#e91e63", "#8bc34a", "#ffc107", "#3f51b5",
  "#009688", "#795548", "#607d8b", "#f44336",
  "#673ab7", "#03a9f4", "#cddc39", "#ff6f00",
];

export function ChartRenderer({ data }) {
  // Shape A (new): { type:"chart", chart_type, labels, values, answer }
  if (data.labels && data.values) {
    const chartType = (data.chart_type || "bar").toLowerCase();
    const isPie = chartType === "pie";
    const chartData = {
      labels: data.labels,
      datasets: [{
        label: data.answer || "Result",
        data: data.values,
        // Pie: one color per slice. Bar/Line: single color for the series.
        backgroundColor: isPie
          ? data.labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length])
          : CHART_COLORS[0],
        borderColor: isPie
          ? data.labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length])
          : CHART_COLORS[0],
        borderWidth: 1,
      }],
    };
    const options = {
      responsive: true,
      plugins: { legend: { position: "top" }, title: { display: false } },
      scales: !isPie ? { y: { beginAtZero: true } } : undefined,
    };
    return (
      <div style={{ maxWidth: "420px", marginTop: "8px" }}>
        {data.answer && <p style={{ fontSize: "13px", marginBottom: "8px" }}>{data.answer}</p>}
        {isPie && <Pie  data={chartData} options={options} />}
        {chartType === "line" && <Line data={chartData} options={options} />}
        {(!isPie && chartType !== "line") && <Bar data={chartData} options={options} />}
      </div>
    );
  }

  // Shape B (legacy): { type:"chart", data:[], chart_config:{ type, xKey, series } }
  if (data.data?.length > 0 && data.chart_config) {
    const { type: cfgType, xKey, series } = data.chart_config;
    const chartType = (cfgType || "bar").toLowerCase();
    const isPie = chartType === "pie";
    const seriesArr = Array.isArray(series) ? series : [series];
    const labels = data.data.map((r) => String(r[xKey] ?? ""));
    const chartData = {
      labels,
      datasets: isPie
        // Pie with single series: one color per label/slice
        ? [{
            label: seriesArr[0],
            data: data.data.map((r) => Number(r[seriesArr[0]]) || 0),
            backgroundColor: labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
            borderColor: "#fff",
            borderWidth: 2,
          }]
        // Bar/Line: one color per series
        : seriesArr.map((s, i) => ({
            label: s,
            data: data.data.map((r) => Number(r[s]) || 0),
            backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
            borderColor: CHART_COLORS[i % CHART_COLORS.length],
            borderWidth: 1,
          })),
    };
    const options = {
      responsive: true,
      plugins: { legend: { position: "top" } },
      scales: !isPie ? { y: { beginAtZero: true } } : undefined,
    };
    return (
      <div style={{ maxWidth: "420px", marginTop: "8px" }}>
        {data.answer && <p style={{ fontSize: "13px", marginBottom: "8px" }}>{data.answer}</p>}
        {isPie && <Pie  data={chartData} options={options} />}
        {chartType === "line" && <Line data={chartData} options={options} />}
        {(!isPie && chartType !== "line") && <Bar data={chartData} options={options} />}
      </div>
    );
  }

  return <span style={{ whiteSpace: "pre-wrap" }}>{data.answer || "No chart data available."}</span>;
}

export default ChartRenderer;
