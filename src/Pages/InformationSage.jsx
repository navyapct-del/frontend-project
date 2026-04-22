import React, { useContext, useEffect, useState } from "react";
import ChatInfoSage from "../Data-Orch-Components/ChatInfoSage";
import SymphonyChatbot from "./SymphonyChatbot";
import ChatHistorySidebar from "../Data-Orch-Components/ChatComponents/ChatHistorySidebar";
import { AccountContext } from "../config/Account";
import { getChatSession } from "../config/AzureApi";
import Pool from "../UserPool";

function InformationSage() {
  const { userEmail } = useContext(AccountContext);
  const [showChatbot, setShowChatbot] = useState(false);

  // ── User identity: use context email, but also read directly from Cognito
  // in case context hasn't updated yet (async timing issue)
  const [userId, setUserId] = useState(() => {
    // Try to get email synchronously from the current Cognito session
    const user = Pool.getCurrentUser();
    if (user) {
      const session = user.getSignInUserSession();
      if (session) return session.getIdToken().payload.email || "";
    }
    return "";
  });

  useEffect(() => {
    if (userEmail) setUserId(userEmail);
  }, [userEmail]);

  // ── Session management ─────────────────────────────────────────────────────
  const [activeSessionId, setActiveSessionId]     = useState(() => crypto.randomUUID());
  const [initialMessages, setInitialMessages]     = useState(undefined);
  const [sidebarRefresh, setSidebarRefresh]       = useState(0);

  const handleNewChat = () => {
    setActiveSessionId(crypto.randomUUID());
    setInitialMessages(undefined);
  };

  const handleSelectChat = (session) => {
    setActiveSessionId(session.sessionId);
    // Fetch full message history from backend
    getChatSession(userId, session.sessionId)
      .then((data) => {
        const msgs = (data.messages || []).map((m) => ({
          id: m.timestamp || Math.random().toString(36),
          sender: m.role === "user" ? "user" : "bot",
          text: m.content,
          rawData: null,
        }));
        setInitialMessages(msgs.length > 0 ? msgs : undefined);
      })
      .catch(() => setInitialMessages(undefined));
  };

  const handleMessageSaved = () => {
    // Bump the refresh counter so the sidebar re-fetches the session list
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
