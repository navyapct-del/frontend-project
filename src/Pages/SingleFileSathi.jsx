import React, { useState, useRef } from "react";
import { LoadingIcon } from "@/base-components";
import { uploadDocument, queryDocuments } from "../config/AzureApi";

export default function SingleFileSathi() {
  const [file, setFile]           = useState(null);
  const [uploading, setUploading] = useState(false);
  const [fileReady, setFileReady] = useState(false);
  const [uploadErr, setUploadErr] = useState("");
  const [messages, setMessages]   = useState([
    { role: "bot", text: "Welcome to Files Knowledge Bot, How can I help you today?" },
  ]);
  const [input, setInput]         = useState("");
  const [thinking, setThinking]   = useState(false);
  const [history, setHistory]     = useState([]);

  const fileRef    = useRef();
  const chatEndRef = useRef();

  /* ── pick & auto-upload file ── */
  const pickFile = async (f) => {
    if (!f) return;
    setFile(f);
    setFileReady(false);
    setUploadErr("");
    setUploading(true);
    try {
      await uploadDocument(f, "", "");
      setFileReady(true);
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: `✓ "${f.name}" uploaded successfully. Ask me anything about it!` },
      ]);
    } catch (err) {
      setUploadErr(`Upload failed: ${err.message}`);
    }
    setUploading(false);
  };

  /* ── send prompt ── */
  const sendPrompt = async () => {
    const text = input.trim();
    if (!text || !fileReady) return;
    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setThinking(true);
    try {
      const updatedHistory = [...history, { role: "user", content: text }];
      const data = await queryDocuments(text, file?.name || "", updatedHistory);

      let botMsg = { role: "bot", text: data.answer || "No response received.", rawData: data };

      setHistory([...updatedHistory, { role: "assistant", content: data.answer || "" }]);
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "bot", text: `Error: ${err.message}` }]);
    }
    setThinking(false);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  /* ── feedback — removed (Azure backend doesn't use UID feedback) ── */

  const chatEndRef = useRef();
  const renderBotMessage = (msg) => {
    const data = msg.rawData;
    if (!data) return <span>{msg.text}</span>;

    if (data.type === "table" && data.rows?.length > 0) {
      const cols = data.columns?.length ? data.columns : Object.keys(data.rows[0]);
      return (
        <div style={{ overflowX: "auto", fontSize: "13px" }}>
          {data.answer && <p style={{ marginBottom: "6px" }}>{data.answer}</p>}
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>{cols.map(c => <th key={c} style={{ padding: "6px 10px", background: "#f3f4f6", borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>{c}</th>)}</tr>
            </thead>
            <tbody>
              {data.rows.map((row, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f0f0f0", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                  {cols.map(c => <td key={c} style={{ padding: "5px 10px" }}>{row[c] ?? ""}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    return <span style={{ whiteSpace: "pre-wrap" }}>{data.answer || msg.text}</span>;
  };

  return (
    <div style={s.page}>
      {/* Chat window */}
      <div style={s.chatCard}>

        {/* Messages area */}
        <div style={s.messages}>
          {messages.map((m, i) => (
            <div key={i} style={{ marginBottom: "16px" }}>
              {m.role === "bot" ? (
                <div style={s.botBubble}>{renderBotMessage(m)}</div>
              ) : (
                <div style={s.userRow}>
                  <div style={s.userBubble}>{m.text}</div>
                </div>
              )}
            </div>
          ))}

          {/* Uploading indicator */}
          {uploading && (
            <div style={s.botBubble}>
              <span style={{ display: "flex", alignItems: "center", gap: "8px", color: "#6b7280" }}>
                <LoadingIcon icon="three-dots" className="w-8 h-4" />
                Uploading "{file?.name}"…
              </span>
            </div>
          )}

          {/* Thinking indicator */}
          {thinking && (
            <div style={s.botBubble}>
              <LoadingIcon icon="three-dots" className="w-8 h-4" />
            </div>
          )}

          {uploadErr && (
            <div style={{ ...s.botBubble, color: "#dc2626", borderColor: "#fca5a5", background: "#fff5f5" }}>
              {uploadErr}
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input bar */}
        <div style={s.inputBar}>
          {/* File chip shown when a file is attached */}
          {file && (
            <div style={s.fileChip}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1a6b8a" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <span style={s.chipName}>{file.name}</span>
              {fileReady && <span style={s.chipReady}>✓</span>}
              <button
                style={s.chipRemove}
                onClick={() => { setFile(null); setFileReady(false); setS3Key(""); }}
              >✕</button>
            </div>
          )}

          <div style={s.inputRow}>
            <input
              style={s.input}
              placeholder={fileReady ? "Type a message..." : "Attach a file to start chatting"}
              value={input}
              disabled={!fileReady || thinking || uploading}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendPrompt()}
            />

            {/* Paperclip */}
            <button
              style={s.clipBtn}
              title="Attach file"
              onClick={() => fileRef.current.click()}
              disabled={uploading}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
              </svg>
            </button>
            <input ref={fileRef} type="file" style={{ display: "none" }} onChange={(e) => pickFile(e.target.files[0])} />

            {/* Send */}
            <button
              style={{
                ...s.sendBtn,
                opacity: fileReady && input.trim() && !thinking ? 1 : 0.5,
                cursor: fileReady && input.trim() && !thinking ? "pointer" : "default",
              }}
              disabled={!fileReady || !input.trim() || thinking}
              onClick={sendPrompt}
            >
              Send
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

const s = {
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

  /* Messages */
  messages: {
    flex: 1,
    padding: "24px",
    overflowY: "auto",
    background: "#f3f4f6",
    display: "flex",
    flexDirection: "column",
  },
  botBubble: {
    display: "inline-block",
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "0 12px 12px 12px",
    padding: "12px 16px",
    fontSize: "14px",
    color: "#1f2937",
    maxWidth: "70%",
    lineHeight: "1.6",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  },
  userRow: {
    display: "flex",
    justifyContent: "flex-end",
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
  thumbRow: {
    display: "flex",
    gap: "6px",
    marginTop: "6px",
    paddingLeft: "4px",
  },
  thumbBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "2px",
    display: "flex",
    alignItems: "center",
    transition: "color 0.15s",
  },

  /* Input bar */
  inputBar: {
    background: "#ffffff",
    borderTop: "1px solid #e5e7eb",
    padding: "12px 16px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  fileChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    background: "#f0f7fa",
    border: "1px solid #bee3f8",
    borderRadius: "20px",
    padding: "4px 10px",
    fontSize: "12px",
    color: "#1a6b8a",
    alignSelf: "flex-start",
  },
  chipName: {
    maxWidth: "200px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: "12px",
  },
  chipReady: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#059669",
  },
  chipRemove: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#9ca3af",
    fontSize: "12px",
    padding: "0 2px",
    lineHeight: 1,
  },
  inputRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  input: {
    flex: 1,
    padding: "13px 16px",
    fontSize: "14px",
    border: "1.5px solid #e5e7eb",
    borderRadius: "10px",
    outline: "none",
    background: "#f9fafb",
    color: "#1f2937",
    fontFamily: "inherit",
  },
  clipBtn: {
    width: "42px",
    height: "42px",
    borderRadius: "10px",
    background: "transparent",
    border: "1.5px solid #e5e7eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "#6b7280",
    flexShrink: 0,
    transition: "border-color 0.15s",
  },
  sendBtn: {
    padding: "0 22px",
    height: "42px",
    borderRadius: "10px",
    background: "#c0605a",
    color: "#ffffff",
    border: "none",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    flexShrink: 0,
    transition: "opacity 0.2s",
  },
};
