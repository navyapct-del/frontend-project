import React from "react";

/**
 * Renders a markdown-like string with:
 * - ## Heading 2, ### Heading 3
 * - **bold**, *italic*
 * - Bullet lines starting with - or *
 * - Numbered lists  1. item
 * - Blank lines as paragraph breaks
 */
export function MarkdownText({ text = "" }) {
  const lines = text.split("\n");
  const elements = [];
  let listItems = [];
  let numItems  = [];
  let key = 0;

  const flushList = () => {
    if (listItems.length) {
      elements.push(
        <ul key={key++} style={{ margin: "6px 0 6px 18px", padding: 0, listStyle: "disc" }}>
          {listItems.map((t, i) => <li key={i} style={{ marginBottom: "3px", lineHeight: "1.65" }}>{inlineFormat(t)}</li>)}
        </ul>
      );
      listItems = [];
    }
    if (numItems.length) {
      elements.push(
        <ol key={key++} style={{ margin: "6px 0 6px 18px", padding: 0, listStyle: "decimal" }}>
          {numItems.map((t, i) => <li key={i} style={{ marginBottom: "3px", lineHeight: "1.65" }}>{inlineFormat(t)}</li>)}
        </ol>
      );
      numItems = [];
    }
  };

  lines.forEach(raw => {
    const line = raw.trimEnd();

    if (/^###\s+/.test(line)) {
      flushList();
      elements.push(<h4 key={key++} style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a", margin: "12px 0 4px" }}>{line.replace(/^###\s+/, "")}</h4>);
    } else if (/^##\s+/.test(line)) {
      flushList();
      elements.push(<h3 key={key++} style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", margin: "14px 0 4px" }}>{line.replace(/^##\s+/, "")}</h3>);
    } else if (/^[-*]\s+/.test(line)) {
      if (numItems.length) flushList();
      listItems.push(line.replace(/^[-*]\s+/, ""));
    } else if (/^\d+\.\s+/.test(line)) {
      if (listItems.length) flushList();
      numItems.push(line.replace(/^\d+\.\s+/, ""));
    } else if (line.trim() === "") {
      flushList();
      elements.push(<br key={key++} />);
    } else {
      flushList();
      elements.push(<p key={key++} style={{ margin: "4px 0", lineHeight: "1.7" }}>{inlineFormat(line)}</p>);
    }
  });

  flushList();
  return <div style={{ fontSize: "13.5px", color: "#1e293b" }}>{elements}</div>;
}

function inlineFormat(text) {
  // Split on **bold** and *italic* tokens
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part))
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (/^\*[^*]+\*$/.test(part))
      return <em key={i}>{part.slice(1, -1)}</em>;
    return part;
  });
}
