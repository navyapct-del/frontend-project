import React, { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { LoadingIcon, Lucide } from "@/base-components";

const BASE_URL = import.meta.env.VITE_AZURE_API_URL || "";

const ChatInfoSage = () => {
  const [sessionId] = useState(() => uuidv4());
  const [userInput, setUserInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isResponseLoading, setIsResponseLoading] = useState(false);
  const [imageId, setImageId] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Send query ──────────────────────────────────────────────────────────
  const handleSend = async () => {
    const q = userInput.trim();
    if (!q) return;

    setMessages((prev) => [...prev, { type: "user", text: q }]);
    setUserInput("");
    setIsResponseLoading(true);

    try {
      const res = await fetch(`${BASE_URL}/agent/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q,
          session_id: sessionId,
          ...(imageId ? { image_id: imageId } : {}),
        }),
      });

      if (!res.ok) {
        setMessages((prev) => [...prev, {
          type: "system",
          text: `Error ${res.status} — please try again.`,
        }]);
        return;
      }

      const data = await res.json();
      setMessages((prev) => [...prev, buildMessage(data)]);
    } catch (e) {
      setMessages((prev) => [...prev, {
        type: "system",
        text: "Could not reach the server. Check your connection.",
      }]);
    } finally {
      setIsResponseLoading(false);
    }
  };

  // ── Upload image (optional) ─────────────────────────────────────────────
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const valid = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!valid.includes(file.type)) {
      setUploadError("Only JPEG, PNG, WEBP or GIF allowed.");
      return;
    }

    setUploadError("");
    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("filename", file.name);
    formData.append("temp", "true");
    formData.append("session_id", sessionId);

    try {
      const res = await fetch(`${BASE_URL}/upload`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setUploadError(err.error || "Upload failed.");
        return;
      }
      const data = await res.json();
      setImageId(data.id);
      setImageUrl(URL.createObjectURL(file));
      setShowUpload(false);
      setMessages((prev) => [...prev, {
        type: "system",
        text: `Image "${file.name}" uploaded. You can now ask questions about it.`,
      }]);
    } catch {
      setUploadError("Upload failed. Try again.");
    } finally {
      setIsUploading(false);
    }
  };

  // ── Build message from structured response ──────────────────────────────
  const buildMessage = (data) => {
    const type = data.type || "text";
    if (type === "image") {
      return { type: "system", responseType: "image", images: data.data || [], imageSource: data.source || "" };
    }
    if (type === "chart") {
      return { type: "system", responseType: "chart", chartData: data.data };
    }
    if (type === "table") {
      return { type: "system", responseType: "table", tableData: data.data };
    }
    const raw = data.data;
    const text = typeof raw === "string"
      ? raw
      : raw?.answer || raw?.text || JSON.stringify(raw);
    return { type: "system", text };
  };

  const handleReset = () => {
    setMessages([]);
    setUserInput("");
    setImageId(null);
    setImageUrl("");
    setShowUpload(false);
    setUploadError("");
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="relative">
      <div className="fixed right-8 md:right-12 bottom-24 w-[300px] md:w-[370px] bg-white rounded-lg shadow-lg">

        {/* Header */}
        <header className="flex items-center h-12 px-3 bg-cyan-900 rounded-t-lg">
          <Lucide icon="Bot" className="w-5 h-5 mr-2 text-white" />
          <h2 className="text-[15px] font-medium text-white flex-1">Ask The Sage</h2>
          {imageId && (
            <span className="text-xs text-cyan-200 flex items-center gap-1">
              <Lucide icon="Image" className="w-3 h-3" /> Image ready
            </span>
          )}
        </header>

        {/* Messages */}
        <div className="h-80 overflow-y-auto p-3 space-y-2 bg-gray-50">
          {messages.length === 0 && (
            <div className="flex items-start gap-2 mt-2">
              <Lucide icon="Bot" className="w-5 h-5 text-cyan-900 mt-1 shrink-0" />
              <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-cyan-900">
                Hi! Search for any image or upload an image to query it.
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.type === "user" ? "justify-end" : "justify-start items-start gap-2"}`}>
              {msg.type !== "user" && (
                <Lucide icon="Bot" className="w-5 h-5 text-cyan-900 mt-1 shrink-0" />
              )}

              {msg.type === "user" ? (
                <div className="bg-cyan-900 text-white text-sm rounded-lg px-3 py-2 max-w-[85%]">
                  {msg.text}
                </div>

              ) : msg.responseType === "image" ? (
                <div className="bg-white border border-gray-200 rounded-lg p-2 max-w-[85%]">
                  {(msg.images || []).length === 0 ? (
                    <p className="text-sm text-gray-500">No images found.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {msg.images.map((img, j) => (
                        <a key={j} href={img.url} target="_blank" rel="noopener noreferrer"
                          className="block">
                          <img src={img.thumbnail} alt={img.title || img.name}
                            className="w-full max-h-48 object-cover rounded hover:opacity-80" />
                          {img.title && (
                            <p className="text-xs text-gray-600 mt-1 truncate" title={img.title}>
                              {img.title}
                            </p>
                          )}
                        </a>
                      ))}
                    </div>
                  )}
                </div>

              ) : msg.responseType === "chart" || msg.responseType === "table" ? (
                <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-cyan-900 max-w-[85%]">
                  <pre className="text-xs whitespace-pre-wrap overflow-auto max-h-40">
                    {JSON.stringify(msg.chartData || msg.tableData, null, 2)}
                  </pre>
                </div>

              ) : (
                <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 max-w-[85%]">
                  {msg.text}
                </div>
              )}
            </div>
          ))}

          {isResponseLoading && (
            <div className="flex items-start gap-2">
              <Lucide icon="Bot" className="w-5 h-5 text-cyan-900 mt-1 shrink-0" />
              <div className="bg-white border border-gray-200 rounded-lg px-3 py-2">
                <LoadingIcon icon="three-dots" className="w-8 h-5" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Image preview strip */}
        {imageUrl && (
          <div className="flex items-center gap-2 px-3 py-1 bg-cyan-50 border-t border-cyan-100">
            <img src={imageUrl} alt="uploaded" className="h-8 w-8 object-cover rounded" />
            <span className="text-xs text-cyan-800 flex-1 truncate">Image attached</span>
            <button onClick={() => { setImageId(null); setImageUrl(""); }}
              className="text-xs text-red-400 hover:text-red-600">✕</button>
          </div>
        )}

        {/* Upload panel (shown when paperclip clicked) */}
        {showUpload && (
          <div className="px-3 py-2 bg-gray-50 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Upload an image to ask questions about it:</p>
            <input type="file" accept=".jpg,.jpeg,.png,.webp,.gif"
              onChange={handleFileChange}
              className="text-xs w-full border border-gray-300 rounded p-1" />
            {uploadError && <p className="text-xs text-red-500 mt-1">{uploadError}</p>}
            {isUploading && <p className="text-xs text-cyan-600 mt-1">Uploading...</p>}
          </div>
        )}

        {/* Input bar */}
        <div className="flex items-center gap-1 p-2 border-t border-gray-200">
          {/* Paperclip — toggle image upload */}
          <button onClick={() => setShowUpload((v) => !v)}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500"
            title="Attach image">
            <Lucide icon="Paperclip" className="w-4 h-4" />
          </button>

          {/* Text input */}
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask anything..."
            className="flex-1 text-sm border border-gray-300 rounded-full px-3 py-1.5 focus:outline-none focus:border-cyan-500"
          />

          {/* Send */}
          <button onClick={handleSend} disabled={!userInput.trim() || isResponseLoading}
            className="p-1.5 rounded-full bg-cyan-900 hover:bg-cyan-700 disabled:opacity-40">
            <Lucide icon="Send" className="w-4 h-4 text-white" />
          </button>

          {/* Reset */}
          <button onClick={handleReset}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400"
            title="Clear chat">
            <Lucide icon="RotateCcw" className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};

export default ChatInfoSage;
