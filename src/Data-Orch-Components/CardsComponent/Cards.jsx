import React, { useState } from "react";
import { getPreviewUrl, downloadDocument } from "../../config/AzureApi";
import pdf_Url    from "../../assets/images/pdf.png";
import docx_Url   from "../../assets/images/docx.png";
import text_Url   from "../../assets/images/text.png";
import other_Url  from "../../assets/images/other.png";

// ── Inline SVG icons for file types without image assets ─────────────────────

const ExcelIcon = () => (
  <svg width="44" height="44" viewBox="0 0 48 48" fill="none">
    <rect width="48" height="48" rx="6" fill="#217346"/>
    <text x="50%" y="58%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold" fontFamily="Arial">XLS</text>
  </svg>
);

const CsvIcon = () => (
  <svg width="44" height="44" viewBox="0 0 48 48" fill="none">
    <rect width="48" height="48" rx="6" fill="#0f766e"/>
    <text x="50%" y="58%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold" fontFamily="Arial">CSV</text>
  </svg>
);

const ImageIcon = () => (
  <svg width="44" height="44" viewBox="0 0 48 48" fill="none">
    <rect width="48" height="48" rx="6" fill="#7c3aed"/>
    <rect x="8" y="12" width="32" height="24" rx="3" fill="white" fillOpacity="0.2"/>
    <circle cx="17" cy="20" r="3" fill="white"/>
    <path d="M8 30l10-8 8 6 6-4 8 6" stroke="white" strokeWidth="2" fill="none"/>
  </svg>
);

const VideoIcon = () => (
  <svg width="44" height="44" viewBox="0 0 48 48" fill="none">
    <rect width="48" height="48" rx="6" fill="#dc2626"/>
    <polygon points="18,14 36,24 18,34" fill="white"/>
  </svg>
);

const TxtIcon = () => (
  <svg width="44" height="44" viewBox="0 0 48 48" fill="none">
    <rect width="48" height="48" rx="6" fill="#6b7280"/>
    <text x="50%" y="58%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" fontFamily="Arial">TXT</text>
  </svg>
);

// ── File-type helpers ────────────────────────────────────────────────────────

const IMAGE_EXTS    = new Set(["jpg","jpeg","png","gif","bmp","webp","svg"]);
const VIDEO_EXTS    = new Set(["mp4","mov","avi","mkv","webm"]);
const PDF_EXTS      = new Set(["pdf"]);
const WORD_EXTS     = new Set(["doc","docx"]);
const EXCEL_EXTS    = new Set(["xls","xlsx"]);
const CSV_EXTS      = new Set(["csv"]);
const TEXT_EXTS     = new Set(["txt","md","json","xml","yaml","yml"]);

const getExt = (filename) =>
  (filename || "").split(".").pop().toLowerCase().split("?")[0];

// Returns either a URL string (for img tag) or a component type string
const getFileIconType = (ext) => {
  if (PDF_EXTS.has(ext))   return "pdf";
  if (WORD_EXTS.has(ext))  return "docx";
  if (EXCEL_EXTS.has(ext)) return "excel";
  if (CSV_EXTS.has(ext))   return "csv";
  if (TEXT_EXTS.has(ext))  return "txt";
  if (IMAGE_EXTS.has(ext)) return "image";
  if (VIDEO_EXTS.has(ext)) return "video";
  return "other";
};

