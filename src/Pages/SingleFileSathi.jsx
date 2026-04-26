/**
 * SingleFileSathi.jsx — Files Knowledge Bot
 * Fixes:
 *  - Edit query: uses a single `input` state; edit mode copies into it directly
 *  - Input box: single controlled input, no derived setter
 *  - Tab-switch persistence: sessionId, fileReady, tempDocId, fileName persisted in sessionStorage
 */
import React, { useState, useRef, useEffect, useContext } from "react";
import { uploadDocument, queryDocuments, deleteDocument, cleanupSession } from "../config/AzureApi";
import { validateFileType } from "../utils/fileValidation";
import { BotMessage } from "../Data-Orch-Components/ChatComponents/BotMessage";
import { ProgressBar } from "../Data-Orch-Components/UploadComponent/ProgressBar";
import { AccountContext } from "../config/Account";

function getSfsKey(userEmail) {
  return `sfs_state_${userEmail || "guest"}`;
}

function loadState(key) {
  try { return JSON.parse(sessionStorage.getItem(key)) || {}; } catch { return {}; }
}
function saveState(key, patch) {
  try {
    const prev = loadState(key);
    sessionStorage.setItem(key, JSON.stringify({ ...prev, ...patch }));
  } catch {}
}

const WELCOME_MSG = {
  id: "welcome", role: "bot",
  text: "Welcome to Files Knowledge Bot. Attach a file and ask me anything about it!",
  rawData: null,
};

function normalizeResponse(data) {
  if (!data || typeof data !== "object") return data;
  if (typeof data.answer === "string") {
    const trimmed = data.answer.trim();
    const jsonIdx = trimmed.indexOf("{");
    if (jsonIdx !== -1) {
      try {
        const inner = JSON.parse(trimmed.slice(jsonIdx));
        if (inner && (inner.type !== "text" || inner.rows || inner.columns || inner.labels || inner.values || inner.data))
          return inner;
      } catch {}
    }
  }
  return data;
}

