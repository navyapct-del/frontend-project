import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { getChatSession } from "../config/AzureApi";

/**
 * Public read-only view of a shared chat session.
 * Route: /chat/:sessionId?userId=<id>
 */
function SharedChat() {
  const { sessionId } = useParams();
  const [searchParams] = useSearchParams();
  const userId = searchParams.get("userId") || "";

  const [messages, setMessages] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");

  useEffect(() => {
    if (!sessionId || !userId) {
      setError("Invalid share link — missing sessionId or userId.");
      setLoading(false);
      return;
    }
    getChatSession(userId, sessionId)
      .then((data) => setMessages(data.messages || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [sessionId, userId]);

  if (loading) return <div style={s.center}>Loading shared chat…</div>;
  if (error)   return <div style={s.center}>Error: {error}</div>;

  return (
    <div style={s.page}>
      <div style={s.header}>
        <span style={s.title}>Shared Chat</span>
        <span style={s.sub}>Read-only view</span>
      </div>
      <div style={s.messages}>
        {messages.length === 0 && <div style={s.empty}>No messages in this session.</div>}
        {messages.map((m, i) => (
          <div key={i} style={m.role === "user" ? s.userRow : s.botRow}>
            <div style={m.role === "user" ? s.userBubble : s.botBubble}>
              {m.content}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const s = {
  page:       { maxWidth: 760, margin: "40px auto", fontFamily: "'Segoe UI', sans-serif", padding: "0 16px" },
  header:     { marginBottom: 24, borderBottom: "1px solid #e5e7eb", paddingBottom: 12 },
  title:      { fontSize: 20, fontWeight: 700, color: "#0d3347" },
  sub:        { fontSize: 12, color: "#9ca3af", marginLeft: 10 },
  messages:   { display: "flex", flexDirection: "column", gap: 12 },
  empty:      { color: "#9ca3af", textAlign: "center", marginTop: 40 },
  userRow:    { display: "flex", justifyContent: "flex-end" },
  botRow:     { display: "flex", justifyContent: "flex-start" },
  userBubble: { background: "#0d3347", color: "#fff", borderRadius: "12px 0 12px 12px", padding: "10px 14px", maxWidth: "70%", fontSize: 14, lineHeight: 1.6 },
  botBubble:  { background: "#f3f4f6", color: "#1f2937", borderRadius: "0 12px 12px 12px", padding: "10px 14px", maxWidth: "70%", fontSize: 14, lineHeight: 1.6 },
  center:     { textAlign: "center", marginTop: 80, color: "#6b7280", fontFamily: "'Segoe UI', sans-serif" },
};

export default SharedChat;
