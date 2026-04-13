import { create } from "zustand";

// ── Helpers ──────────────────────────────────────────────────────────────────

const SESSION_KEY_MESSAGES = "chat_messages";
const SESSION_KEY_HISTORY  = "chat_history";
const SESSION_KEY_TOPIC    = "chat_last_topic";

const loadFromSession = (key, fallback) => {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const saveToSession = (key, value) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // sessionStorage quota exceeded — silently ignore
  }
};

// ── Store ─────────────────────────────────────────────────────────────────────

export const useChatStore = create((set, get) => ({
  messages:    loadFromSession(SESSION_KEY_MESSAGES, []),
  chatHistory: loadFromSession(SESSION_KEY_HISTORY, []),
  lastTopic:   sessionStorage.getItem(SESSION_KEY_TOPIC) || "",

  setMessages: (msgs) => {
    saveToSession(SESSION_KEY_MESSAGES, msgs);
    set({ messages: msgs });
  },

  addMessage: (msg) => {
    const updated = [...get().messages, msg];
    saveToSession(SESSION_KEY_MESSAGES, updated);
    set({ messages: updated });
  },

  setChatHistory: (history) => {
    saveToSession(SESSION_KEY_HISTORY, history);
    set({ chatHistory: history });
  },

  setLastTopic: (topic) => {
    try { sessionStorage.setItem(SESSION_KEY_TOPIC, topic); } catch {}
    set({ lastTopic: topic });
  },

  clearMessages: () => {
    sessionStorage.removeItem(SESSION_KEY_MESSAGES);
    sessionStorage.removeItem(SESSION_KEY_HISTORY);
    sessionStorage.removeItem(SESSION_KEY_TOPIC);
    set({ messages: [], chatHistory: [], lastTopic: "" });
  },
}));
