import React, { useContext, useState } from "react";
import { AccountContext } from "../components/Account";
import downloadFile from "../config/downloadfile";
import { LoadingIcon } from "@/base-components";

const Chatbox = () => {
  const [userInput, setUserInput] = useState("");
  const { userdetails, userEmail } = useContext(AccountContext);

  const [chatData, setChatData] = useState([]);
  const [loading, setLoading] = useState(false); // Track loading state
  const [chatboxloader, setChatBoxLoader] = useState(false);

  const handleUserInput = (e) => {
    setUserInput(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (userInput.trim() !== "") {
      setLoading(true); // Set loading state to true
      setChatBoxLoader(true);
      const newChatData = [
        ...chatData,
        {
          id: chatData.length + 1,
          sender: "user",
          message: userInput,
          question: true,
        },
      ];
      setChatData(newChatData);
      setUserInput("");

      fetch(
        "https://vkij0y39nl.execute-api.ap-south-1.amazonaws.com/Dev/develoment",
        {
          method: "post",

          body: JSON.stringify({
            actionone: "kendra_query",
            query: userInput,
            email: userEmail,
            comprehend: [],
            manual_tags: [],
            filter: false,
          }),
        }
      )
        .then((data) => data.json())
        .then((res) => {
          console.log("Res ", res);
          if (!res) {
            // If response is null, display message
            let noResponseMessage = {
              message:
                "Sorry, we're currently experiencing issues fetching data. Please try again later.",
              noResponseMessage: true,
            };
            console.log("No response message", noResponseMessage);
            const newBotChatData = [...newChatData, noResponseMessage];
            setChatData(newBotChatData);
            return;
          }
          setChatData(res);
          //   res = chatresponse; //coment line when api call
          let systemGeneratedResponse = {
            message:
              'Here are the list of files related to :"' + userInput + '",',
            systemGeneratedResponse: true,
          };
          let summaryData = {
            message: res?.llm_result,
            summary: true,
          };
          const newBotChatData = [
            ...newChatData,
            summaryData,
            systemGeneratedResponse,
            noResponseMessage,
            res,
          ];
          console.log("NEW BO", newBotChatData);
          setChatData(newBotChatData);
        })

        .catch((err) => {
          console.log("error", err);
        })
        .finally(() => {
          setLoading(false);
          setChatBoxLoader(false); // Set loading state to false when request is complete
        });
    }
  };

  const handleReload = () => {
    // Implement reload functionality here
    // For example, you can reset chat data and clear input
    setChatData([]);
    setUserInput("");
  };

  return (
    <div className="chatbox-container overflow-auto max-h-96">
      <div className="chatbox">
        {/* Show loader if loading state is true */}
        {chatData?.map((chatItem, index) => {
          console.log("Chat Item:", chatItem);
          console.log("noResponseMessage:", chatItem?.noResponseMessage); // Add this console log

          if (chatItem?.question) {
            return (
              <div
                className="m-2 bg-primary text-white p-2 rounded-md"
                key={index}
              >
                {chatItem?.message}
              </div>
            );
          } else if (chatItem?.summary) {
            return (
              <div
                className="m-2 bg-secondary text-primary p-2 rounded-md"
                key={index}
              >
                {chatItem?.message}
              </div>
            );
          } else if (chatItem?.systemGeneratedResponse) {
            return (
              <span className="mx-auto px-5 font-bold" key={index}>
                {chatItem?.message}
              </span>
            );
          } else if (chatItem?.noResponseMessage) {
            console.log("Rendering noResponseMessage:", chatItem);
            return (
              <span
                className="mx-auto px-5 font-bold text-red-500 text-center"
                key={index}
              >
                {chatItem?.message}
              </span>
            );
          } else {
            return chatItem?.res?.ResultItems?.map((result, index) => {
              const fileName = result?.DocumentTitle?.Text;
              const maxLength = 10; // Maximum length for truncated file name
              const truncatedFileName = fileName
                ? fileName.length > maxLength
                  ? fileName.slice(0, maxLength) + "..."
                  : fileName
                : "";

              return (
                <div
                  className="m-2 bg-secondary text-primary p-2 rounded-md cursor-pointer relative"
                  key={index}
                  onClick={() => {
                    downloadFile(result?.DocumentURI);
                  }}
                  style={{ position: "relative" }}
                >
                  <span
                    className="overflow-hidden whitespace-nowrap w-full block"
                    title={fileName} // Set initial title attribute with full fileName
                    onMouseEnter={(e) => {
                      e.target.title = fileName; // Set full fileName as title on hover
                    }}
                  >
                    {truncatedFileName}
                  </span>
                </div>
              );
            });
          }
        })}
        {chatboxloader && (
          <div className="flex justify-start">
            <div className="bg-gray-200 py-2 px-4 rounded-lg my-3">
              <LoadingIcon icon="three-dots" className="w-8 h-8" />
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mt-4 flex items-center overflow-auto max-h-96 py-5">
          <input
            type="text"
            placeholder="Type your question..."
            value={userInput}
            className="border border-gray-300 rounded-full py-2 px-4 w-full focus:outline-none focus:border-gray-300 focus:ring-transparent text-sm"
            onChange={handleUserInput}
          />
          <button
            type="submit"
            className="btn btn-primary text-white ml-2 py-2 px-4 rounded-full"
          >
            Send
          </button>
          <button
            type="submit"
            onClick={handleReload}
            className="btn btn-danger text-white ml-2 py-2 px-4 rounded-full"
          >
            Reset
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chatbox;
