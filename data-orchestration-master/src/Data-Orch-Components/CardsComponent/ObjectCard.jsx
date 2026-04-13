import React from "react";
import Cards from "./Cards";
import { LoadingIcon } from "@/base-components";

export default function ObjectCard({
  currentName,
  type,
  description,
  tags,
  subtitle,
  currentsize,
  date,
  currentloc,
  contentFlag,
  setFolder,
  loading,
  ids = [],
  blobUrls = [],
  onDelete,
}) {
  const isDataAvailable =
    (Array.isArray(currentName) && currentName.length > 0) ||
    (Array.isArray(description) && description.length > 0) ||
    (Array.isArray(tags) && tags.length > 0) ||
    (Array.isArray(currentsize) && currentsize.length > 0) ||
    (Array.isArray(date) && date.length > 0);

  if (loading) {
    return (
      <div className="col-span-12 lg:col-span-9 2xl:col-span-10">
        <div className="flex justify-center items-center mt-48">
          <LoadingIcon icon="circles" className="w-10 h-10" />
        </div>
      </div>
    );
  }

  if (!isDataAvailable && contentFlag === true) {
    return (
      <div className="col-span-12 lg:col-span-9 2xl:col-span-10">
        <div className="text-center mt-48 text-base tracking-wide">
          <h1 className="font-md mt-4 font-medium text-[#E9A53F]">
            No files available to display. Please upload files to get started.
          </h1>
        </div>
      </div>
    );
  }

  if (!isDataAvailable && contentFlag === false) {
    return (
      <div className="col-span-12 lg:col-span-9 2xl:col-span-10">
        <div className="text-center mt-48 text-base tracking-wide">
          <h1 className="font-md mt-4 font-medium text-[#E9A53F]">
            No data found. Please adjust your search criteria or try again later.
          </h1>
        </div>
      </div>
    );
  }

  if (isDataAvailable) {
    return (
      <>
        {currentName.map((item, index) => {
          const docId = ids[index];

          const handleDeleteClick = (e) => {
            e.stopPropagation();
            if (!docId) {
              console.error("[ObjectCard] Missing ID at index", index);
              return;
            }
            console.log("[ObjectCard] Delete clicked | id=", docId);
            if (typeof onDelete === "function") onDelete(docId);
          };

          return (
            <div key={index} style={{ position: "relative" }}>
              {/* Delete button — top-right corner of each card */}
              {typeof onDelete === "function" && (
                <button
                  onClick={handleDeleteClick}
                  title="Delete document"
                  style={{
                    position:        "absolute",
                    top:             "6px",
                    right:           "6px",
                    zIndex:          10,
                    width:           "24px",
                    height:          "24px",
                    borderRadius:    "50%",
                    background:      "#fee2e2",
                    border:          "none",
                    cursor:          "pointer",
                    display:         "flex",
                    alignItems:      "center",
                    justifyContent:  "center",
                    padding:         0,
                    transition:      "background 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#fca5a5")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#fee2e2")}
                >
                  {/* Trash icon */}
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#dc2626"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6" />
                    <path d="M14 11v6" />
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                </button>
              )}

              <Cards
                setFolder={setFolder}
                type={type}
                description={description[index]}
                tags={tags[index]}
                subtitle={subtitle}
                name={currentName[index]}
                size={currentsize[index]}
                alldatalength={currentName.length}
                objdate={date[index]}
                currentloc={currentloc}
                blobUrl={blobUrls[index] || ""}
              />
            </div>
          );
        })}
      </>
    );
  }

  return null;
}
