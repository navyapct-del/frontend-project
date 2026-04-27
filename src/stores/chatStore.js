import { create } from "zustand";

const LS_KEY_MESSAGES = "chat_messages";
const LS_KEY_HISTORY  = "chat_history";
const LS_KEY_TOPIC    = "chat_last_topic";

const load = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const save = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
};

export const useChatStore = create((set, get) => ({
  messages:    load(LS_KEY_MESSAGES, []),
  chatHistory: load(LS_KEY_HISTORY, []),
  lastTopic:   localStorage.getItem(LS_KEY_TOPIC) || "",

  setMessages: (msgs) => {
    save(LS_KEY_MESSAGES, msgs);
    set({ messages: msgs });
  },

  addMessage: (msg) => {
    const updated = [...get().messages, msg];
    save(LS_KEY_MESSAGES, updated);
    set({ messages: updated });
  },

  setChatHistory: (history) => {
    save(LS_KEY_HISTORY, history);
    set({ chatHistory: history });
  },

  setLastTopic: (topic) => {
    try { localStorage.setItem(LS_KEY_TOPIC, topic); } catch {}
    set({ lastTopic: topic });
  },

  clearMessages: () => {
    localStorage.removeItem(LS_KEY_MESSAGES);
    localStorage.removeItem(LS_KEY_HISTORY);
    localStorage.removeItem(LS_KEY_TOPIC);
    set({ messages: [], chatHistory: [], lastTopic: "" });
  },
}));
