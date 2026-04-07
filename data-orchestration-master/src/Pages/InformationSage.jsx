import React, { useState } from "react";
import ChatInfoSage from "../Data-Orch-Components/ChatInfoSage";
import SymphonyChatbot from "./SymphonyChatbot";

function InformationSage() {
  const [showChatbot, setShowChatbot] = useState(false);

  const handleToggleChatbot = () => {
    setShowChatbot(!showChatbot);
  };

  return (
    <div>
      <SymphonyChatbot />
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
          <span
            className={`absolute transition-opacity duration-300 ease-in-out ${
              showChatbot ? "opacity-0" : "opacity-100"
            }`}
          >
            <img
              src="https://tv9-raw-datalake.s3.ap-south-1.amazonaws.com/front-end-chatbot-code/icons8-chatbot-50.png"
              alt="Chatbot"
              className="w-8 h-auto mt-1.5"
            />
          </span>
          <span
            className={`absolute transition-opacity duration-300 ease-in-out ${
              showChatbot ? "opacity-100" : "opacity-0"
            }`}
          >
            <img
              src="https://tv9-raw-datalake.s3.ap-south-1.amazonaws.com/front-end-chatbot-code/icons8-cross-50.png"
              alt="Close"
              className="w-8 h-auto mt-1.5"
            />
          </span>
        </button>

        {showChatbot && <ChatInfoSage />}
      </div>

      {/* Adding the keyframes animation via inline styles */}
      <style>{`
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(20, 80, 210, 0.4);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(20, 80, 210, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(20, 80, 210, 0);
          }
        }
      `}</style>
    </div>
  );
}

export default InformationSage;
