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

// ── Insight helpers ──────────────────────────────────────────────────────────
function median(vals) {
  const s = [...vals].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function trend(vals) {
  if (vals.length < 2) return "stable";
  const first = vals[0], last = vals[vals.length - 1];
  const pct = ((last - first) / (Math.abs(first) || 1)) * 100;
  if (pct > 5)  return { dir: "up",   pct: pct.toFixed(1) };
  if (pct < -5) return { dir: "down", pct: Math.abs(pct).toFixed(1) };
  return { dir: "stable", pct: "0" };
}

function InsightsPanel({ labels, values }) {
  if (!labels?.length || !values?.length) return null;

  const max    = Math.max(...values);
  const min    = Math.min(...values);
  const total  = values.reduce((a, b) => a + b, 0);
  const avg    = total / values.length;
  const med    = median(values);
  const spread = max - min;
  const t      = trend(values);
  const maxIdx = values.indexOf(max);
  const minIdx = values.indexOf(min);

  // Top 3 by value
  const ranked = labels
    .map((l, i) => ({ l, v: values[i] }))
    .sort((a, b) => b.v - a.v)
    .slice(0, 3);

  const trendColor = t.dir === "up" ? "#16a34a" : t.dir === "down" ? "#dc2626" : "#64748b";
  const trendIcon  = t.dir === "up" ? "↑" : t.dir === "down" ? "↓" : "→";

  const cards = [
    { label: "Total",   value: total.toLocaleString(),          sub: `across ${labels.length} items`,   bg: "#eff6ff", border: "#3b82f6", text: "#1d4ed8" },
    { label: "Highest", value: max.toLocaleString(),            sub: labels[maxIdx],                     bg: "#dcfce7", border: "#16a34a", text: "#15803d" },
    { label: "Lowest",  value: min.toLocaleString(),            sub: labels[minIdx],                     bg: "#fee2e2", border: "#dc2626", text: "#b91c1c" },
    { label: "Average", value: avg.toLocaleString(undefined, { maximumFractionDigits: 1 }), sub: `median: ${med.toLocaleString(undefined, { maximumFractionDigits: 1 })}`, bg: "#fefce8", border: "#ca8a04", text: "#92400e" },
    { label: "Spread",  value: spread.toLocaleString(),         sub: "max − min range",                  bg: "#f5f3ff", border: "#7c3aed", text: "#5b21b6" },
    { label: "Trend",   value: `${trendIcon} ${t.pct}%`,        sub: t.dir === "stable" ? "stable" : `${t.dir}ward from first to last`, bg: t.dir === "up" ? "#dcfce7" : t.dir === "down" ? "#fee2e2" : "#f1f5f9", border: trendColor, text: trendColor },
  ];

  return (
    <div style={{ marginBottom: "18px" }}>
      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "8px", marginBottom: "14px" }}>
        {cards.map(({ label, value, sub, bg, border, text }) => (
          <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: "10px", padding: "10px 12px" }}>
            <div style={{ fontSize: "10px", fontWeight: "700", color: text, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</div>
            <div style={{ fontSize: "15px", fontWeight: "800", color: "#0f172a", margin: "3px 0 2px" }}>{value}</div>
            <div style={{ fontSize: "10px", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={sub}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Top 3 podium */}
      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "10px 14px" }}>
        <div style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "8px" }}>
          🏆 Top Performers
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {ranked.map(({ l, v }, i) => {
            const pct = max ? (v / max) * 100 : 0;
            const medals = ["🥇", "🥈", "🥉"];
            const barColors = ["#4F86F7", "#2ECC71", "#F39C12"];
            return (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "13px", width: "18px" }}>{medals[i]}</span>
                <span style={{ fontSize: "11px", color: "#334155", width: "140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={l}>{l}</span>
                <div style={{ flex: 1, background: "#e2e8f0", borderRadius: "4px", height: "8px", overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: barColors[i], borderRadius: "4px", transition: "width 0.6s ease" }} />
                </div>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "#0f172a", minWidth: "40px", textAlign: "right" }}>{v.toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Pie-specific insights
function PieInsightsPanel({ labels, values }) {
  if (!labels?.length) return null;
  const total = values.reduce((a, b) => a + b, 0);
  const ranked = labels.map((l, i) => ({ l, v: values[i], pct: total ? ((values[i] / total) * 100).toFixed(1) : 0 }))
    .sort((a, b) => b.v - a.v);
  const dominant = ranked[0];
  return (
    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px" }}>
      <div style={{ flex: "1 1 140px", background: "#eff6ff", border: "1px solid #3b82f6", borderRadius: "10px", padding: "10px 12px" }}>
        <div style={{ fontSize: "10px", fontWeight: "700", color: "#1d4ed8", textTransform: "uppercase", letterSpacing: "0.07em" }}>Total</div>
        <div style={{ fontSize: "15px", fontWeight: "800", color: "#0f172a", margin: "3px 0 2px" }}>{total.toLocaleString()}</div>
        <div style={{ fontSize: "10px", color: "#64748b" }}>{labels.length} categories</div>
      </div>
      <div style={{ flex: "1 1 140px", background: "#dcfce7", border: "1px solid #16a34a", borderRadius: "10px", padding: "10px 12px" }}>
        <div style={{ fontSize: "10px", fontWeight: "700", color: "#15803d", textTransform: "uppercase", letterSpacing: "0.07em" }}>Dominant</div>
        <div style={{ fontSize: "15px", fontWeight: "800", color: "#0f172a", margin: "3px 0 2px" }}>{dominant.pct}%</div>
        <div style={{ fontSize: "10px", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={dominant.l}>{dominant.l}</div>
      </div>
      {ranked.slice(0, 3).map(({ l, v, pct }, i) => (
        <div key={l} style={{ flex: "1 1 100px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "10px 12px" }}>
          <div style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em" }}>#{i + 1}</div>
          <div style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a", margin: "3px 0 2px" }}>{pct}%</div>
          <div style={{ fontSize: "10px", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={l}>{l}</div>
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
        {isPie  ? <PieInsightsPanel labels={data.labels} values={data.values} /> : <InsightsPanel labels={data.labels} values={data.values} />}
        <div style={{ height: isPie ? "320px" : "360px", position: "relative" }}>
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
        {isPie ? <PieInsightsPanel labels={labels} values={allValues} /> : <InsightsPanel labels={labels} values={allValues} />}
        <div style={{ height: isPie ? "320px" : "360px", position: "relative" }}>
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

