/**
 * ChartRenderer.jsx — professional chart rendering with full-width layout,
 * colorful palettes, highlighted data points, and industry-standard styling.
 */
import React from "react";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler,
} from "chart.js";
import { Bar, Line, Pie } from "react-chartjs-2";

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler
);

// Vibrant professional palette
const PALETTE = [
  "#4F86F7", "#FF6B6B", "#2ECC71", "#F39C12",
  "#9B59B6", "#1ABC9C", "#E74C3C", "#3498DB",
  "#F1C40F", "#E67E22", "#16A085", "#8E44AD",
];

// Lighter versions for backgrounds
const PALETTE_ALPHA = PALETTE.map(c => c + "33");

const baseTooltip = {
  backgroundColor: "rgba(15,23,42,0.92)",
  titleColor: "#f8fafc",
  bodyColor: "#cbd5e1",
  borderColor: "rgba(255,255,255,0.1)",
  borderWidth: 1,
  padding: 12,
  cornerRadius: 8,
  titleFont: { size: 13, weight: "bold" },
  bodyFont: { size: 12 },
  displayColors: true,
  boxPadding: 4,
};

const baseGrid = {
  color: "rgba(148,163,184,0.15)",
  drawBorder: false,
};

const baseTick = {
  color: "#64748b",
  font: { size: 11 },
};

