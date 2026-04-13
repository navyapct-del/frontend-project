import React, { useState } from "react";

import { LoadingIcon, Lucide } from "@/base-components";

const bucketName = "data-symphony-upload-v1";

const ChatInfoSage = () => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isFileUploaded, setIsFileUploaded] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(true);
  const [hideFileInput, sethideFileInput] = useState(false);
  const [showTextInput, setShowTextInput] = useState(true);
  const [isResponseLoading, setIsResponseLoading] = useState(false);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      const validTypes = ["image/jpeg", "image/png"];
      if (validTypes.includes(selectedFile.type)) {
        setFile(selectedFile);
        setError("");
      } else {
        setError("Invalid file type. Please select a JPEG or PNG image.");
        setFile(null);
      }
    }
  };

  const handleFileUpload = () => {
    if (!file) return;

    const params = {
      Bucket: bucketName,
      Key: file.name,
      Body: file,
      ContentType: file.type,
    };

    fetch(
      "https://689xmudpbk.execute-api.ap-south-1.amazonaws.com/dev/",
      // "https://vaoxonpvci.execute-api.ap-south-1.amazonaws.com/dev",
      {
        method: "POST",
        body: JSON.stringify({
          key: file.name,
        }),
      }
    )
      .then((response) => response.json())
      .then((presignedUrl) => {
        fetch(presignedUrl, {
          method: "PUT",
          body: file,
        })
          .then((response) => {
            let fileLocation =
              "https://data-symphony-upload-v1.s3.ap-south-1.amazonaws.com/" +
              file.name;
            console.log("Image URL:", fileLocation);
            setImageUrl(fileLocation);
            setIsFileUploaded(true);
            setShowWelcomeMessage(false);
            setShowTextInput(true);
            sethideFileInput(false);
            setMessages([]);
          })
          .catch((error) => {
            console.error("Error uploading file:", error);
            setError("Error uploading file. Please try again.");
          });
      })
      .catch((error) => {
        console.error("Error uploading file:", error);
        setError("Error uploading file. Please try again.");
      });
  };

  const handleSendPrompt = () => {
    if (!userInput || !imageUrl) return;
    setMessages((prevMessages) => [
      ...prevMessages,
      { type: "user", text: userInput },
    ]);
    setUserInput("");
    setIsResponseLoading(true);

    // const removeSpaces = (url) => url.replace(/\s+/g, '');

    const s3Url = `s3://${bucketName}/${file.name}`;

    const payload = {
      prompt: userInput,
      s3_key: s3Url,
      action: "prompt",
    };

    fetch(
      "https://z5y127dmhh.execute-api.ap-south-1.amazonaws.com/Dev/data_symphony",
      // "https://439e29xijf.execute-api.ap-south-1.amazonaws.com/Dev/data_symphony",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    )
      .then((response) => response.json())
      .then((data) => {
        setIsResponseLoading(false);
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            type: "system",
            text: data.Response,
            uid: data.UID,
          },
        ]);
      })
      .catch((error) => {
        setIsResponseLoading(false);
        console.error("Error sending prompt to backend:", error);
        setMessages((prevMessages) => [
          ...prevMessages,
          { type: "system", text: "Error sending prompt to backend." },
        ]);
      });
  };

  const handlePaperclipClick = () => {
    sethideFileInput(true);
    setShowTextInput(false);
  };

  const handleThumbsUp = (index) => {
    const uid = messages[index]?.uid;
    sendThumbsResponse(index, true, false, uid);
  };

  const handleThumbsDown = (index) => {
    const uid = messages[index]?.uid;
    sendThumbsResponse(index, false, true, uid);
  };

  const sendThumbsResponse = (index, like, dislike, uid) => {
    const payload = {
      action: "feedback",
      UID: uid,
      Like: like,
      Dislike: dislike,
    };

    fetch(
      "https://z5y127dmhh.execute-api.ap-south-1.amazonaws.com/Dev/data_symphony",
      // "https://439e29xijf.execute-api.ap-south-1.amazonaws.com/Dev/data_symphony",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    )
      .then((response) => response.json())
      .then((data) => {
        const updatedMessages = [...messages];
        updatedMessages[index] = {
          ...updatedMessages[index],
          liked: like,
          disliked: dislike,
        };
        setMessages(updatedMessages);
      })
      .catch((error) => {
        console.error("Error sending reaction to backend:", error);
      });
  };

  return (
    <div className="relative">
      <div className="fixed right-8 md:right-12 bottom-24 w-[280px] md:w-[350px] bg-white rounded-lg shadow-lg opacity-100 scale-100 transition-all duration-100">
        <header className="relative flex items-center justify-start h-12 p-2 bg-cyan-900 rounded-t-lg shadow-md">
          <Lucide
            icon="Bot"
            className="w-5 h-5 mr-2 text-white xl:w-6 xl:h-6 lg:w-8 lg:h-8 md:w-6 md:h-6"
          />
          <h2 className="text-[15px] font-medium text-white">Ask The Sage</h2>
        </header>

        <ul className="p-4">
          <div className="flex justify-end">
            {showWelcomeMessage && (
              <>
                <Lucide
                  icon="Bot"
                  className="w-5 h-5 mr-2 text-cyan-900 xl:w-6 xl:h-12 lg:w-8 lg:h-8 md:w-6 md:h-6"
                />
                <li className="flex justify-end p-2 mt-2 bg-gray-100 rounded-lg">
                  <span className="text-cyan-900">
                    Welcome! Please upload an image to start.
                  </span>
                </li>
              </>
            )}
          </div>
          {console.log("image url", imageUrl)}
          <div className="flex justify-center">
            {imageUrl && (
              <li className="flex justify-center p-2 mt-2 bg-gray-100 rounded-lg">
                <img
                  src={imageUrl}
                  alt="Uploaded"
                  className="object-cover w-auto h-24 p-1 rounded-lg"
                />
              </li>
            )}
          </div>
          <div
            className={`flex flex-col h-72 overflow-y-auto p-4 mt-4 mb-1 rounded-lg ${
              messages.length > 0 ? "bg-gray-100" : ""
            }`}
          >
            <div className="relative flex flex-col">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className="relative flex flex-col items-start p-2"
                >
                  <div
                    className={`relative flex items-start p-2 my-1 ${
                      message.type === "user"
                        ? "self-end bg-cyan-900 px-2 text-[14px] rounded-md max-w-[100%] py-2 text-white"
                        : "self-start bg-gray-200 px-2 text-[14px] rounded-md max-w-[100%] py-2 ml-5 text-cyan-900"
                    }`}
                  >
                    {message.type !== "user" && (
                      <Lucide
                        icon="Bot"
                        className="absolute left-[-2rem] w-5 h-10 text-cyan-900 xl:w-6 xl:h-10 lg:w-8 lg:h-8 md:w-6 md:h-6"
                      />
                    )}
                    <span>{message.text}</span>
                  </div>
                  {message.type !== "user" && !isResponseLoading && (
                    <div className="flex justify-end w-full mt-2 ">
                      <Lucide
                        icon="ThumbsUp"
                        className={`w-5 h-5 cursor-pointer ${
                          message.liked
                            ? "text-green-500"
                            : "text-gray-500 hover:text-cyan-900"
                        }`}
                        onClick={() => handleThumbsUp(index)}
                      />
                      <Lucide
                        icon="ThumbsDown"
                        className={`w-5 h-5 ml-2 cursor-pointer ${
                          message.disliked
                            ? "text-red-500"
                            : "text-gray-500 hover:text-cyan-900"
                        }`}
                        onClick={() => handleThumbsDown(index)}
                      />
                    </div>
                  )}
                </div>
              ))}
              {isResponseLoading && (
                <div className="relative flex items-center justify-start p-2 my-2 ml-5">
                  <LoadingIcon icon="three-dots" className="w-8 h-8" />
                </div>
              )}
            </div>
          </div>
        </ul>

        <div className="flex flex-col items-center p-2 border-t border-gray-200">
          {error && <p className="mb-2 text-red-600">{error}</p>}
          <div className="flex items-center w-full">
            {!isFileUploaded && (
              <>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="flex-grow p-2 mr-2 border border-gray-300 rounded-lg"
                />
                <button
                  onClick={handleFileUpload}
                  className="inline-block btn btn-primary"
                >
                  <Lucide icon="Upload" className="w-5 h-5 text-white" />
                </button>
              </>
            )}
            {isFileUploaded && (
              <>
                {showTextInput && !hideFileInput && (
                  <>
                    <input
                      type="text"
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      className="block px-2 py-2 mr-2 login__input form-control"
                      placeholder="Enter your message ..."
                    />

                    <button
                      className="inline-block mr-2 btn btn-primary"
                      onClick={handleSendPrompt}
                    >
                      <Lucide icon="Send" className="w-5 h-5 text-white" />
                    </button>

                    <button
                      onClick={handlePaperclipClick}
                      className="inline-block btn btn-primary"
                    >
                      <Lucide icon="Paperclip" className="w-5 h-5 text-white" />
                    </button>
                  </>
                )}
                {hideFileInput && (
                  <>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png"
                      onChange={handleFileChange}
                      className="flex-grow p-2 mr-2 border border-gray-300 rounded-lg"
                    />
                    <button
                      onClick={handleFileUpload}
                      className="inline-block btn btn-primary"
                    >
                      <Lucide icon="Upload" className="w-5 h-5 text-white" />
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInfoSage;
