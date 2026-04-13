import React, { useState, useEffect } from "react";

function AdvanceSearchTags({
  data,
  searchQuery,
  userEmail,
  onFilteredResultsChange,
}) {
  const [comprehendTags, setComprehendTags] = useState([]);
  const [manualTags, setManualTags] = useState([]);
  const [selectedComprehendTags, setSelectedComprehendTags] = useState([]);
  const [selectedManualTags, setSelectedManualTags] = useState([]);

  const fetchFilterTags = async () => {
    try {
      const response = await fetch(
        "https://2c5owgz3oe.execute-api.ap-south-1.amazonaws.com/Dev/develoment",
        // "https://vkij0y39nl.execute-api.ap-south-1.amazonaws.com/Dev/develoment",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            actionone: "kendra_query",
            query: searchQuery,
            email: userEmail,
            comprehend: selectedComprehendTags,
            manual_tags: selectedManualTags,
            filter: true,
          }),
        }
      );
      const data = await response.json();
      console.log("API Response:", data);
      if (data && data.ResultItems) {
        console.log("Filtered Results Length:", data.ResultItems.length);
        const results = data.ResultItems.map((item) => ({
          title: item.DocumentTitle?.Text || "No title available",
          excerpt: item.DocumentExcerpt?.Text || "No excerpt available",
          uri: item.DocumentURI || "No uri ....",
        }));

        onFilteredResultsChange(results);
      } else {
        console.log("No filtered results found.");

        onFilteredResultsChange([]);
      }
    } catch (error) {
      console.error("Error fetching search results:", error);
      onFilteredResultsChange([]);
    }
  };

  useEffect(() => {
    fetchFilterTags();
  }, [selectedComprehendTags, selectedManualTags]);

  useEffect(() => {
    const parseDocumentTags = (data) => {
      const comprehendTags = [];
      const manualTags = [];

      if (data.res?.FacetResults && Array.isArray(data.res.FacetResults)) {
        data.res.FacetResults.forEach((item) => {
          if (
            item.DocumentAttributeKey === "comprehend" &&
            item.DocumentAttributeValueCountPairs
          ) {
            item.DocumentAttributeValueCountPairs.forEach((pair) => {
              if (pair.DocumentAttributeValue?.StringValue) {
                comprehendTags.push({
                  value: pair.DocumentAttributeValue.StringValue,
                  count: pair.Count,
                });
              }
            });
          } else if (
            item.DocumentAttributeKey === "Manual_Tags" &&
            item.DocumentAttributeValueCountPairs
          ) {
            item.DocumentAttributeValueCountPairs.forEach((pair) => {
              if (pair.DocumentAttributeValue?.StringValue) {
                manualTags.push({
                  value: pair.DocumentAttributeValue.StringValue,
                  count: pair.Count,
                });
              }
            });
          }
        });
      }

      return { comprehendTags, manualTags };
    };

    if (data) {
      const { comprehendTags, manualTags } = parseDocumentTags(data);
      setComprehendTags(comprehendTags);
      setManualTags(manualTags);
    }
  }, [data]);

  const handleComprehendTagChange = (event) => {
    const { value, checked } = event.target;
    setSelectedComprehendTags((prevTags) =>
      checked ? [...prevTags, value] : prevTags.filter((tag) => tag !== value)
    );
  };

  const handleManualTagChange = (event) => {
    const { value, checked } = event.target;
    setSelectedManualTags((prevTags) =>
      checked ? [...prevTags, value] : prevTags.filter((tag) => tag !== value)
    );
  };

  return (
    <>
      <div className="intro-y box p-5 mt-14">
        <div className="mt-1">
          <h3 className="text-center font-semibold text-[14px] text-primary">
            AI Tags
          </h3>
          {comprehendTags.length > 0 ? (
            comprehendTags.map((tag, index) => (
              <div key={index} className="my-3">
                <input
                  type="checkbox"
                  value={tag.value}
                  id={`comprehend-${index}`}
                  onChange={handleComprehendTagChange}
                />
                <label htmlFor={`comprehend-${index}`} className="mx-2">
                  {tag.value.slice(0, 20)}... ({tag.count})
                </label>
              </div>
            ))
          ) : (
            <div className="my-3 text-center text-[12px] text-[#E9A53F]">
              No AI tags found.
            </div>
          )}
        </div>
      </div>
      <div className="intro-y box p-5 mt-6">
        <div className="mt-1">
          <h3 className="text-center font-semibold text-[14px] text-primary">
            Manual Tags
          </h3>
          {manualTags.length > 0 ? (
            manualTags.map((tag, index) => (
              <div key={index} className="my-3">
                <input
                  type="checkbox"
                  value={tag.value}
                  id={`manual-${index}`}
                  onChange={handleManualTagChange}
                />
                <label htmlFor={`manual-${index}`} className="mx-2">
                  {tag.value.slice(0, 20)}... ({tag.count})
                </label>
              </div>
            ))
          ) : (
            <div className="my-3 text-center text-[12px] text-[#E9A53F]">
              No Manual tags found.
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default AdvanceSearchTags;
