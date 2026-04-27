/**
 * BotMessage.jsx — shared bot message renderer.
 * Handles text, table, chart, and error response types.
 */
import React, { useState } from "react";
import { ChartRenderer } from "./ChartRenderer";
import { ResultTable } from "./ResultTable";
import { TypewriterText } from "./TypewriterText";
import { MarkdownText } from "./MarkdownText";

const CHART_INTENT_RE = /\b(plot|chart|graph|visuali[sz]e|bar chart|pie chart|line chart|show.*graph|distribution|breakdown|compare|versus|vs\.?)\b/i;
const EXPLAIN_RE = /\b(explain|describe|what (is|does|are)|tell me (about|more)|summarize|summary|meaning|interpret|analyse|analyze)\b/i;

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

// Track which message IDs have finished typing (persists across tab switches)
const finishedMessages = new Set();

// Streams text word-by-word, then renders full markdown once done
function StreamedText({ text, msgId }) {
  const alreadyDone = msgId && finishedMessages.has(msgId);
  const [done, setDone] = useState(alreadyDone);
  if (!text) return null;
  if (done) return <MarkdownText text={text} />;
  return (
    <span style={{ whiteSpace: "pre-wrap", fontSize: "13.5px", color: "#1e293b", lineHeight: "1.7" }}>
      <TypewriterText text={text} onDone={() => {
        if (msgId) finishedMessages.add(msgId);
        setDone(true);
      }} />
      <span style={{ display: "inline-block", width: "2px", height: "14px", background: "#0d3347", marginLeft: "2px", verticalAlign: "middle", animation: "blink 0.8s step-end infinite" }} />
      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </span>
  );
}

// Strip any trailing "Sources: ..." text from answer strings (legacy cleanup)
function stripSources(text) {
  if (!text || typeof text !== "string") return text;
  return text.replace(/\n*\s*Sources:\s*[^\n]*/gi, "").trim();
}

export function BotMessage({ msg }) {
  let resolvedMsg = msg;

  const tryParseJSON = (str) => {
    if (!str || typeof str !== "string") return null;
    const trimmed = str.trim();
    const jsonStart = Math.min(
      trimmed.indexOf("{") === -1 ? Infinity : trimmed.indexOf("{"),
      trimmed.indexOf("[") === -1 ? Infinity : trimmed.indexOf("[")
    );
    if (jsonStart === Infinity) return null;
    try {
      const parsed = JSON.parse(trimmed.slice(jsonStart));
      if (parsed && typeof parsed === "object" && parsed.type) return parsed;
    } catch {}
    return null;
  };

  if (typeof msg.text === "string" && !msg.rawData) {
    const parsed = tryParseJSON(msg.text);
    if (parsed) {
      resolvedMsg = { ...msg, text: parsed.answer || "", rawData: parsed };
    }
  }

  const { text, rawData, originalQuery } = resolvedMsg;

  let data = rawData;
  if (data && typeof data.answer === "string") {
    const inner = tryParseJSON(data.answer);
    if (inner) data = inner;
  }

  if (data && data.type === "text" && typeof data.answer === "string") {
    const inner = tryParseJSON(data.answer);
    if (inner) data = inner;
  }

  if (!data) {
    return <StreamedText text={stripSources(text) || ""} msgId={msg.id} />;
  }

  const isChartQuery = originalQuery && CHART_INTENT_RE.test(originalQuery) && !EXPLAIN_RE.test(originalQuery);

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
    // If user asked to explain/describe, show the answer as text instead of re-rendering a chart
    if (originalQuery && EXPLAIN_RE.test(originalQuery)) {
      const genericPhrases = ["chart generated", "data points", "chart from"];
      const answerText = stripSources(data.answer) || "";
      const isGeneric = genericPhrases.some(p => answerText.toLowerCase().includes(p));
      const displayText = isGeneric
        ? "The chart displays the data from your document. Please ask a more specific question about the data for a detailed explanation."
        : answerText || "Here is the explanation.";
      return <StreamedText text={displayText} msgId={msg.id} />;
    }
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
        {data.answer && <p style={{ marginBottom: "6px", fontSize: "13px" }}>{stripSources(data.answer)}</p>}
        <ResultTable columns={cols} rows={data.rows} />
      </div>
    );
  }

  const answer = stripSources(data.answer || msg.text || "");
  if (isChartQuery) {
    const parsed = parseChartFromText(answer, msg.originalQuery);
    if (parsed) return <ChartRenderer data={parsed} />;
  }

  return <StreamedText text={answer || "No relevant information found in this document."} msgId={msg.id} />;
}

export default BotMessage;