export default function SingleFileSathi() {
  const { userEmail } = useContext(AccountContext);
  const sfsKey = getSfsKey(userEmail);

  const [saved] = useState(() => loadState(getSfsKey(userEmail)));

  const [messages, setMessagesRaw] = useState(() => saved.messages || [WELCOME_MSG]);
  const [fileReady, setFileReadyRaw]   = useState(() => !!saved.fileReady);
  const [fileName, setFileNameRaw]     = useState(() => saved.fileName || "");
  const [tempDocId, setTempDocIdRaw]   = useState(() => saved.tempDocId || null);
  const [history, setHistory]           = useState(() => saved.history || []);
  const [input, setInput]               = useState("");
  const [editingIndex, setEditingIndex] = useState(null);
  const [editOriginText, setEditOriginText] = useState("");

  const [uploading, setUploading]       = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadErr, setUploadErr]       = useState("");
  const [thinking, setThinking]         = useState(false);

  // Re-initialize state when the logged-in user changes (different user logs in same browser)
  useEffect(() => {
    const s = loadState(sfsKey);
    setMessagesRaw(s.messages || [WELCOME_MSG]);
    setFileReadyRaw(!!s.fileReady);
    setFileNameRaw(s.fileName || "");
    setTempDocIdRaw(s.tempDocId || null);
    setHistory(s.history || []);
    setInput("");
    setEditingIndex(null);
  }, [sfsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist sessionId across tab switches
  const [sessionId] = useState(() => {
    if (saved.sessionId) return saved.sessionId;
    const id = crypto.randomUUID();
    saveState(sfsKey, { sessionId: id });
    return id;
  });

  const fileRef    = useRef();
  const chatEndRef = useRef();

  const setMessages = (msgs) => { saveState(sfsKey, { messages: msgs }); setMessagesRaw(msgs); };
  const setFileReady = (v) => { saveState(sfsKey, { fileReady: v }); setFileReadyRaw(v); };
  const setFileName = (v) => { saveState(sfsKey, { fileName: v }); setFileNameRaw(v); };
  const setTempDocId = (v) => { saveState(sfsKey, { tempDocId: v }); setTempDocIdRaw(v); };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  // ── Pick & auto-upload ──────────────────────────────────────────────────────
  const pickFile = async (f) => {
    if (!f) return;
    if (!validateFileType(f)) {
      setMessages([...messages, {
        id: `err-${Date.now()}`, role: "bot", isError: true, rawData: null,
        text: "Unsupported file type. Please upload a JPG, PNG, PDF, CSV, Excel, or Word file.",
      }]);
      return;
    }

    setFileName(f.name);
    setFileReady(false);
    setUploadErr("");
    setUploadProgress(0);
    setUploading(true);

    try {
      const result = await uploadDocument(f, "", "", (pct) => setUploadProgress(pct), {
        temp: "true",
        session_id: sessionId,
      });
      setTempDocId(result.id);
      setFileReady(true);
      setUploadProgress(100);
      setMessages([...messages, {
        id: `upload-ok-${Date.now()}`, role: "bot", rawData: null,
        text: `✓ "${f.name}" uploaded successfully. Ask me anything about it!`,
      }]);
    } catch (err) {
      const reason = err.message || "Unknown error";
      setUploadErr(`Upload failed: ${reason}`);
      setMessages([...messages, {
        id: `upload-err-${Date.now()}`, role: "bot", isError: true, rawData: null,
        text: `Upload failed: ${reason}`,
      }]);
    }
    setUploading(false);
  };

  // ── Edit ────────────────────────────────────────────────────────────────────
  const handleEditClick = (idx, text) => {
    setEditingIndex(idx);
    setEditOriginText(text);
    setInput(text); // populate input with the message to edit
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditOriginText("");
    setInput("");
  };

  // ── Send ────────────────────────────────────────────────────────────────────
  const sendPrompt = async () => {
    const text = input.trim();
    if (!text || !fileReady) return;

    // When editing: replace the original user message and drop everything after it
    const baseMessages = editingIndex !== null
      ? messages.slice(0, editingIndex)
      : messages;

    const userMsg = { id: `u-${Date.now()}`, role: "user", text, rawData: null };
    const newMessages = [...baseMessages, userMsg];
    setMessages(newMessages);
    setInput("");
    setEditingIndex(null);
    setEditOriginText("");
    setThinking(true);

    try {
      const updatedHistory = [...history, { role: "user", content: text }];
      const raw = await queryDocuments(text, fileName, updatedHistory);
      const data = normalizeResponse(raw);
      const botMsg = {
        id: `b-${Date.now()}`, role: "bot",
        text: data.answer || "No response received.",
        rawData: data, originalQuery: text,
      };
      const newHistory = [...updatedHistory, { role: "assistant", content: data.answer || "" }];
      setHistory(newHistory);
      saveState(sfsKey, { history: newHistory });
      setMessages([...newMessages, botMsg]);
    } catch (err) {
      setMessages([...newMessages, {
        id: `b-err-${Date.now()}`, role: "bot", isError: true, rawData: null,
        text: `Error: ${err.message}`,
      }]);
    }
    setThinking(false);
  };

  // ── Clear ───────────────────────────────────────────────────────────────────
  const clearChat = async () => {
    try { await cleanupSession(sessionId); } catch {}
    const newId = crypto.randomUUID();
    sessionStorage.removeItem(sfsKey);
    saveState(sfsKey, { sessionId: newId });
    setMessagesRaw([WELCOME_MSG]);
    setFileReadyRaw(false);
    setFileNameRaw("");
    setTempDocIdRaw(null);
    setUploadProgress(0);
    setHistory([]);
    setInput("");
    setEditingIndex(null);
  };

  const removeFile = async () => {
    if (tempDocId) { try { await deleteDocument(tempDocId); } catch {} }
    setFileReady(false);
    setFileName("");
    setTempDocId(null);
    setUploadProgress(0);
  };

  const BotAvatar = () => (
    <div style={s.avatar}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0d3347" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        <circle cx="9" cy="16" r="1" fill="#0d3347"/>
        <circle cx="15" cy="16" r="1" fill="#0d3347"/>
      </svg>
    </div>
  );

  const canSend = fileReady && input.trim() && !thinking && !uploading;

  return (
    <div style={s.page}>
      <div style={s.chatCard}>
        <div style={s.messages}>
          {messages.map((m, i) => (
            <div key={m.id || i} style={{ marginBottom: "16px" }}>
              {m.role === "bot" ? (
                <div style={s.botRow}>
                  <BotAvatar />
                  <div style={{ ...s.botBubble, ...(m.isError ? { borderColor: "#fca5a5", background: "#fff5f5", color: "#dc2626" } : {}) }}>
                    <BotMessage msg={m} />
                  </div>
                </div>
              ) : (
                <div style={s.userRow}>
                  <div style={{ position: "relative" }} className="user-msg-wrap">
                    <div style={s.userBubble}>{m.text}</div>
                    <button style={s.editBtn} title="Edit message" onClick={() => handleEditClick(i, m.text)} className="edit-icon-btn">
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

          {uploading && (
            <div style={s.botRow}>
              <BotAvatar />
              <div style={s.botBubble}>
                <span style={{ color: "#6b7280", fontSize: "13px" }}>Uploading "{fileName}"…</span>
                {uploadProgress > 0 && <ProgressBar percent={uploadProgress} filename={fileName} fileSize={0} />}
              </div>
            </div>
          )}

          {thinking && (
            <div style={s.botRow}>
              <BotAvatar />
              <div style={s.botBubble}><span style={{ color: "#6b7280" }}>Thinking…</span></div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* ── Input bar ── */}
        <div style={{ ...s.inputBar, borderTopColor: editingIndex !== null ? "#c0605a" : "#e5e7eb", borderTopWidth: editingIndex !== null ? "2px" : "1px" }}>
          {editingIndex !== null && (
            <div style={s.editingLabel}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#c0605a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Editing…
              <button type="button" onClick={cancelEdit} style={s.cancelEditBtn}>Cancel</button>
            </div>
          )}

          {fileName && (
            <div style={s.fileChip}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1a6b8a" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <span style={s.chipName}>{fileName}</span>
              {fileReady && <span style={s.chipReady}>✓</span>}
              <button style={s.chipRemove} onClick={removeFile}>✕</button>
            </div>
          )}

          <div style={s.inputRow}>
            <input
              style={{ ...s.input, borderColor: editingIndex !== null ? "#c0605a" : "#e5e7eb" }}
              placeholder={fileReady ? "Type a message…" : "Attach a file to start chatting"}
              value={input}
              disabled={!fileReady || thinking || uploading}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && canSend && sendPrompt()}
            />
            <button style={s.clipBtn} title="Attach file" onClick={() => fileRef.current.click()} disabled={uploading}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
              </svg>
            </button>
            <input
              ref={fileRef} type="file" style={{ display: "none" }}
              accept=".jpg,.jpeg,.png,.gif,.svg,.pdf,.csv,.xls,.xlsx,.doc,.docx,.txt,image/*"
              onChange={(e) => pickFile(e.target.files[0])}
            />
            <button
              style={{ ...s.sendBtn, opacity: canSend ? 1 : 0.5, cursor: canSend ? "pointer" : "default" }}
              disabled={!canSend} onClick={sendPrompt}
            >
              {editingIndex !== null ? "Update" : "Send"}
            </button>
            <button
              type="button" onClick={clearChat} title="Clear chat" style={s.clearBtn}
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
        </div>
      </div>

      <style>{`
        .user-msg-wrap:hover .edit-icon-btn { opacity: 1 !important; }
      `}</style>
    </div>
  );
}

const s = {
  page: { fontFamily: "'Segoe UI', system-ui, sans-serif", height: "calc(100vh - 120px)", display: "flex", flexDirection: "column" },
  chatCard: { flex: 1, background: "#ffffff", border: "1.5px solid #e5e7eb", borderRadius: "16px", display: "flex", flexDirection: "column", overflow: "hidden" },
  messages: { flex: 1, padding: "24px", overflowY: "auto", background: "#f3f4f6", display: "flex", flexDirection: "column" },
  botRow: { display: "flex", alignItems: "flex-start", gap: "8px" },
  avatar: { width: "28px", height: "28px", borderRadius: "50%", background: "#e8f4f8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "2px" },
  botBubble: { display: "inline-block", background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "0 12px 12px 12px", padding: "12px 16px", fontSize: "14px", color: "#1f2937", maxWidth: "70%", lineHeight: "1.6", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" },
  userRow: { display: "flex", justifyContent: "flex-end" },
  userBubble: { display: "inline-block", background: "#0d3347", borderRadius: "12px 0 12px 12px", padding: "12px 16px", fontSize: "14px", color: "#ffffff", maxWidth: "70%", lineHeight: "1.6" },
  editBtn: { position: "absolute", top: "50%", left: "-28px", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: "4px", opacity: 0, transition: "opacity 0.15s", display: "flex", alignItems: "center" },
  inputBar: { background: "#ffffff", borderTop: "1px solid #e5e7eb", borderTopStyle: "solid", padding: "12px 16px", display: "flex", flexDirection: "column", gap: "8px", position: "sticky", bottom: 0 },
  editingLabel: { display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#c0605a", fontWeight: 500 },
  cancelEditBtn: { marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#6b7280", fontSize: "12px", textDecoration: "underline" },
  fileChip: { display: "inline-flex", alignItems: "center", gap: "6px", background: "#f0f7fa", border: "1px solid #bee3f8", borderRadius: "20px", padding: "4px 10px", fontSize: "12px", color: "#1a6b8a", alignSelf: "flex-start" },
  chipName: { maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "12px" },
  chipReady: { fontSize: "11px", fontWeight: "700", color: "#059669" },
  chipRemove: { background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: "12px", padding: "0 2px", lineHeight: 1 },
  inputRow: { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" },
  input: { flex: 1, minWidth: "120px", padding: "13px 16px", fontSize: "14px", border: "1.5px solid #e5e7eb", borderRadius: "10px", outline: "none", background: "#f9fafb", color: "#1f2937", fontFamily: "inherit" },
  clipBtn: { width: "42px", height: "42px", borderRadius: "10px", background: "transparent", border: "1.5px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#6b7280", flexShrink: 0 },
  sendBtn: { padding: "0 22px", height: "42px", borderRadius: "10px", background: "#c0605a", color: "#ffffff", border: "none", fontSize: "14px", fontWeight: "600", flexShrink: 0 },
  clearBtn: { height: "42px", padding: "0 14px", borderRadius: "10px", background: "#fff", border: "1.5px solid #e5e7eb", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", gap: "6px", color: "#6b7280", fontSize: "13px", fontWeight: "500" },
};
