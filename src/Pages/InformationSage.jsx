import React, { useEffect, useState } from "react";
import ChatInfoSage from "../Data-Orch-Components/ChatInfoSage";
import SymphonyChatbot from "./SymphonyChatbot";
import ChatHistorySidebar from "../Data-Orch-Components/ChatComponents/ChatHistorySidebar";
import { getChatSession } from "../config/AzureApi";
import { useChatStore } from "../stores/chatStore";
import { useUserEmail } from "../utils/useUserEmail";

const ACTIVE_SESSION_KEY = "info_sage_active_session";

// Parse JSON from stored message content to restore rawData (charts/tables)
function tryParseJSON(str) {
  if (!str || typeof str !== "string") return null;
  const idx = str.indexOf("{");
  if (idx === -1) return null;
  try { return JSON.parse(str.slice(idx)); } catch { return null; }
}

function InformationSage() {
  const userEmail = useUserEmail();
  const userId = userEmail;
  const { clearMessages } = useChatStore();
  const [showChatbot, setShowChatbot] = useState(false);

  // ── Session management ─────────────────────────────────────────────────────
  // Persist activeSessionId in localStorage so the same conversation is resumed
  // after a page refresh instead of creating a new one every time.
  const [activeSessionId, setActiveSessionId] = useState(() => {
    const stored = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (stored) {
      console.log("[InformationSage] restored sessionId:", stored);
      return stored;
    }
    const newId = crypto.randomUUID();
    localStorage.setItem(ACTIVE_SESSION_KEY, newId);
    console.log("[InformationSage] new sessionId:", newId);
    return newId;
  });

  const [initialMessages, setInitialMessages] = useState(undefined);
  const [sidebarRefresh, setSidebarRefresh]   = useState(0);

  const handleNewChat = () => {
    clearMessages();
    const newId = crypto.randomUUID();
    localStorage.setItem(ACTIVE_SESSION_KEY, newId);
    console.log("[InformationSage] new chat, sessionId:", newId);
    setActiveSessionId(newId);
    setInitialMessages(undefined);
  };

  const handleSelectChat = (session) => {
    clearMessages();
    localStorage.setItem(ACTIVE_SESSION_KEY, session.sessionId);
    console.log("[InformationSage] selected sessionId:", session.sessionId);
    setActiveSessionId(session.sessionId);
    getChatSession(userId, session.sessionId)
      .then((data) => {
        const msgs = (data.messages || []).map((m) => {
          const rawData = m.role === "assistant" ? tryParseJSON(m.content) : null;
          const isRich = rawData && rawData.type && rawData.type !== "text";
          return {
            id: m.timestamp || Math.random().toString(36),
            sender: m.role === "user" ? "user" : "bot",
            text: isRich ? (rawData.answer || m.content) : m.content,
            rawData: isRich ? rawData : null,
            originalQuery: isRich ? (rawData.query || "") : undefined,
          };
        });
        setInitialMessages(msgs.length > 0 ? msgs : undefined);
      })
      .catch(() => setInitialMessages(undefined));
  };

  const handleMessageSaved = () => {
    setSidebarRefresh((n) => n + 1);
  };

  const handleToggleChatbot = () => setShowChatbot(!showChatbot);

  return (
    <div>
      {/* ── Main layout: sidebar + chatbot ── */}
      <div style={{ display: "flex", height: "calc(100vh - 120px)", overflow: "hidden", borderRadius: "12px", border: "1px solid #e5e7eb", background: "#fff" }}>
        {/* Left sidebar */}
        <ChatHistorySidebar
          userId={userId}
          activeSession={activeSessionId}
          onNewChat={handleNewChat}
          onSelectChat={handleSelectChat}
          refreshTrigger={sidebarRefresh}
        />

        {/* Chatbot area */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <SymphonyChatbot
            sessionId={activeSessionId}
            userId={userId}
            initialMessages={initialMessages}
            onMessageSaved={handleMessageSaved}
          />
        </div>
      </div>

      {/* ── Existing floating ChatInfoSage button (unchanged) ── */}
      <div className="bg-gray-100 flex flex-col justify-end">
        <button
          onClick={handleToggleChatbot}
          className={`fixed bottom-8 right-8 md:right-10 p-0 w-14 h-14 flex items-center justify-center rounded-full bg-cyan-900 transition-all duration-200 ease-in-out shadow-lg focus:outline-none ${
            showChatbot ? "animate-pulse" : ""
          } ${showChatbot ? "transform rotate-90" : ""}`}
          style={{
            borderBottom: "1px dotted black",
            animation: showChatbot ? "none" : "pulse 1s infinite",
          }}
        >
          <span className={`absolute transition-opacity duration-300 ease-in-out ${showChatbot ? "opacity-0" : "opacity-100"}`}>
            <img
              src="https://tv9-raw-datalake.s3.ap-south-1.amazonaws.com/front-end-chatbot-code/icons8-chatbot-50.png"
              alt="Chatbot"
              className="w-8 h-auto mt-1.5"
            />
          </span>
          <span className={`absolute transition-opacity duration-300 ease-in-out ${showChatbot ? "opacity-100" : "opacity-0"}`}>
            <img
              src="https://tv9-raw-datalake.s3.ap-south-1.amazonaws.com/front-end-chatbot-code/icons8-cross-50.png"
              alt="Close"
              className="w-8 h-auto mt-1.5"
            />
          </span>
        </button>

        {showChatbot && <ChatInfoSage />}
      </div>

      <style>{`
        @keyframes pulse {
          0%   { box-shadow: 0 0 0 0 rgba(20, 80, 210, 0.4); }
          70%  { box-shadow: 0 0 0 10px rgba(20, 80, 210, 0); }
          100% { box-shadow: 0 0 0 0 rgba(20, 80, 210, 0); }
        }
      `}</style>
    </div>
  );
}

export default InformationSage;
