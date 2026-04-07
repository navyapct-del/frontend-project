import React, { useEffect, useRef, useState } from "react";
import Chart from "chart.js/auto";

const Modal = ({ isOpen, content, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <pre>{content}</pre>
        <button className="modal-close" onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

const SymphonyChatbot = () => {
  const generateUniqueId = () => `id-${Math.random().toString(36).substr(2, 9)}`;

  const [messages, setMessages] = useState([{
    text: "Welcome to the Knowledge Sathi, it can give you information on ITR data, How can I help you today?",
    sender: "bot", liked: null, isWelcomeMessage: true, id: generateUniqueId(),
  }]);
  const [chartData, setChartData]   = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping]     = useState(false);
  const [query, setQuery]           = useState("");
  const [script, setScript]         = useState("");

  // ── Voice state ──
  const [isListening, setIsListening]   = useState(false);
  const [voiceSupported]                = useState(() => "webkitSpeechRecognition" in window || "SpeechRecognition" in window);
  const recognitionRef                  = useRef(null);

  const chatEndRef = useRef(null);

  // ── Setup speech recognition ──
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setNewMessage(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend   = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const toggleVoice = () => {
    if (isListening) stopListening();
    else startListening();
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();
    if (newMessage.trim() === "") return;

    const messageId = generateUniqueId();
    setMessages([...messages, { text: newMessage, sender: "user", liked: null, id: messageId }]);
    const userMessage = newMessage;
    setNewMessage("");
    setIsTyping(true);

    try {
      const response = await fetch(
        "https://5l2cp28e8i.execute-api.ap-south-1.amazonaws.com/v1/lambda_invoke",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: userMessage, UID: messageId, demo: "knowledgesathi" }),
        }
      );

      const data = await response.json();
      setQuery(data.query || "");
      setScript(data.text || "");

      const DynamicChart = ({ chartData, canvasId }) => {
        const canvasRef = useRef(null);
        useEffect(() => {
          if (chartData) {
            const script = document.createElement("script");
            script.type = "text/javascript";
            script.text = chartData;
            document.body.appendChild(script);
            return () => { document.body.removeChild(script); };
          }
        }, [chartData]);
        return <div className="chart-container"><canvas ref={canvasRef} id={canvasId} width="400" height="400" /></div>;
      };

      let botMessage;
      if (data.error) {
        botMessage = data.error;
      } else if (data.flag === "table" && data.body) {
        const tableData = JSON.parse(data.body);
        botMessage = (
          <table className="table">
            <thead><tr>{Object.keys(tableData[0]).map((k) => <th key={k}>{k}</th>)}</tr></thead>
            <tbody>{tableData.map((row, i) => <tr key={i}>{Object.values(row).map((v, j) => <td key={j}>{v}</td>)}</tr>)}</tbody>
          </table>
        );
      } else if (data.flag === "chart" && data.text) {
        const scriptContent = data.text.replace(/<\/?[sS]cript>/g, "");
        const canvasIdMatch = scriptContent.match(/new Chart\("(.*?)"/);
        const canvasId = canvasIdMatch ? canvasIdMatch[1] : "defaultCanvasId";
        setChartData({ canvasId, scriptContent });
        botMessage = scriptContent ? <DynamicChart chartData={scriptContent} canvasId={canvasId} /> : <p>Loading chart...</p>;
      } else {
        botMessage = data.text || "Sorry, something went wrong. Please try again.";
      }

      setMessages((prev) => [...prev, {
        text: botMessage, sender: "bot", liked: null,
        isWelcomeMessage: false, id: messageId,
        query: data.query || "", script: data.text || "",
      }]);
    } catch {
      setMessages((prev) => [...prev, {
        text: "Sorry, something went wrong. Please try again.",
        sender: "bot", liked: null, isWelcomeMessage: false, id: messageId,
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendFeedback = async (messageId, feedbackType) => {
    const payload = { UID: messageId, Like: feedbackType === "like", Dislike: feedbackType === "dislike" };
    const response = await fetch("https://5l2cp28e8i.execute-api.ap-south-1.amazonaws.com/v1/lambda_invoke", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return response.json();
  };

  return (
    <div className="chat-window">
      <div className="chat-messages">
        {messages.map((message, index) => (
          <Message
            key={index}
            message={message}
            index={index}
            messages={messages}
            setMessages={setMessages}
          />
        ))}
        {isTyping && (
          <div className="chat-message bot">
            <span>Thinking...</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* ── INPUT BAR ── */}
      <form className="chat-input" onSubmit={handleSendMessage} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", borderTop: "1px solid #e5e7eb", background: "#fff" }}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          style={{ flex: 1, padding: "10px 14px", border: "1.5px solid #e5e7eb", borderRadius: "8px", fontSize: "14px", outline: "none", background: "#f9fafb" }}
        />

        {/* Microphone button */}
        {voiceSupported && (
          <button
            type="button"
            onClick={toggleVoice}
            title={isListening ? "Stop listening" : "Speak your message"}
            style={{
              width: "42px", height: "42px", borderRadius: "50%",
              border: "none", cursor: "pointer", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: isListening ? "#0d3347" : "#e8f4f8",
              transition: "all 0.2s",
              boxShadow: isListening ? "0 0 0 4px rgba(13,51,71,0.2)" : "none",
              animation: isListening ? "pulse-ring 1.2s infinite" : "none",
            }}
          >
            {isListening ? (
              /* Animated mic (listening) */
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7ec8e3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            ) : (
              /* Mic off */
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d3347" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            )}
          </button>
        )}

        {/* Send button */}
        <button
          type="submit"
          style={{
            padding: "0 20px", height: "42px", borderRadius: "8px",
            background: "#c0605a", color: "#fff", border: "none",
            fontSize: "14px", fontWeight: "600", cursor: "pointer",
            flexShrink: 0,
          }}
        >
          Send
        </button>
      </form>

      {/* Pulse animation for listening state */}
      <style>{`
        @keyframes pulse-ring {
          0%   { box-shadow: 0 0 0 0   rgba(13,51,71,0.35); }
          70%  { box-shadow: 0 0 0 10px rgba(13,51,71,0); }
          100% { box-shadow: 0 0 0 0   rgba(13,51,71,0); }
        }
      `}</style>
    </div>
  );
};

export default SymphonyChatbot;

/* ── Message component (unchanged logic) ── */
const Message = ({ message, index, messages, setMessages }) => {
  const [modalData, setModalData] = useState({ isOpen: false, content: "" });

  const sendFeedback = async (messageId, feedbackType) => {
    const payload = { UID: messageId, Like: feedbackType === "like", Dislike: feedbackType === "dislike" };
    const res = await fetch("https://5l2cp28e8i.execute-api.ap-south-1.amazonaws.com/v1/lambda_invoke", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    return res.json();
  };

  const handleLike = async () => {
    try {
      const response = await sendFeedback(message.id, "like");
      setMessages((prev) => prev.map((m, i) => i === index ? { ...m, liked: true, feedbackResponse: response } : m));
    } catch (e) { console.error(e); }
  };

  const handleDislike = async () => {
    try {
      const response = await sendFeedback(message.id, "dislike");
      setMessages((prev) => prev.map((m, i) => i === index ? { ...m, liked: false, feedbackResponse: response } : m));
    } catch (e) { console.error(e); }
  };

  return (
    <>
      <div className={`chat-message ${message.sender}`}>
        <div className="message-content">{message.text}</div>
      </div>
      {message.sender === "bot" && !message.isWelcomeMessage && (
        <>
          <div className="feedback-icons">
            <span className={`like-icon ${message.liked === true ? "liked" : ""}`} onClick={handleLike}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-thumbs-up cursor-pointer h-4 w-4 text-gray-500">
                <path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/>
              </svg>
            </span>
            <span className={`dislike-icon ${message.liked === false ? "disliked" : ""}`} onClick={handleDislike}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-thumbs-down cursor-pointer h-4 w-4 text-gray-500">
                <path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/>
              </svg>
            </span>
            <div className="modal-container">
              <button className="button button4 show-query-button" onClick={() => setModalData({ isOpen: !modalData.isOpen || modalData.content !== message.query, content: message.query })}>Show Query</button>
              <button className="button button4 show-script-button" onClick={() => setModalData({ isOpen: !modalData.isOpen || modalData.content !== message.script, content: message.script })}>Show Script</button>
            </div>
          </div>
          <Modal isOpen={modalData.isOpen} content={modalData.content} onClose={() => setModalData({ isOpen: false, content: "" })} />
        </>
      )}
    </>
  );
};
