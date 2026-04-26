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
import { queryDocuments, saveMessage } from "../config/AzureApi";
import { useChatStore } from "../stores/chatStore";
import { ChartRenderer } from "../Data-Orch-Components/ChatComponents/ChartRenderer";
import { ResultTable } from "../Data-Orch-Components/ChatComponents/ResultTable";
import { BotMessage } from "../Data-Orch-Components/ChatComponents/BotMessage";

// Register Chart.js components (no CDN needed)
ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend
);

const CHART_COLORS = [
  "#0d3347", "#c0605a", "#2196f3", "#4caf50",
  "#ff9800", "#9c27b0", "#00bcd4", "#ff5722",
];

// ── Styles ───────────────────────────────────────────────────────────────────
const sc = {
  page: {
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    height: "calc(100vh - 120px)",
    display: "flex",
    flexDirection: "column",
  },

  chatCard: {
    flex: 1,
    background: "#ffffff",
    border: "1.5px solid #e5e7eb",
    borderRadius: "16px",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  messages: {
    flex: 1,
    padding: "24px",
    overflowY: "auto",
    background: "#f3f4f6",
    display: "flex",
    flexDirection: "column",
  },
  botRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: "8px",
    maxWidth: "70%",
  },
  avatar: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    background: "#e8f4f8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: "2px",
  },
  botBubble: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "0 12px 12px 12px",
    padding: "12px 16px",
    fontSize: "14px",
    color: "#1f2937",
    lineHeight: "1.6",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    maxWidth: "calc(70vw - 60px)",
  },
  userRow: {
    display: "flex",
    justifyContent: "flex-end",
    marginBottom: "4px",
  },
  userBubble: {
    display: "inline-block",
    background: "#0d3347",
    borderRadius: "12px 0 12px 12px",
    padding: "12px 16px",
    fontSize: "14px",
    color: "#ffffff",
    maxWidth: "70%",
    lineHeight: "1.6",
  },
  editBtn: {
    position: "absolute",
    top: "50%",
    left: "-28px",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#9ca3af",
    padding: "4px",
    opacity: 0,
    transition: "opacity 0.15s",
    display: "flex",
    alignItems: "center",
  },
  inputBar: {
    background: "#ffffff",
    borderTop: "1px solid #e5e7eb",
    borderTopStyle: "solid",
    padding: "12px 16px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    position: "sticky",
    bottom: 0,
  },
  editingLabel: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
    color: "#c0605a",
    fontWeight: 500,
  },
  cancelEditBtn: {
    marginLeft: "auto",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#6b7280",
    fontSize: "12px",
    textDecoration: "underline",
  },
  inputRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },
  input: {
    flex: 1,
    minWidth: "120px",
    padding: "10px 14px",
    border: "1.5px solid #e5e7eb",
    borderRadius: "8px",
    fontSize: "14px",
    outline: "none",
    background: "#f9fafb",
  },
};

// ── Normalize backend response ───────────────────────────────────────────────
// If backend returns { type: "text", answer: "{...json...}" }, unwrap the JSON
function normalizeResponse(data) {
  if (!data || typeof data !== "object") return data;

  // If answer field is a JSON string containing a structured response, unwrap it
  if (typeof data.answer === "string") {
    const trimmed = data.answer.trim();
    // Find first { in the string (handles leading whitespace/text)
    const jsonIdx = trimmed.indexOf("{");
    if (jsonIdx !== -1) {
      try {
        const inner = JSON.parse(trimmed.slice(jsonIdx));
        if (inner && inner.type && inner.type !== "text") {
          console.log("[normalizeResponse] unwrapped JSON from answer field, type:", inner.type);
          return inner;
        }
        // Even if type is "text", if it has rows/columns/labels/values, use it
        if (inner && (inner.rows || inner.columns || inner.labels || inner.values || inner.data)) {
          return inner;
        }
      } catch {}
    }
  }
  return data;
}

// ── Main chatbot ─────────────────────────────────────────────────────────────
/**
 * Props (all optional — existing behaviour unchanged when not provided):
 *   sessionId       – override the auto-generated session id
 *   userId          – override the hard-coded user email
 *   initialMessages – pre-load messages when switching to a previous session
 *   onMessageSaved  – () => void  called after each message is persisted
 */