const FileIconComponent = ({ ext, size = 44 }) => {
  const type = getFileIconType(ext);
  const imgStyle = { width: size, height: size, objectFit: "contain" };
  switch (type) {
    case "pdf":   return <img src={pdf_Url}   alt="PDF"  style={imgStyle} />;
    case "docx":  return <img src={docx_Url}  alt="DOCX" style={imgStyle} />;
    case "txt":   return <img src={text_Url}  alt="TXT"  style={imgStyle} />;
    case "excel": return <ExcelIcon />;
    case "csv":   return <CsvIcon />;
    case "image": return <ImageIcon />;
    case "video": return <VideoIcon />;
    default:      return <img src={other_Url} alt="File" style={imgStyle} />;
  }
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

const PREVIEWABLE = new Set(["pdf", "jpg", "jpeg", "png", "gif", "webp", "svg", "txt", "md"]);

const Cards = (props) => {
  const [showDetail, setShowDetail]   = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [previewing, setPreviewing]   = useState(false);
  const [previewUrl, setPreviewUrl]   = useState(null);

  const filename  = props.name    || "Unknown file";
  const docId     = props.docId   || "";
  const ext       = getExt(filename);
  const shortName = truncate(filename.split("/").pop(), 16);
  const dateStr   = formatDate(props.objdate);
  const tags      = (props.tags || "").replace(/[{}'[\]]/g, "");
  const desc      = props.description || "";

  const handleDownload = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!docId) return;
    setDownloading(true);
    try {
      const { sas_url, filename: fname } = await downloadDocument(docId);
      const a = document.createElement("a");
      a.href     = sas_url;
      a.download = fname || filename.split("/").pop();
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      alert(`Download failed: ${err.message}`);
    }
    setDownloading(false);
  };

  const handlePreview = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!docId) return;
    setPreviewing(true);
    try {
      const url = await getPreviewUrl(docId);
      setPreviewUrl(url);
    } catch (err) {
      alert(`Preview failed: ${err.message}`);
      setPreviewing(false);
    }
  };

  const closePreview = () => {
    setPreviewUrl(null);
    setPreviewing(false);
  };

  return (
    <>
      {/* ── Card tile ── */}
      <div style={s.card} onClick={() => setShowDetail(true)} title={filename}>
        <div style={s.thumb}><FileIconComponent ext={ext} size={44} /></div>
        <div style={s.name}>{shortName}</div>
        {dateStr && <div style={s.date}>{dateStr}</div>}
        <span style={s.badge}>{ext.toUpperCase()}</span>
      </div>

      {/* ── Detail panel ── */}
      {showDetail && (
        <div style={s.overlay} onClick={() => setShowDetail(false)}>
          <div style={s.panel} onClick={(e) => e.stopPropagation()}>
            <button style={s.closeBtn} onClick={() => setShowDetail(false)} aria-label="Close">✕</button>

            <div style={s.panelThumb}><FileIconComponent ext={ext} size={72} /></div>
            <h3 style={s.panelTitle}>{filename.split("/").pop()}</h3>

            {dateStr    && <p style={s.meta}><b>Date:</b> {dateStr}</p>}
            {desc       && <p style={s.meta}><b>Description:</b> {desc}</p>}
            {tags       && <p style={s.meta}><b>Tags:</b> {tags}</p>}
            {props.size && <p style={s.meta}><b>Size:</b> {props.size}</p>}

            {docId && (
              <div style={s.actionRow}>
                <button onClick={handlePreview} disabled={previewing} style={s.previewBtn} aria-label="Preview file">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                  {previewing && !previewUrl ? "Loading…" : "Preview"}
                </button>
                <button onClick={handleDownload} disabled={downloading} style={s.downloadBtn} aria-label="Download file">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  {downloading ? "Downloading…" : "Download"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Preview modal ── */}
      {previewUrl && (
        <div style={s.overlay} onClick={closePreview}>
          <div style={s.previewModal} onClick={(e) => e.stopPropagation()}>
            <div style={s.previewHeader}>
              <span style={{ fontWeight: 600, fontSize: "13px", color: "#1f2937", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {filename.split("/").pop()}
              </span>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={handleDownload} style={s.previewHeaderBtn} aria-label="Download">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                </button>
                <button onClick={closePreview} style={s.previewHeaderBtn} aria-label="Close preview">✕</button>
              </div>
            </div>
            <div style={s.previewBody}>
              {["jpg","jpeg","png","gif","webp","svg"].includes(ext) ? (
                <img src={previewUrl} alt={filename} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
              ) : ext === "pdf" ? (
                <iframe src={previewUrl} title={filename} style={{ width: "100%", height: "100%", border: "none" }} />
              ) : ["doc","docx","xls","xlsx","ppt","pptx"].includes(ext) ? (
                <iframe
                  src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(previewUrl)}`}
                  title={filename}
                  style={{ width: "100%", height: "100%", border: "none" }}
                />
              ) : (
                <iframe src={previewUrl} title={filename} style={{ width: "100%", height: "100%", border: "none", background: "#fff" }} />
              )}
            </div>
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
    border:         "none",
    cursor:         "pointer",
  },
  actionRow: {
    display:   "flex",
    gap:       "10px",
    marginTop: "18px",
  },
  previewBtn: {
    flex:           1,
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    gap:            "6px",
    padding:        "10px 16px",
    background:     "#f0f9ff",
    color:          "#0369a1",
    border:         "1.5px solid #bae6fd",
    borderRadius:   "8px",
    fontSize:       "13px",
    fontWeight:     "600",
    cursor:         "pointer",
  },
  downloadBtn: {
    flex:           1,
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    gap:            "6px",
    padding:        "10px 16px",
    background:     "#0d3347",
    color:          "#ffffff",
    border:         "none",
    borderRadius:   "8px",
    fontSize:       "13px",
    fontWeight:     "600",
    cursor:         "pointer",
  },
  previewModal: {
    background:    "#1f2937",
    borderRadius:  "12px",
    width:         "90vw",
    maxWidth:      "960px",
    height:        "85vh",
    display:       "flex",
    flexDirection: "column",
    overflow:      "hidden",
    boxShadow:     "0 25px 80px rgba(0,0,0,0.5)",
  },
  previewHeader: {
    display:        "flex",
    alignItems:     "center",
    justifyContent: "space-between",
    padding:        "10px 16px",
    background:     "#111827",
    borderBottom:   "1px solid #374151",
  },
  previewHeaderBtn: {
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    width:          "30px",
    height:         "30px",
    background:     "#374151",
    border:         "none",
    borderRadius:   "6px",
    color:          "#d1d5db",
    cursor:         "pointer",
    fontSize:       "13px",
  },
  previewBody: {
    flex:       1,
    overflow:   "hidden",
    background: "#f9fafb",
    display:    "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};

export default Cards;
