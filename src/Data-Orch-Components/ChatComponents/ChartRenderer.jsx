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
];

export function ChartRenderer({ data }) {
  // Shape A (new): { type:"chart", chart_type, labels, values, answer }
  if (data.labels && data.values) {
    const chartType = (data.chart_type || "bar").toLowerCase();
    const chartData = {
      labels: data.labels,
      datasets: [{
        label: data.answer || "Result",
        data: data.values,
        backgroundColor: data.labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
        borderColor: data.labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
        borderWidth: 1,
      }],
    };
    const options = {
      responsive: true,
      plugins: { legend: { position: "top" }, title: { display: false } },
      scales: chartType !== "pie" ? { y: { beginAtZero: true } } : undefined,
    };
    return (
      <div style={{ maxWidth: "420px", marginTop: "8px" }}>
        {data.answer && <p style={{ fontSize: "13px", marginBottom: "8px" }}>{data.answer}</p>}
        {chartType === "pie"  && <Pie  data={chartData} options={options} />}
        {chartType === "line" && <Line data={chartData} options={options} />}
        {(chartType === "bar" || !["pie","line"].includes(chartType)) && (
          <Bar data={chartData} options={options} />
        )}
      </div>
    );
  }

  // Shape B (legacy): { type:"chart", data:[], chart_config:{ xKey, series } }
  if (data.data?.length > 0 && data.chart_config) {
    const { xKey, series } = data.chart_config;
    const seriesArr = Array.isArray(series) ? series : [series];
    const chartData = {
      labels: data.data.map((r) => String(r[xKey] ?? "")),
      datasets: seriesArr.map((s, i) => ({
        label: s,
        data: data.data.map((r) => Number(r[s]) || 0),
        backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
      })),
    };
    const options = {
      responsive: true,
      plugins: { legend: { position: "top" } },
      scales: { y: { beginAtZero: true } },
    };
    return (
      <div style={{ maxWidth: "420px", marginTop: "8px" }}>
        {data.answer && <p style={{ fontSize: "13px", marginBottom: "8px" }}>{data.answer}</p>}
        <Bar data={chartData} options={options} />
      </div>
    );
  }

  return <span style={{ whiteSpace: "pre-wrap" }}>{data.answer || "No chart data available."}</span>;
}

export default ChartRenderer;
