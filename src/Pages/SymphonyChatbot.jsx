import React, { useEffect, useRef, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Line, Pie } from "react-chartjs-2";
import { queryDocuments } from "../config/AzureApi";
import { useChatStore } from "../stores/chatStore";

// Register Chart.js components (no CDN needed)
ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend
);

const CHART_COLORS = [
  "#0d3347", "#c0605a", "#2196f3", "#4caf50",
  "#ff9800", "#9c27b0", "#00bcd4", "#ff5722",
];

// ── Unified chart renderer ───────────────────────────────────────────────────
const ChartRenderer = ({ data }) => {
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

  // Fallback — chart intent but no renderable data
  return <span style={{ whiteSpace: "pre-wrap" }}>{data.answer || "No chart data available."}</span>;
};

// ── Smart text-to-chart parser ───────────────────────────────────────────────
// If backend returns type:"text" but user asked for a chart,
// try to extract numbers from the answer and build chart data client-side.
const parseChartFromText = (answer, question) => {
  if (!answer || typeof answer !== "string") return null;

  const lines = answer.split(/\n/).map(s => s.trim()).filter(Boolean);
  const labels = [];
  const values = [];

  // Pattern: "Label: 42" or "Label - 42" or "Label (42)" or "42 Label"
  const patterns = [
    /^(.+?)[\s]*[:\-–]\s*(\d+(?:\.\d+)?)\s*$/,
    /^(.+?)\s*\((\d+(?:\.\d+)?)\)\s*$/,
    /^(\d+(?:\.\d+)?)\s+(.+)$/,
  ];

  lines.forEach(line => {
    for (const pat of patterns) {
      const m = line.match(pat);
      if (m) {
        const isNumFirst = pat === patterns[2];
        const label = isNumFirst ? m[2].trim() : m[1].trim();
        const value = parseFloat(isNumFirst ? m[1] : m[2]);
        if (!isNaN(value) && label.length < 80) {
          labels.push(label);
          values.push(value);
        }
        break;
      }
    }
  });

  if (labels.length >= 2) {
    const q = question.toLowerCase();
    const chartType = q.includes("pie") ? "pie" : q.includes("line") ? "line" : "bar";
    return { type: "chart", chart_type: chartType, labels, values, answer };
  }
  return null;
};

const CHART_INTENT_RE = /\b(plot|chart|graph|visuali[sz]e|bar chart|pie chart|line chart|show.*graph|how many|count|distribution|breakdown|compare|versus|vs\.?)\b/i;