const SymphonyChatbot = ({
  sessionId: sessionIdProp,
  userId: userIdProp,
  initialMessages,
  onMessageSaved,
  filenameFilter = "",
} = {}) => {
  const genId = () => `id-${Math.random().toString(36).substr(2, 9)}`;

  const WELCOME = {
    id: "welcome", sender: "bot", isWelcomeMessage: true,
    text: "Welcome! Ask me anything about your uploaded documents.",
    rawData: null,
  };

  const { messages, setMessages, addMessage, chatHistory, setChatHistory, clearMessages, lastTopic, setLastTopic } = useChatStore();

  // When initialMessages changes (session switch), replace the message list
  useEffect(() => {
    if (initialMessages && initialMessages.length > 0) {
      setMessages(initialMessages);
    } else if (messages.length === 0) {
      setMessages([WELCOME]);
    }
  }, [initialMessages]); // eslint-disable-line react-hooks/exhaustive-deps

  // Seed welcome message if store is empty (first visit or after clear)
  useEffect(() => {
    if (!initialMessages && messages.length === 0) {
      setMessages([WELCOME]);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [newMessage, setNewMessage]     = useState("");
  const [isTyping, setIsTyping]         = useState(false);
  const [isListening, setIsListening]   = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editText, setEditText]         = useState("");
  // Use prop sessionId if provided, otherwise generate a stable one.
  // Sync when the prop changes (e.g. user switches to a different chat session).
  const [sessionId, setSessionId] = useState(() => sessionIdProp || crypto.randomUUID());
  useEffect(() => {
    if (sessionIdProp && sessionIdProp !== sessionId) {
      setSessionId(sessionIdProp);
    }
  }, [sessionIdProp]); // eslint-disable-line react-hooks/exhaustive-deps
  const userId      = userIdProp || "";
  const [voiceSupported]                = useState(
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

  const handleEditClick = (idx, text) => {
    setEditingIndex(idx);
    setEditText(text);
    setNewMessage(text);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditText("");
    setNewMessage("");
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const text = (editingIndex !== null ? editText : newMessage).trim();
    if (!text) return;

    const msgId = genId();
    addMessage({ id: msgId, sender: "user", text, rawData: null });
    // Save user message to storage (fire-and-forget, don't block UI)
    if (userId) saveMessage(userId, sessionId, text, "user").catch(e => console.warn("[saveMessage] user:", e.message));
    setNewMessage("");
    setEditText("");
    setEditingIndex(null);
    setIsTyping(true);

    console.log("[SymphonyChatbot] query:", text);

    const FOLLOWUP_TRIGGERS = [
      "explain in detail", "more details", "expand", "elaborate",
      "tell me more", "give more", "describe in detail", "explain more",
      "what does that mean", "can you explain", "explain this", "explain that",
    ];
    const isFollowUp    = FOLLOWUP_TRIGGERS.some(t => text.toLowerCase().includes(t));
    const resolvedQuery = isFollowUp && lastTopic ? `${lastTopic} — ${text}` : text;

    if (isFollowUp && lastTopic) {
      console.log("[SymphonyChatbot] follow-up detected, resolved to:", resolvedQuery);
    }

    const updatedHistory = [...chatHistory, { role: "user", content: resolvedQuery }];

    try {
      const raw = await queryDocuments(resolvedQuery, filenameFilter, updatedHistory);
      console.log("[SymphonyChatbot] response type:", raw.type, raw);

      // Normalize: if backend returns type:"text" but answer is a JSON string, unwrap it
      const data = normalizeResponse(raw);
      console.log("[SymphonyChatbot] normalized type:", data.type);

      if (data.title && data.title !== "Answer" && data.title !== "Not Found") {
        setLastTopic(data.title);
      } else if (!isFollowUp && text.length > 5) {
        setLastTopic(text);
      }

      const assistantContent = data.answer || data.title || (data.type === "table" ? `Table: ${data.row_count} rows` : "");
      const newHistory = [...updatedHistory, { role: "assistant", content: assistantContent }];
      setChatHistory(newHistory.slice(-20));
      // Save full JSON for chart/table so it can be restored from history; plain text otherwise
      // Strip heavy fields (sources, script) to stay well under Azure Table Storage 32KB limit
      const storedContent = (data.type && data.type !== "text")
        ? JSON.stringify((({ sources, script, ...rest }) => rest)(data))
        : assistantContent;
      if (userId) saveMessage(userId, sessionId, storedContent, "assistant")
        .then(() => { if (onMessageSaved) onMessageSaved(); })
        .catch(e => console.warn("[saveMessage] assistant:", e.message));

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

  // Bot avatar SVG
  const BotAvatar = () => (
    <div style={sc.avatar}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0d3347" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        <circle cx="9" cy="16" r="1" fill="#0d3347"/>
        <circle cx="15" cy="16" r="1" fill="#0d3347"/>
      </svg>
    </div>
  );

  const inputValue = editingIndex !== null ? editText : newMessage;
  const setInputValue = editingIndex !== null ? setEditText : setNewMessage;

  return (
    <div style={sc.page}>
      {/* ── Chat card ── */}
      <div style={sc.chatCard}>
        {/* Messages area */}
        <div style={sc.messages}>
          {messages.map((msg, i) => (
            <div key={i} style={{ marginBottom: "16px" }}>
              {msg.sender === "bot" ? (
                <div style={sc.botRow}>
                  <BotAvatar />
                  <div style={sc.botBubble}>
                    <BotMessage msg={msg} />
                  </div>
                </div>
              ) : (
                <div style={sc.userRow}>
                  <div style={{ position: "relative" }} className="user-msg-wrap">
                    <div style={sc.userBubble}>{msg.text}</div>
                    <button
                      style={sc.editBtn}
                      title="Edit message"
                      onClick={() => handleEditClick(i, msg.text)}
                      className="edit-icon-btn"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {isTyping && (
            <div style={sc.botRow}>
              <BotAvatar />
              <div style={sc.botBubble}>
                <span style={{ color: "#6b7280" }}>Thinking…</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input bar */}
        <form
          onSubmit={handleSendMessage}
          style={{
            ...sc.inputBar,
            borderColor: editingIndex !== null ? "#c0605a" : "#e5e7eb",
            borderTopWidth: editingIndex !== null ? "2px" : "1px",
          }}
        >
          {editingIndex !== null && (
            <div style={sc.editingLabel}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#c0605a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Editing…
              <button type="button" onClick={cancelEdit} style={sc.cancelEditBtn}>Cancel</button>
            </div>
          )}
          <div style={sc.inputRow} className="chat-input-row">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask about your documents…"
              style={{
                ...sc.input,
                borderColor: editingIndex !== null ? "#c0605a" : "#e5e7eb",
              }}
            />

            {voiceSupported && (
              <button
                type="button"
                onClick={toggleVoice}
                title={isListening ? "Stop listening" : "Voice input"}
                style={{
                  width: "42px", height: "42px", borderRadius: "8px",
                  border: isListening ? "none" : "1.5px solid #e5e7eb",
                  cursor: "pointer", flexShrink: 0, display: "flex",
                  alignItems: "center", justifyContent: "center",
                  background: isListening ? "#0d3347" : "#f9fafb",
                  transition: "all 0.2s",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke={isListening ? "#7ec8e3" : "#6b7280"} strokeWidth="2"
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
              disabled={!inputValue.trim()}
              style={{
                padding: "0 20px", height: "42px", borderRadius: "8px",
                background: "#c0605a", color: "#fff", border: "none",
                fontSize: "14px", fontWeight: "600",
                cursor: inputValue.trim() ? "pointer" : "default",
                flexShrink: 0,
                opacity: inputValue.trim() ? 1 : 0.5,
              }}
            >
              {editingIndex !== null ? "Update" : "Send"}
            </button>

            <button
              type="button"
              onClick={clearMessages}
              title="Clear chat"
              style={{
                height: "42px", padding: "0 14px", borderRadius: "8px",
                background: "#fff", border: "1.5px solid #e5e7eb",
                cursor: "pointer", flexShrink: 0, display: "flex",
                alignItems: "center", gap: "6px",
                color: "#6b7280", fontSize: "13px", fontWeight: "500",
                transition: "border-color 0.15s, color 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#dc2626"; e.currentTarget.style.color = "#dc2626"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.color = "#6b7280"; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
              Clear
            </button>
          </div>
        </form>
      </div>

      {/* Responsive styles */}
      <style>{`
        .user-msg-wrap:hover .edit-icon-btn { opacity: 1 !important; }
        @media (max-width: 767px) {
          .sc-bot-bubble { max-width: 85% !important; }
          .sc-user-bubble { max-width: 85% !important; }
        }
        @media (min-width: 768px) {
          .sc-bot-bubble { max-width: 70% !important; }
          .sc-user-bubble { max-width: 70% !important; }
        }
        /* Responsive input bar */
        @media (max-width: 600px) {
          .chat-input-row { flex-wrap: wrap !important; }
          .chat-input-row input { min-width: 100% !important; order: 1; }
          .chat-input-row button { flex: 1 !important; min-width: 0 !important; }
        }
        /* Responsive bot row */
        @media (max-width: 600px) {
          .sc-bot-row { max-width: 95% !important; }
        }
      `}</style>
    </div>
  );
};

export default SymphonyChatbot;
