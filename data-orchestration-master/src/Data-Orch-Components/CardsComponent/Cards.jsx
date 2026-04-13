import React, { useState } from "react";
import pdf_Url    from "../../assets/images/pdf.png";
import docx_Url   from "../../assets/images/docx.png";
import text_Url   from "../../assets/images/text.png";
import other_Url  from "../../assets/images/other.png";

// ── File-type helpers ────────────────────────────────────────────────────────

const IMAGE_EXTS    = new Set(["jpg","jpeg","png","gif","bmp","webp","svg"]);
const VIDEO_EXTS    = new Set(["mp4","mov","avi","mkv","webm"]);
const PDF_EXTS      = new Set(["pdf"]);
const WORD_EXTS     = new Set(["doc","docx"]);
const EXCEL_EXTS    = new Set(["xls","xlsx","csv"]);
const TEXT_EXTS     = new Set(["txt","md","json","xml","yaml","yml"]);

const getExt = (filename) =>
  (filename || "").split(".").pop().toLowerCase().split("?")[0];

const getFileIcon = (ext) => {
  if (PDF_EXTS.has(ext))   return pdf_Url;
  if (WORD_EXTS.has(ext))  return docx_Url;
  if (TEXT_EXTS.has(ext))  return text_Url;
  return other_Url;
};

const formatDate = (dateString) => {
  if (!dateString) return "";
  try {
    const date  = new Date(dateString);
    const day   = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year  = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return dateString;
  }
};

const truncate = (str, n = 16) =>
  str && str.length > n ? str.slice(0, n) + "…" : str;

// ── Card component ───────────────────────────────────────────────────────────

const Cards = (props) => {
  const [showDetail, setShowDetail] = useState(false);

  const filename   = props.name   || "Unknown file";
  const blobUrl    = props.blobUrl || "";
  const ext        = getExt(filename);
  const isImage    = IMAGE_EXTS.has(ext);
  const isVideo    = VIDEO_EXTS.has(ext);
  const fileIcon   = getFileIcon(ext);
  const shortName  = truncate(filename.split("/").pop(), 16);
  const dateStr    = formatDate(props.objdate);
  const tags       = (props.tags || "").replace(/[{}'[\]]/g, "");
  const desc       = props.description || "";

  return (
    <>
      {/* ── Card tile ── */}
      <div
        style={s.card}
        onClick={() => setShowDetail(true)}
        title={filename}
      >
        {/* Thumbnail */}
        <div style={s.thumb}>
          {isImage && blobUrl ? (
            <img
              src={blobUrl}
              alt={filename}
              style={s.thumbImg}
              onError={(e) => { e.currentTarget.src = other_Url; }}
            />
          ) : isVideo && blobUrl ? (
            <video src={blobUrl} style={s.thumbImg} muted />
          ) : (
            <img src={fileIcon} alt={ext} style={s.thumbIcon} />
          )}
        </div>

        {/* Name */}
        <div style={s.name}>{shortName}</div>

        {/* Date */}
        {dateStr && <div style={s.date}>{dateStr}</div>}

        {/* Extension badge */}
        <span style={s.badge}>{ext.toUpperCase()}</span>
      </div>

      {/* ── Detail panel (click to open) ── */}
      {showDetail && (
        <div style={s.overlay} onClick={() => setShowDetail(false)}>
          <div style={s.panel} onClick={(e) => e.stopPropagation()}>
            <button style={s.closeBtn} onClick={() => setShowDetail(false)}>✕</button>

            <div style={s.panelThumb}>
              {isImage && blobUrl ? (
                <img src={blobUrl} alt={filename} style={{ maxWidth: "100%", maxHeight: "260px", borderRadius: "8px" }} />
              ) : isVideo && blobUrl ? (
                <video src={blobUrl} controls style={{ maxWidth: "100%", maxHeight: "260px", borderRadius: "8px" }} />
              ) : (
                <img src={fileIcon} alt={ext} style={{ width: "80px", height: "80px" }} />
              )}
            </div>

            <h3 style={s.panelTitle}>{filename.split("/").pop()}</h3>

            {dateStr    && <p style={s.meta}><b>Date:</b> {dateStr}</p>}
            {desc       && <p style={s.meta}><b>Description:</b> {desc}</p>}
            {tags       && <p style={s.meta}><b>Tags:</b> {tags}</p>}
            {props.size && <p style={s.meta}><b>Size:</b> {props.size}</p>}

            {blobUrl && (
              <a
                href={blobUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={s.openBtn}
              >
                Open / Download
              </a>
            )}
          </div>
        </div>
      )}
    </>
  );
};

// ── Styles ───────────────────────────────────────────────────────────────────

const s = {
  card: {
    background:   "#ffffff",
    border:       "1px solid #e5e7eb",
    borderRadius: "10px",
    padding:      "14px 10px 10px",
    cursor:       "pointer",
    display:      "flex",
    flexDirection:"column",
    alignItems:   "center",
    gap:          "6px",
    transition:   "box-shadow 0.15s",
    position:     "relative",
    userSelect:   "none",
  },
  thumb: {
    width:          "64px",
    height:         "64px",
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    overflow:       "hidden",
    borderRadius:   "6px",
    background:     "#f3f4f6",
  },
  thumbImg: {
    width:      "100%",
    height:     "100%",
    objectFit:  "cover",
  },
  thumbIcon: {
    width:  "44px",
    height: "44px",
    objectFit: "contain",
  },
  name: {
    fontSize:   "12px",
    fontWeight: "600",
    color:      "#1f2937",
    textAlign:  "center",
    wordBreak:  "break-all",
    lineHeight: "1.3",
  },
  date: {
    fontSize: "10px",
    color:    "#9ca3af",
  },
  badge: {
    fontSize:     "9px",
    fontWeight:   "700",
    background:   "#e0f2fe",
    color:        "#0369a1",
    borderRadius: "4px",
    padding:      "1px 5px",
    letterSpacing:"0.05em",
  },

  // Detail overlay
  overlay: {
    position:       "fixed",
    inset:          0,
    background:     "rgba(0,0,0,0.45)",
    zIndex:         1000,
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
  },
  panel: {
    background:   "#ffffff",
    borderRadius: "14px",
    padding:      "28px 32px",
    maxWidth:     "480px",
    width:        "90%",
    position:     "relative",
    boxShadow:    "0 20px 60px rgba(0,0,0,0.2)",
    maxHeight:    "85vh",
    overflowY:    "auto",
  },
  closeBtn: {
    position:   "absolute",
    top:        "14px",
    right:      "16px",
    background: "none",
    border:     "none",
    fontSize:   "18px",
    cursor:     "pointer",
    color:      "#6b7280",
  },
  panelThumb: {
    display:        "flex",
    justifyContent: "center",
    marginBottom:   "16px",
  },
  panelTitle: {
    fontSize:     "15px",
    fontWeight:   "700",
    color:        "#111827",
    marginBottom: "12px",
    wordBreak:    "break-all",
  },
  meta: {
    fontSize:     "13px",
    color:        "#374151",
    marginBottom: "6px",
    lineHeight:   "1.5",
  },
  openBtn: {
    display:        "inline-block",
    marginTop:      "16px",
    padding:        "10px 20px",
    background:     "#0d3347",
    color:          "#ffffff",
    borderRadius:   "8px",
    fontSize:       "13px",
    fontWeight:     "600",
    textDecoration: "none",
  },
};

export default Cards;
