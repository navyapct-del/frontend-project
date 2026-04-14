/**
 * SingleFileSathi.jsx — Files Knowledge Bot
 * Features:
 *  - File type validation (validateFileType)
 *  - Temp blob storage (temp flag + session_id)
 *  - ChatGPT-style layout (right-align user, left-align bot with avatar)
 *  - chatStore (Zustand + sessionStorage)
 *  - Editable queries (editingIndex / editText)
 *  - Upload progress bar
 *  - Shared BotMessage component
 *  - Responsive max-width bubbles
 */
import React, { useState, useRef, useEffect } from "react";
import { uploadDocument, queryDocuments, deleteDocument, cleanupSession } from "../config/AzureApi";
import { validateFileType } from "../utils/fileValidation";
import { BotMessage } from "../Data-Orch-Components/ChatComponents/BotMessage";
import { ProgressBar } from "../Data-Orch-Components/UploadComponent/ProgressBar";

// ── Session-scoped chat store for SingleFileSathi ────────────────────────────
// Uses a separate sessionStorage key so it doesn't collide with SymphonyChatbot.
const SFS_SESSION_KEY = "sfs_chat_messages";

function loadSfsMessages() {
  try {
    const raw = sessionStorage.getItem(SFS_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveSfsMessages(msgs) {
  try { sessionStorage.setItem(SFS_SESSION_KEY, JSON.stringify(msgs)); } catch {}
}

const WELCOME_MSG = {
  id: "welcome",
  role: "bot",
  text: "Welcome to Files Knowledge Bot. Attach a file and ask me anything about it!",
  rawData: null,
};

export default function SingleFileSathi() {
  // ── File state ──────────────────────────────────────────────────────────────
  const [file, setFile]                   = useState(null);
  const [uploading, setUploading]         = useState(false);
  const [fileReady, setFileReady]         = useState(false);
  const [uploadErr, setUploadErr]         = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [tempDocId, setTempDocId]         = useState(null);

  // ── Session ID (generated once per mount) ───────────────────────────────────
  const [sessionId] = useState(() => crypto.randomUUID());

  // ── Chat state (sessionStorage-backed) ─────────────────────────────────────
  const [messages, setMessagesState] = useState(() => loadSfsMessages() || [WELCOME_MSG]);
  const [input, setInput]             = useState("");
  const [thinking, setThinking]       = useState(false);
  const [history, setHistory]         = useState([]);

  // ── Edit state ──────────────────────────────────────────────────────────────
  const [editingIndex, setEditingIndex] = useState(null);
  const [editText, setEditText]         = useState("");

  const fileRef    = useRef();
  const chatEndRef = useRef();

  const setMessages = (msgs) => {
    saveSfsMessages(msgs);
    setMessagesState(msgs);
  };

  const addMessage = (msg) => {
    setMessages([...messages, msg]);
  };

  // Auto-scroll on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  // ── Pick & auto-upload file ─────────────────────────────────────────────────
  const pickFile = async (f) => {
    if (!f) return;

    // Validate file type
    if (!validateFileType(f)) {
      addMessage({
        id: `err-${Date.now()}`,
        role: "bot",
        text: "Unsupported file type. Please upload a JPG, PNG, PDF, CSV, Excel, or Word file.",
        rawData: null,
        isError: true,
      });
      return;
    }

    setFile(f);
    setFileReady(false);
    setUploadErr("");
    setUploadProgress(0);
    setUploading(true);

    try {
      // Build FormData with temp flag + session_id
      const formData = new FormData();
      formData.append("file", f);
      formData.append("filename", f.name);
      formData.append("description", "");
      formData.append("tags", "");
      formData.append("temp", "true");
      formData.append("session_id", sessionId);

      // Use uploadDocument with onProgress; pass extra fields via the existing API
      const result = await uploadDocument(f, "", "", (pct) => setUploadProgress(pct), {
        temp: "true",
        session_id: sessionId,
      });

      setTempDocId(result.id);
      setFileReady(true);
      setUploadProgress(100);
      addMessage({
        id: `upload-ok-${Date.now()}`,
        role: "bot",
        text: `✓ "${f.name}" uploaded successfully. Ask me anything about it!`,
        rawData: null,
      });
    } catch (err) {
      const reason = err.message || "Unknown error";
      setUploadErr(`Upload failed: ${reason}`);
      addMessage({
        id: `upload-err-${Date.now()}`,
        role: "bot",
        text: `Upload failed: ${reason}`,
        rawData: null,
        isError: true,
      });
    }
    setUploading(false);
  };

  // ── Edit helpers ────────────────────────────────────────────────────────────
  const handleEditClick = (idx, text) => {
    setEditingIndex(idx);
    setEditText(text);
    setInput(text);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditText("");
    setInput("");
  };

  // ── Send / edit-submit ──────────────────────────────────────────────────────
  const sendPrompt = async () => {
    const text = (editingIndex !== null ? editText : input).trim();
    if (!text || !fileReady) return;

    const userMsg = { id: `u-${Date.now()}`, role: "user", text, rawData: null };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setEditText("");
    setEditingIndex(null);
    setThinking(true);

    try {
      const updatedHistory = [...history, { role: "user", content: text }];
      const data = await queryDocuments(text, file?.name || "", updatedHistory);

      const botMsg = {
        id: `b-${Date.now()}`,
        role: "bot",
        text: data.answer || "No response received.",
        rawData: data,
        originalQuery: text,
      };

      setHistory([...updatedHistory, { role: "assistant", content: data.answer || "" }]);
      setMessages([...newMessages, botMsg]);
    } catch (err) {
      setMessages([...newMessages, {
        id: `b-err-${Date.now()}`,
        role: "bot",
        text: `Error: ${err.message}`,
        rawData: null,
        isError: true,
      }]);
    }
    setThinking(false);
  };

  // ── Clear chat (with temp blob cleanup via session) ────────────────────────
  const clearChat = async () => {
    try {
      // Use cleanupSession to delete all temp blobs for this session at once
      await cleanupSession(sessionId);
    } catch (err) {
      console.warn("[SingleFileSathi] cleanupSession failed:", err.message);
      // Still reset UI even if cleanup fails
    }
    setMessages([WELCOME_MSG]);
    setFile(null);
    setFileReady(false);
    setTempDocId(null);
    setUploadProgress(0);
    setHistory([]);
    setInput("");
    setEditingIndex(null);
    setEditText("");
  };

  // ── Remove file chip (with temp blob cleanup) ───────────────────────────────
  const removeFile = async () => {
    if (tempDocId) {
      try { await deleteDocument(tempDocId); } catch {}
    }
    setFile(null);
    setFileReady(false);
    setTempDocId(null);
    setUploadProgress(0);
  };

  // ── Bot avatar ──────────────────────────────────────────────────────────────
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

  const inputValue    = editingIndex !== null ? editText : input;
  const setInputValue = editingIndex !== null ? setEditText : setInput;
  const canSend       = fileReady && inputValue.trim() && !thinking && !uploading;

  return (
    <div style={s.page}>
      <div style={s.chatCard}>

        {/* ── Messages area ── */}
        <div style={s.messages}>
          {messages.map((m, i) => (
            <div key={m.id || i} style={{ marginBottom: "16px" }}>
              {m.role === "bot" ? (
                <div style={s.botRow}>
                  <BotAvatar />
                  <div style={{
                    ...s.botBubble,
                    ...(m.isError ? { borderColor: "#fca5a5", background: "#fff5f5", color: "#dc2626" } : {}),
                  }}>
                    <BotMessage msg={m} />
                  </div>
                </div>
              ) : (
                <div style={s.userRow}>
                  <div style={{ position: "relative" }} className="user-msg-wrap">
                    <div style={s.userBubble}>{m.text}</div>
                    <button
                      style={s.editBtn}
                      title="Edit message"
                      onClick={() => handleEditClick(i, m.text)}
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

          {/* Uploading indicator */}
          {uploading && (
            <div style={s.botRow}>
              <BotAvatar />
              <div style={s.botBubble}>
                <span style={{ color: "#6b7280", fontSize: "13px" }}>
                  Uploading "{file?.name}"…
                </span>
                {uploadProgress > 0 && (
                  <ProgressBar
                    percent={uploadProgress}
                    filename={file?.name || ""}
                    fileSize={file?.size || 0}
                  />
                )}
              </div>
            </div>
          )}

          {/* Thinking indicator */}
          {thinking && (
            <div style={s.botRow}>
              <BotAvatar />
              <div style={s.botBubble}>
                <span style={{ color: "#6b7280" }}>Thinking…</span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* ── Input bar ── */}
        <div style={{
          ...s.inputBar,
          borderTopColor: editingIndex !== null ? "#c0605a" : "#e5e7eb",
          borderTopWidth: editingIndex !== null ? "2px" : "1px",
        }}>
          {/* Edit mode indicator */}
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

          {/* File chip */}
          {file && (
            <div style={s.fileChip}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1a6b8a" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <span style={s.chipName}>{file.name}</span>
              {fileReady && <span style={s.chipReady}>✓</span>}
              <button style={s.chipRemove} onClick={removeFile}>✕</button>
            </div>
          )}

          <div style={s.inputRow}>
            <input
              style={{
                ...s.input,
                borderColor: editingIndex !== null ? "#c0605a" : "#e5e7eb",
              }}
              placeholder={fileReady ? "Type a message…" : "Attach a file to start chatting"}
              value={inputValue}
              disabled={!fileReady || thinking || uploading}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && canSend && sendPrompt()}
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
            <input
              ref={fileRef}
              type="file"
              accept=".jpg,.jpeg,.png,.gif,.svg,.pdf,.csv,.xls,.xlsx,.doc,.docx,.txt,image/*,application/pdf,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              style={{ display: "none" }}
              onChange={(e) => pickFile(e.target.files[0])}
            />

            {/* Send */}
            <button
              style={{ ...s.sendBtn, opacity: canSend ? 1 : 0.5, cursor: canSend ? "pointer" : "default" }}
              disabled={!canSend}
              onClick={sendPrompt}
            >
              {editingIndex !== null ? "Update" : "Send"}
            </button>

            {/* Clear chat */}
            <button
              type="button"
              onClick={clearChat}
              title="Clear chat"
              style={s.clearBtn}
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

      {/* Hover styles for edit button */}
      <style>{`
        .user-msg-wrap:hover .edit-icon-btn { opacity: 1 !important; }
        @media (max-width: 767px) {
          .sfs-bot-bubble, .sfs-user-bubble { max-width: 85% !important; }
        }
        @media (min-width: 768px) {
          .sfs-bot-bubble, .sfs-user-bubble { max-width: 70% !important; }
        }
      `}</style>
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
    flexWrap: "wrap",
  },
  input: {
    flex: 1,
    minWidth: "120px",
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
    flexShrink: 0,
    transition: "opacity 0.2s",
  },
  clearBtn: {
    height: "42px",
    padding: "0 14px",
    borderRadius: "10px",
    background: "#fff",
    border: "1.5px solid #e5e7eb",
    cursor: "pointer",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    gap: "6px",
    color: "#6b7280",
    fontSize: "13px",
    fontWeight: "500",
    transition: "border-color 0.15s, color 0.15s",
  },
};