// ── Table renderer ───────────────────────────────────────────────────────────
const ResultTable = ({ columns, rows }) => (
  <div style={{ overflowX: "auto", fontSize: "13px", marginTop: "8px" }}>
    <table style={{ borderCollapse: "collapse", width: "100%", minWidth: "300px" }}>
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c} style={{ padding: "7px 12px", background: "#f3f4f6", borderBottom: "2px solid #e5e7eb", textAlign: "left", whiteSpace: "nowrap" }}>
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ borderBottom: "1px solid #f0f0f0", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
            {columns.map((c) => (
              <td key={c} style={{ padding: "6px 12px" }}>{row[c] ?? ""}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ── Bot message renderer — called at render time, not store time ─────────────
const BotMessage = ({ msg }) => {
  if (typeof msg.text === "string" && !msg.rawData) {
    return <span style={{ whiteSpace: "pre-wrap" }}>{msg.text}</span>;
  }

  const data = msg.rawData;
  if (!data) return <span>{msg.text}</span>;

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
    return (
      <div>
        {data.answer && <p style={{ marginBottom: "6px", fontSize: "13px" }}>{data.answer}</p>}
        <ResultTable columns={cols} rows={data.rows} />
      </div>
    );
  }

  // text fallback — try to parse chart from answer if user asked for one
  const answer = data.answer || msg.text || "";
  if (msg.originalQuery && CHART_INTENT_RE.test(msg.originalQuery)) {
    const parsed = parseChartFromText(answer, msg.originalQuery);
    if (parsed) return <ChartRenderer data={parsed} />;
  }

  return <span style={{ whiteSpace: "pre-wrap" }}>{answer || "No relevant data found."}</span>;
};

// ── Main chatbot ─────────────────────────────────────────────────────────────
const SymphonyChatbot = () => {
  const genId = () => `id-${Math.random().toString(36).substr(2, 9)}`;

  const WELCOME = {
    id: "welcome", sender: "bot", isWelcomeMessage: true,
    text: "Welcome! Ask me anything about your uploaded documents.",
    rawData: null,
  };

  const { messages, setMessages, addMessage, chatHistory, setChatHistory, clearMessages, lastTopic, setLastTopic } = useChatStore();

  // Seed welcome message if store is empty (first visit or after clear)
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([WELCOME]);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [newMessage, setNewMessage]   = useState("");
  const [isTyping, setIsTyping]       = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported]              = useState(
    () => "webkitSpeechRecognition" in window || "SpeechRecognition" in window
  );
  const recognitionRef = useRef(null);
  const chatEndRef     = useRef(null);

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.lang = "en-US"; r.interimResults = false; r.maxAlternatives = 1;
    r.onstart  = () => setIsListening(true);
    r.onresult = (e) => { setNewMessage(e.results[0][0].transcript); setIsListening(false); };
    r.onerror  = () => setIsListening(false);
    r.onend    = () => setIsListening(false);
    recognitionRef.current = r;
    r.start();
  };

  const toggleVoice = () => {
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); }
    else startListening();
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const text = newMessage.trim();
    if (!text) return;

    const msgId = genId();
    // Add user message via store (persists to sessionStorage)
    addMessage({ id: msgId, sender: "user", text, rawData: null });
    setNewMessage("");
    setIsTyping(true);

    console.log("[SymphonyChatbot] query:", text);

    // Detect follow-up and prepend last topic so backend has full context
    const FOLLOWUP_TRIGGERS = [
      "explain in detail", "more details", "expand", "elaborate",
      "tell me more", "give more", "describe in detail", "explain more",
      "what does that mean", "can you explain", "explain this", "explain that",
    ];
    const isFollowUp    = FOLLOWUP_TRIGGERS.some(t => text.toLowerCase().includes(t));
    const resolvedQuery = isFollowUp && lastTopic
      ? `${lastTopic} — ${text}`
      : text;

    if (isFollowUp && lastTopic) {
      console.log("[SymphonyChatbot] follow-up detected, resolved to:", resolvedQuery);
    }

    // Add user turn to history before sending
    const updatedHistory = [...chatHistory, { role: "user", content: resolvedQuery }];

    try {
      const data = await queryDocuments(resolvedQuery, "", updatedHistory);
      console.log("[SymphonyChatbot] response type:", data.type, data);

      // Update lastTopic from response title (for future follow-ups)
      if (data.title && data.title !== "Answer" && data.title !== "Not Found") {
        setLastTopic(data.title);
      } else if (!isFollowUp && text.length > 5) {
        // Use the user's query as topic if no title returned
        setLastTopic(text);
      }

      // Build assistant content for history
      const assistantContent = data.answer || data.title || (data.type === "table" ? `Table: ${data.row_count} rows` : "");

      // Update history with assistant response (keep last 10 turns = 20 messages)
      const newHistory = [...updatedHistory, { role: "assistant", content: assistantContent }];
      setChatHistory(newHistory.slice(-20));

      // Add bot message via store (persists to sessionStorage)
      addMessage({
        id:      genId(),
        sender:  "bot",
        text:    data.answer || "",
        rawData: data,
        originalQuery: resolvedQuery,
        isWelcomeMessage: false,
      });
    } catch (err) {
      console.error("[SymphonyChatbot] error:", err);
      addMessage({
        id: genId(), sender: "bot", isWelcomeMessage: false,
        text: `Error: ${err.message}`, rawData: null,
      });
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="chat-window">
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-message ${msg.sender}`}>
            <div className="message-content">
              {msg.sender === "bot"
                ? <BotMessage msg={msg} />
                : msg.text
              }
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="chat-message bot">
            <span>Thinking…</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input bar */}
      <form
        className="chat-input"
        onSubmit={handleSendMessage}
        style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", borderTop: "1px solid #e5e7eb", background: "#fff" }}
      >
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Ask about your documents…"
          style={{ flex: 1, padding: "10px 14px", border: "1.5px solid #e5e7eb", borderRadius: "8px", fontSize: "14px", outline: "none", background: "#f9fafb" }}
        />

        {voiceSupported && (
          <button
            type="button"
            onClick={toggleVoice}
            title={isListening ? "Stop" : "Speak"}
            style={{
              width: "42px", height: "42px", borderRadius: "50%", border: "none",
              cursor: "pointer", flexShrink: 0, display: "flex",
              alignItems: "center", justifyContent: "center",
              background: isListening ? "#0d3347" : "#e8f4f8",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke={isListening ? "#7ec8e3" : "#0d3347"} strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          </button>
        )}

        <button
          type="submit"
          style={{ padding: "0 20px", height: "42px", borderRadius: "8px", background: "#c0605a", color: "#fff", border: "none", fontSize: "14px", fontWeight: "600", cursor: "pointer", flexShrink: 0 }}
        >
          Send
        </button>

        {/* Clear chat */}
        <button
          type="button"
          onClick={clearMessages}
          title="Clear chat"
          style={{ width: "42px", height: "42px", borderRadius: "8px", background: "#f3f4f6", border: "1px solid #e5e7eb", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280" }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
        </button>
      </form>
    </div>
  );
};

export default SymphonyChatbot;