function buildBarOptions(title) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: title ? { display: true, text: title, color: "#1e293b", font: { size: 14, weight: "700" }, padding: { bottom: 16 } } : { display: false },
      tooltip: { ...baseTooltip, callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString()}` } },
    },
    scales: {
      x: { grid: { ...baseGrid, display: false }, ticks: { ...baseTick, maxRotation: 35 }, border: { display: false } },
      y: { beginAtZero: true, grid: baseGrid, ticks: { ...baseTick, callback: v => v.toLocaleString() }, border: { display: false } },
    },
    animation: { duration: 600, easing: "easeOutQuart" },
  };
}

function buildLineOptions(title) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top", labels: { color: "#334155", font: { size: 12 }, boxWidth: 12, padding: 16 } },
      title: title ? { display: true, text: title, color: "#1e293b", font: { size: 14, weight: "700" }, padding: { bottom: 16 } } : { display: false },
      tooltip: { ...baseTooltip },
    },
    scales: {
      x: { grid: { ...baseGrid, display: false }, ticks: { ...baseTick, maxRotation: 35 }, border: { display: false } },
      y: { beginAtZero: true, grid: baseGrid, ticks: { ...baseTick, callback: v => v.toLocaleString() }, border: { display: false } },
    },
    elements: {
      point: { radius: 5, hoverRadius: 8, borderWidth: 2 },
      line: { tension: 0.4 },
    },
    animation: { duration: 600, easing: "easeOutQuart" },
  };
}

function buildPieOptions(title) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "right", labels: { color: "#334155", font: { size: 12 }, boxWidth: 14, padding: 14 } },
      title: title ? { display: true, text: title, color: "#1e293b", font: { size: 14, weight: "700" }, padding: { bottom: 16 } } : { display: false },
      tooltip: {
        ...baseTooltip,
        callbacks: {
          label: ctx => {
            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
            const pct = total ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
            return ` ${ctx.label}: ${ctx.parsed.toLocaleString()} (${pct}%)`;
          },
        },
      },
    },
    animation: { duration: 700, easing: "easeOutQuart" },
  };
}

// Insight bar: max value highlighted
function InsightBar({ labels, values }) {
  if (!labels?.length) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const avg = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
  const maxLabel = labels[values.indexOf(max)];
  const minLabel = labels[values.indexOf(min)];
  return (
    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "14px" }}>
      {[
        { label: "Highest", value: `${max.toLocaleString()} — ${maxLabel}`, color: "#dcfce7", border: "#16a34a", text: "#15803d" },
        { label: "Lowest",  value: `${min.toLocaleString()} — ${minLabel}`, color: "#fee2e2", border: "#dc2626", text: "#b91c1c" },
        { label: "Average", value: Number(avg).toLocaleString(),             color: "#eff6ff", border: "#3b82f6", text: "#1d4ed8" },
      ].map(({ label, value, color, border, text }) => (
        <div key={label} style={{ flex: "1 1 120px", background: color, border: `1px solid ${border}`, borderRadius: "8px", padding: "8px 12px" }}>
          <div style={{ fontSize: "10px", fontWeight: "700", color: text, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
          <div style={{ fontSize: "12px", fontWeight: "600", color: "#1e293b", marginTop: "2px" }}>{value}</div>
        </div>
      ))}
    </div>
  );
}

export function ChartRenderer({ data }) {
  const title = data.title || null;

  // Shape A: { labels, values }
  if (data.labels && data.values) {
    const chartType = (data.chart_type || "bar").toLowerCase();
    const isPie  = chartType === "pie";
    const isLine = chartType === "line";

    const chartData = {
      labels: data.labels,
      datasets: [{
        label: data.dataset_label || "Value",
        data: data.values,
        backgroundColor: isPie
          ? PALETTE.slice(0, data.labels.length)
          : isLine ? PALETTE_ALPHA[0] : PALETTE.slice(0, data.labels.length),
        borderColor: isPie
          ? PALETTE.slice(0, data.labels.length)
          : PALETTE[0],
        borderWidth: isPie ? 2 : isLine ? 2.5 : 0,
        borderRadius: isPie ? 0 : 6,
        fill: isLine,
        pointBackgroundColor: isLine ? PALETTE.slice(0, data.labels.length) : undefined,
        pointBorderColor: isLine ? "#fff" : undefined,
        hoverOffset: isPie ? 10 : undefined,
      }],
    };

    return (
      <div style={wrap}>
        {data.answer && <p style={answerStyle}>{data.answer}</p>}
        {!isPie && <InsightBar labels={data.labels} values={data.values} />}
        <div style={{ height: isPie ? "340px" : "360px", position: "relative" }}>
          {isPie  && <Pie  data={chartData} options={buildPieOptions(title)} />}
          {isLine && <Line data={chartData} options={buildLineOptions(title)} />}
          {!isPie && !isLine && <Bar data={chartData} options={buildBarOptions(title)} />}
        </div>
      </div>
    );
  }

  // Shape B: { data[], chart_config }
  if (data.data?.length > 0 && data.chart_config) {
    const { type: cfgType, xKey, series } = data.chart_config;
    const chartType = (cfgType || "bar").toLowerCase();
    const isPie  = chartType === "pie";
    const isLine = chartType === "line";

    const firstRow = data.data[0] || {};
    const derivedSeries = series?.length > 0
      ? series
      : Object.keys(firstRow).filter(k => k !== xKey && typeof firstRow[k] === "number");

    if (!derivedSeries.length)
      return <span style={{ whiteSpace: "pre-wrap" }}>{data.answer || "No chart data available."}</span>;

    const labels = data.data.map(r => String(r[xKey] ?? ""));
    const chartData = {
      labels,
      datasets: isPie
        ? [{
            label: derivedSeries[0],
            data: data.data.map(r => Number(r[derivedSeries[0]]) || 0),
            backgroundColor: PALETTE.slice(0, labels.length),
            borderColor: "#fff",
            borderWidth: 2,
            hoverOffset: 10,
          }]
        : derivedSeries.map((s, i) => ({
            label: s,
            data: data.data.map(r => Number(r[s]) || 0),
            backgroundColor: isLine ? PALETTE_ALPHA[i % PALETTE.length] : PALETTE[i % PALETTE.length],
            borderColor: PALETTE[i % PALETTE.length],
            borderWidth: isLine ? 2.5 : 0,
            borderRadius: isLine ? 0 : 6,
            fill: isLine,
            pointBackgroundColor: isLine ? PALETTE[i % PALETTE.length] : undefined,
            pointBorderColor: isLine ? "#fff" : undefined,
          })),
    };

    const allValues = derivedSeries.flatMap(s => data.data.map(r => Number(r[s]) || 0));

    return (
      <div style={wrap}>
        {data.answer && <p style={answerStyle}>{data.answer}</p>}
        {!isPie && <InsightBar labels={labels} values={allValues} />}
        <div style={{ height: isPie ? "340px" : "360px", position: "relative" }}>
          {isPie  && <Pie  data={chartData} options={buildPieOptions(title)} />}
          {isLine && <Line data={chartData} options={buildLineOptions(title)} />}
          {!isPie && !isLine && <Bar data={chartData} options={buildBarOptions(title)} />}
        </div>
      </div>
    );
  }

  return <span style={{ whiteSpace: "pre-wrap" }}>{data.answer || "No chart data available."}</span>;
}

const wrap = {
  width: "100%",
  maxWidth: "820px",
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "14px",
  padding: "20px 24px 24px",
  marginTop: "10px",
  boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
};

const answerStyle = {
  fontSize: "13px",
  color: "#475569",
  marginBottom: "14px",
  lineHeight: "1.6",
};

export default ChartRenderer;

