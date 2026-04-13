/**
 * ProgressBar.jsx
 * Upload progress indicator showing filename, file size, track + fill, and percentage.
 */
import React from "react";

function formatFileSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export function ProgressBar({ percent = 0, filename = "", fileSize = 0 }) {
  const pct = Math.min(100, Math.max(0, Math.round(percent)));
  return (
    <div style={s.wrap}>
      <div style={s.meta}>
        <span style={s.filename}>{filename}</span>
        {fileSize > 0 && <span style={s.size}>{formatFileSize(fileSize)}</span>}
      </div>
      <div style={s.track}>
        <div style={{ ...s.fill, width: `${pct}%` }} />
      </div>
      <span style={s.label}>{pct}%</span>
    </div>
  );
}

const s = {
  wrap: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    padding: "8px 0",
  },
  meta: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "12px",
    color: "#374151",
  },
  filename: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: "70%",
    fontWeight: 500,
  },
  size: {
    color: "#6b7280",
    flexShrink: 0,
  },
  track: {
    height: "8px",
    background: "#e5e7eb",
    borderRadius: "4px",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    background: "#0d3347",
    borderRadius: "4px",
    transition: "width 0.2s ease",
  },
  label: {
    fontSize: "11px",
    color: "#6b7280",
    textAlign: "right",
  },
};

export default ProgressBar;
