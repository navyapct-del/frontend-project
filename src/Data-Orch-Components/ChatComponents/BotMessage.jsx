/**
 * BotMessage.jsx — shared bot message renderer.
 * Handles text, table, chart, and error response types.
 */
import React from "react";
import { ChartRenderer } from "./ChartRenderer";
import { ResultTable } from "./ResultTable";

const CHART_INTENT_RE = /\b(plot|chart|graph|visuali[sz]e|bar chart|pie chart|line chart|show.*graph|how many|count|distribution|breakdown|compare|versus|vs\.?)\b/i;

// ── Smart text-to-chart parser ───────────────────────────────────────────────
function parseChartFromText(answer, question) {
  if (!answer || typeof answer !== "string") return null;
  const q = question.toLowerCase();
  const chartType = q.includes("pie") ? "pie" : q.includes("line") ? "line" : "bar";

  const lines = answer.split(/\n/).map(s => s.trim()).filter(Boolean);
  const labels = [];
  const values = [];

  const inlinePattern = /^(.+?)[\s]*[:\-–]\s*(\d+(?:\.\d+)?)\s*(%|regulations?|items?|sections?|principles?|guidelines?)?$/i;
  const parenPattern  = /^(.+?)\s*\((\d+(?:\.\d+)?)\)\s*$/;

  lines.forEach(line => {
    const m = line.match(inlinePattern) || line.match(parenPattern);
    if (m) {
      const label = m[1].trim();
      const value = parseFloat(m[2]);
      if (!isNaN(value) && label.length < 80 && label.length > 0) {
        labels.push(label);
        values.push(value);
      }
    }
  });

  if (labels.length < 2) {
    const numericIdx = lines.findIndex(l => /^\d+(?:\.\d+)?$/.test(l));
    if (numericIdx > 0) {
      const pairs = [];
      for (let i = 0; i < lines.length - 1; i++) {
        const a = lines[i], b = lines[i + 1];
        const bIsNum = /^\d+(?:\.\d+)?$/.test(b);
        const aIsNum = /^\d+(?:\.\d+)?$/.test(a);
        if (!aIsNum && bIsNum) { pairs.push({ label: a, value: parseFloat(b) }); i++; }
      }
      if (pairs.length >= 2) {
        pairs.forEach(p => { labels.push(p.label); values.push(p.value); });
      }
    }
  }

  if (labels.length >= 2) {
    return { type: "chart", chart_type: chartType, labels, values, answer: null };
  }
  return null;
}

// ── Convert table data to chart when user asked for chart ────────────────────
function tableToChart(columns, rows, question) {
  if (!columns?.length || !rows?.length) return null;
  const q = question.toLowerCase();
  const chartType = q.includes("pie") ? "pie" : q.includes("line") ? "line" : "bar";

  const firstRow = rows[0];
  const labelCol = columns.find(c => isNaN(Number(firstRow[c])));
  const valueCols = columns.filter(c => c !== labelCol && !isNaN(Number(firstRow[c])));

  if (!labelCol || !valueCols.length) return null;

  const labels   = rows.map(r => String(r[labelCol] ?? ""));
  const valueCol = valueCols[0];
  const values   = rows.map(r => Number(r[valueCol]) || 0);

  return { type: "chart", chart_type: chartType, labels, values, answer: null };
}

export function BotMessage({ msg }) {
  if (typeof msg.text === "string" && !msg.rawData) {
    return <span style={{ whiteSpace: "pre-wrap" }}>{msg.text}</span>;
  }

  const data = msg.rawData;
  if (!data) return <span>{msg.text}</span>;

  const isChartQuery = msg.originalQuery && CHART_INTENT_RE.test(msg.originalQuery);

  if (data.type === "error") {
    return (
      <div style={{ fontSize: "13px" }}>
        <span style={{ color: "#dc2626" }}>⚠ {data.answer}</span>
        {data.suggestions?.length > 0 && (
          <div style={{ marginTop: "6px", color: "#6b7280" }}>
            Did you mean: <b>{data.suggestions.join(", ")}</b>?
          </div>
        )}
        {data.available_columns?.length > 0 && (
          <div style={{ marginTop: "4px", color: "#6b7280" }}>
            Available: {data.available_columns.join(", ")}
          </div>
        )}
      </div>
    );
  }

  if (data.type === "chart") {
    return <ChartRenderer data={data} />;
  }

  if (data.type === "table" && data.rows?.length > 0) {
    const cols = data.columns?.length ? data.columns : Object.keys(data.rows[0]);
    if (isChartQuery) {
      const chartData = tableToChart(cols, data.rows, msg.originalQuery);
      if (chartData) return <ChartRenderer data={chartData} />;
    }
    return (
      <div>
        {data.answer && <p style={{ marginBottom: "6px", fontSize: "13px" }}>{data.answer}</p>}
        <ResultTable columns={cols} rows={data.rows} />
      </div>
    );
  }

  const answer = data.answer || msg.text || "";
  if (isChartQuery) {
    const parsed = parseChartFromText(answer, msg.originalQuery);
    if (parsed) return <ChartRenderer data={parsed} />;
  }

  return <span style={{ whiteSpace: "pre-wrap" }}>{answer || "No relevant data found."}</span>;
}

export default BotMessage;
