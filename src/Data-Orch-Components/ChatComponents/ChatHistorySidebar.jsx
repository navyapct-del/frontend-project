import React, { useEffect, useRef, useState } from "react";
import { getChatSessions, deleteChat, shareChat, syncChat } from "../../config/AzureApi";

/**
 * ChatHistorySidebar
 * Props:
 *   userId        – current user's email/id
 *   activeSession – currently active sessionId
 *   onNewChat     – () => void  — start a fresh session
 *   onSelectChat  – (session) => void — load a previous session
 *   refreshTrigger – any value; when it changes the list re-fetches
 */
const ChatHistorySidebar = ({ userId, activeSession, onNewChat, onSelectChat, refreshTrigger }) => {
  const [sessions, setSessions]       = useState([]);
  const [loading, setLoading]         = useState(false);
  const [openMenu, setOpenMenu]       = useState(null); // sessionId with open 3-dot menu
  const [collapsed, setCollapsed]     = useState(false);
  const menuRef                       = useRef(null);
  const [deleteModal, setDeleteModal] = useState(null); // sessionId to confirm delete

  // ── Fetch sessions ──────────────────────────────────────────────────────
  const fetchSessions = async (doSync = false) => {
    if (!userId) return;
    setLoading(true);
    try {
      // Sync Blob → Table only on initial load (when userId first becomes available)
      // so that existing chats stored in Blob appear in the sidebar
      if (doSync) {
        await syncChat(userId).catch(() => {}); // fire-and-forget, don't block on failure
      }
      const data = await getChatSessions(userId);
      // Sort newest first
      const sorted = (Array.isArray(data) ? data : []).sort(
        (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
      );
      setSessions(sorted);
    } catch (err) {
      console.warn("[ChatHistorySidebar] getChatSessions error:", err.message);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial load: sync blob data then fetch sessions
  useEffect(() => { fetchSessions(true); }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Subsequent refreshes (after new messages saved): just fetch, no sync needed
  useEffect(() => {
    if (refreshTrigger > 0) fetchSessions(false);
  }, [refreshTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close 3-dot menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenu(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Actions ─────────────────────────────────────────────────────────────
  const handleDelete = (sessionId) => {
    setOpenMenu(null);
    setDeleteModal(sessionId);
  };

  const confirmDelete = async () => {
    const sessionId = deleteModal;
    setDeleteModal(null);
    try {
      await deleteChat(userId, sessionId);
      setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
      if (activeSession === sessionId) onNewChat();
    } catch (err) {
      console.error("Failed to delete:", err.message);
    }
  };

  const handleShare = async (sessionId) => {
    setOpenMenu(null);
    try {
      const { shareUrl } = await shareChat(userId, sessionId);
      await navigator.clipboard.writeText(shareUrl);
      alert("Share link copied to clipboard!");
    } catch (err) {
      alert("Failed to generate share link: " + err.message);
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────────────
  const formatTime = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now - d;
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  // ── Render ───────────────────────────────────────────────────────────────
  if (collapsed) {
    return (
      <div style={styles.collapsedBar}>
        <button style={styles.collapseBtn} title="Expand sidebar" onClick={() => setCollapsed(false)}>
          <ChevronRightIcon />
        </button>
        <button style={{ ...styles.newChatIconBtn, marginTop: "8px" }} title="New Chat" onClick={onNewChat}>
          <EditIcon />
        </button>
      </div>
    );
  }

  return (
    <div style={styles.sidebar}>
      {/* ── Delete confirmation modal ── */}
      {deleteModal && (
        <div style={modalStyles.overlay} onClick={() => setDeleteModal(null)}>
          <div style={modalStyles.box} onClick={(e) => e.stopPropagation()}>
            <div style={modalStyles.title}>Delete Chat</div>
            <div style={modalStyles.body}>Are you sure you want to delete this chat? This cannot be undone.</div>
            <div style={modalStyles.actions}>
              <button style={modalStyles.cancel} onClick={() => setDeleteModal(null)}>Cancel</button>
              <button style={modalStyles.confirm} onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.headerTitle}>Chat History</span>
        <div style={{ display: "flex", gap: "4px" }}>
          <button style={styles.iconBtn} title="New Chat" onClick={onNewChat}>
            <EditIcon />
          </button>
          <button style={styles.iconBtn} title="Collapse" onClick={() => setCollapsed(true)}>
            <ChevronLeftIcon />
          </button>
        </div>
      </div>

      {/* Session list */}
      <div style={styles.list} ref={menuRef}>
        {loading && <div style={styles.hint}>Loading…</div>}
        {!loading && sessions.length === 0 && (
          <div style={styles.hint}>No previous chats</div>
        )}
        {sessions.map((s) => {
          const isActive = s.sessionId === activeSession;
          return (
            <div
              key={s.sessionId}
              style={{
                ...styles.item,
                background: isActive ? "rgba(126,200,227,0.15)" : "transparent",
                borderLeft: isActive ? "3px solid #7ec8e3" : "3px solid transparent",
              }}
            >
              {/* Click area */}
              <button
                style={styles.itemBtn}
                onClick={() => onSelectChat(s)}
                title={s.title || s.sessionId}
              >
                <span style={styles.itemTitle}>{s.title || "Untitled chat"}</span>
                <span style={styles.itemTime}>{formatTime(s.updatedAt)}</span>
              </button>

              {/* 3-dot menu */}
              <div style={{ position: "relative", flexShrink: 0 }}>
                <button
                  style={styles.dotBtn}
                  title="Options"
                  onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === s.sessionId ? null : s.sessionId); }}
                >
                  ⋮
                </button>
                {openMenu === s.sessionId && (
                  <div style={styles.dropdown}>
                    <button style={styles.dropdownItem} onClick={() => handleShare(s.sessionId)}>
                      <ShareIcon /> Share
                    </button>
                    <button style={{ ...styles.dropdownItem, color: "#dc2626" }} onClick={() => handleDelete(s.sessionId)}>
                      <TrashIcon /> Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Inline styles ─────────────────────────────────────────────────────────────
const styles = {
  sidebar: {
    width: "240px",
    minWidth: "240px",
    background: "#1a2e3b",
    display: "flex",
    flexDirection: "column",
    borderRight: "1px solid rgba(255,255,255,0.08)",
    height: "100%",
    overflow: "hidden",
  },
  collapsedBar: {
    width: "44px",
    minWidth: "44px",
    background: "#1a2e3b",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "8px 0",
    //borderRight: "1px solid rgba(255,255,255,0.08)",
    borderRight: "1px solid rgba(224, 46, 46, 0.81)",
    height: "100%",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 10px 8px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: "12px",
    fontWeight: "600",
    color: "rgba(255,255,255,0.55)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  iconBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "rgba(255,255,255,0.45)",
    padding: "4px",
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 0.15s, color 0.15s",
  },
  newChatIconBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "rgba(255,255,255,0.55)",
    padding: "6px",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  collapseBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "rgba(255,255,255,0.45)",
    padding: "6px",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    flex: 1,
    overflowY: "auto",
    padding: "4px 0",
  },
  hint: {
    fontSize: "12px",
    color: "rgba(255,255,255,0.3)",
    padding: "12px 14px",
    textAlign: "center",
  },
  item: {
    display: "flex",
    alignItems: "center",
    padding: "0 6px 0 0",
    borderRadius: "6px",
    margin: "1px 6px",
    transition: "background 0.15s",
    cursor: "pointer",
  },
  itemBtn: {
    flex: 1,
    background: "none",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
    padding: "8px 6px 8px 10px",
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    minWidth: 0,
  },
  itemTitle: {
    fontSize: "13px",
    color: "rgba(255,255,255,0.85)",
    fontWeight: "500",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    display: "block",
    maxWidth: "160px",
  },
  itemTime: {
    fontSize: "10px",
    color: "rgba(255,255,255,0.35)",
  },
  dotBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "rgba(255,255,255,0.4)",
    fontSize: "16px",
    padding: "4px 6px",
    borderRadius: "4px",
    lineHeight: 1,
    transition: "color 0.15s",
  },
  dropdown: {
    position: "absolute",
    right: 0,
    top: "100%",
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
    zIndex: 200,
    minWidth: "130px",
    overflow: "hidden",
  },
  dropdownItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    width: "100%",
    padding: "9px 14px",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "13px",
    color: "#374151",
    textAlign: "left",
    transition: "background 0.1s",
  },
};

// ── Tiny SVG icons ────────────────────────────────────────────────────────────
const EditIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const ChevronLeftIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);
const ChevronRightIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);
const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);
const ShareIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
  </svg>
);

const modalStyles = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
  },
  box: {
    background: "#fff", borderRadius: "12px", padding: "24px",
    width: "320px", boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
  },
  title: { fontSize: "16px", fontWeight: "700", color: "#111827", marginBottom: "10px" },
  body:  { fontSize: "14px", color: "#6b7280", lineHeight: "1.5", marginBottom: "20px" },
  actions: { display: "flex", gap: "10px", justifyContent: "flex-end" },
  cancel: {
    padding: "8px 18px", borderRadius: "8px", border: "1.5px solid #e5e7eb",
    background: "#fff", color: "#374151", fontSize: "14px", cursor: "pointer", fontWeight: "500",
  },
  confirm: {
    padding: "8px 18px", borderRadius: "8px", border: "none",
    background: "#dc2626", color: "#fff", fontSize: "14px", cursor: "pointer", fontWeight: "600",
  },
};

export default ChatHistorySidebar;
