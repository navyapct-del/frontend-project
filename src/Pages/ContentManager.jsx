import React, { useContext, useEffect, useState, useCallback } from "react";
import { AccountContext } from "../config/Account";
import ObjectCard from "../Data-Orch-Components/CardsComponent/ObjectCard";
import { listDocuments, deleteDocument } from "../config/AzureApi";
import ReactPaginate from "react-paginate";
import { Lucide } from "@/base-components";
import TagFilter from "../Data-Orch-Components/TagsFilter";
import Search from "../Data-Orch-Components/SearchComponent/Search";
import Upload from "../Data-Orch-Components/UploadComponent/UploadMain";
import AdvanceSearch from "../Data-Orch-Components/AdvanceSearchComponent/AdvanceSearch";
import CheckboxesFilter from "../Data-Orch-Components/CheckboxesFilter";
import TabulatorFile from "../Data-Orch-Components/TabulatorFile";

export default function ContentManager(props) {
  const [currentPage, setCurrentPage]     = useState(0);
  const [objectsPerPage]                  = useState(10);
  const [cardEnabled, setCardEnabled]     = useState(false);
  const [allData, setAllData]             = useState([]);
  const [filteredData, setFilteredData]   = useState([]);
  const [selectedTags, setSelectedTags]   = useState([]);
  const { userdetails, userEmail }        = useContext(AccountContext);
  const indexOfLastObject                 = (currentPage + 1) * objectsPerPage;
  const indexOfFirstObject                = indexOfLastObject - objectsPerPage;
  const [loading, setLoading]             = useState(false);
  const [showUpload, setShowUpload]       = useState(false);
  const [currentLoc, setCurrentLoc]       = useState("");
  const [contentFlag, setContentFlag]     = useState(false);
  const [checkboxes, setCheckboxes]       = useState({ imageCheck: false, videoCheck: false, documentCheck: false });
  const [isCheckboxFilterActive, setIsCheckboxFilterActive] = useState(false);
  const [showTabulator, setShowTabulator] = useState(false);
  const [viewMode, setViewMode]           = useState("grid"); // "grid" | "list"
  const [sidebarDoc, setSidebarDoc]       = useState(""); // selected doc name for sidebar filter

  const loadDocuments = useCallback(() => {
    setLoading(true);
    console.log("[ContentManager] refreshing document list...");
    listDocuments()
      .then((data) => {
        const normalized = Array.isArray(data)
          ? data.map((d) => ({
              id:          d.id,
              name:        d.filename,
              description: d.summary  || "",
              tags:        Array.isArray(d.tags) ? d.tags.join(", ") : (d.tags || ""),
              date:        d.created_at || d.timestamp || new Date().toISOString(),
              size:        d.size || "",
              blob_url:    d.blob_url || "",
              file_type:   "document",
            }))
          : [];
        console.log("[ContentManager] normalized docs:", normalized.length);
        setAllData(normalized);
        setFilteredData(normalized);
        setContentFlag(normalized.length === 0);
      })
      .catch((e) => { console.error("[ContentManager] listDocuments error:", e); setContentFlag(true); })
      .finally(() => setLoading(false));
  }, []);

  const handleUploadComplete = useCallback(() => {
    setShowUpload(false);
    loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    if (userdetails && props.type) {
      const location = props.type !== "file" ? `${userEmail}/${props.type}/` : `${userEmail}/`;
      setCurrentLoc(location);
      setCardEnabled(false);
    }
  }, [props.type, userdetails]);

  useEffect(() => {
    console.log("[ContentManager] mount | type=", props.type);
    if (!props.type) return;
    loadDocuments();
  }, [props.type, loadDocuments]);

  useEffect(() => {
    if (selectedTags.length > 0)
      setFilteredData(allData.filter((item) => selectedTags.some((tag) => item.tags.includes(tag))));
    else
      setFilteredData(allData);
  }, [allData, selectedTags]);

  useEffect(() => {
    let filtered = allData;
    if (checkboxes.imageCheck && checkboxes.documentCheck && checkboxes.videoCheck)
      filtered = allData.filter((i) => ["image","document","video"].includes(i.file_type));
    else if (checkboxes.imageCheck && checkboxes.documentCheck)
      filtered = allData.filter((i) => i.file_type === "image" || i.file_type === "document");
    else if (checkboxes.imageCheck && checkboxes.videoCheck)
      filtered = allData.filter((i) => i.file_type === "image" || i.file_type === "video");
    else if (checkboxes.documentCheck && checkboxes.videoCheck)
      filtered = allData.filter((i) => i.file_type === "document" || i.file_type === "video");
    else if (checkboxes.imageCheck)    filtered = allData.filter((i) => i.file_type === "image");
    else if (checkboxes.documentCheck) filtered = allData.filter((i) => i.file_type === "document");
    else if (checkboxes.videoCheck)    filtered = allData.filter((i) => i.file_type === "video");
    setFilteredData(filtered);
  }, [checkboxes, allData]);

  useEffect(() => {
    setIsCheckboxFilterActive(checkboxes.imageCheck || checkboxes.videoCheck || checkboxes.documentCheck);
  }, [checkboxes]);

  const handlePagination     = useCallback((e) => setCurrentPage(e.selected), []);
  const handleUploadClick    = () => setShowUpload((p) => !p);
  const handleTabulatorClick = () => { setShowTabulator((p) => !p); setShowUpload(false); };

  const handleDelete = useCallback(async (docId) => {
    if (!window.confirm("Delete this document? This cannot be undone.")) return;
    try {
      await deleteDocument(docId);
      setAllData((prev) => prev.filter((d) => d.id !== docId));
      setFilteredData((prev) => prev.filter((d) => d.id !== docId));
    } catch (e) {
      alert(`Delete failed: ${e.message}`);
    }
  }, []);

  const currentData = (filteredData || []).slice(indexOfFirstObject, indexOfLastObject);

  const pageTitle = {
    file: "File Manager", image: "Images",
    video: "Videos", document: "Documents", media: "Media",
  }[props.type] || "";

  return (
    <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>

      {/* ── Documents sidebar ── */}
      <div style={sd.sidebar}>
        <div style={sd.sidebarHeader}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0d3347" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          <span style={sd.sidebarTitle}>Documents</span>
        </div>
        <div style={sd.sidebarList}>
          {/* All */}
          <div
            style={{ ...sd.docItem, background: sidebarDoc === "" ? "#dbeafe" : "transparent" }}
            onClick={() => { setSidebarDoc(""); setFilteredData(allData); }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={sidebarDoc === "" ? "#0d3347" : "#9ca3af"} strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
            <span style={{ ...sd.docName, color: sidebarDoc === "" ? "#0d3347" : "#6b7280", fontWeight: sidebarDoc === "" ? "600" : "400" }}>
              All Documents
            </span>
          </div>

          {allData.length === 0 ? (
            <p style={{ fontSize: "11px", color: "#9ca3af", padding: "10px 14px", textAlign: "center" }}>No files yet</p>
          ) : (
            allData.map((doc) => {
              const isActive = sidebarDoc === doc.name;
              return (
                <div
                  key={doc.id}
                  style={{ ...sd.docItem, background: isActive ? "#dbeafe" : "transparent" }}
                  title={doc.name}
                  onClick={() => {
                    if (isActive) {
                      setSidebarDoc("");
                      setFilteredData(allData);
                    } else {
                      setSidebarDoc(doc.name);
                      setFilteredData(allData.filter(d => d.name === doc.name));
                    }
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={isActive ? "#0d3347" : "#9ca3af"} strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <span style={{ ...sd.docName, color: isActive ? "#0d3347" : "#374151", fontWeight: isActive ? "600" : "400" }}>
                    {doc.name}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{ flex: 1, minWidth: 0 }}>
      <div style={s.card}>

        {/* ── TOOLBAR ── */}
        <div style={s.toolbar}>
          <h2 style={s.title}>{pageTitle}</h2>

          <div style={s.toolbarCentre}>
            {!isCheckboxFilterActive && (
              <div style={s.searchWrap}>
                <svg style={s.searchIcon} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <Search allData={allData} setFilteredData={setFilteredData} selectedTags={selectedTags} />
              </div>
            )}

            {props.type === "file" && (
              <CheckboxesFilter checkboxes={checkboxes} setCheckboxes={setCheckboxes} />
            )}

            {/* Grid / List view toggle */}
            <div style={s.viewToggle}>
              <button
                style={{ ...s.viewBtn, background: viewMode === "grid" ? "#0d3347" : "transparent", color: viewMode === "grid" ? "#fff" : "#6b7280" }}
                onClick={() => setViewMode("grid")}
                title="Grid view"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
              </button>
              <button
                style={{ ...s.viewBtn, background: viewMode === "list" ? "#0d3347" : "transparent", color: viewMode === "list" ? "#fff" : "#6b7280" }}
                onClick={() => setViewMode("list")}
                title="List view"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                  <circle cx="3" cy="6" r="1" fill="currentColor"/><circle cx="3" cy="12" r="1" fill="currentColor"/><circle cx="3" cy="18" r="1" fill="currentColor"/>
                </svg>
              </button>
            </div>
          </div>

          <button
            style={s.uploadBtn}
            onClick={handleUploadClick}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#0a2535")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#0d3347")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
            </svg>
            Upload New Files
          </button>
        </div>

        {/* ── CONTENT ── */}
        <div style={s.content}>
          {showTabulator ? (
            <TabulatorFile data={filteredData} />
          ) : showUpload ? (
            <Upload current_Folder={currentLoc} type={props.type} onUploadComplete={handleUploadComplete} />
          ) : (
            <>
              {loading ? (
                <div style={s.emptyState}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                  </svg>
                  <p style={{ color: "#9ca3af", marginTop: "12px", fontSize: "14px" }}>Loading files…</p>
                </div>
              ) : contentFlag || filteredData.length === 0 ? (
                <div style={s.emptyState}>
                  <p style={s.emptyText}>No files available. Please upload files to get started.</p>
                </div>
              ) : viewMode === "list" ? (
                /* ── LIST VIEW ── */
                <div style={s.listWrap}>
                  <table style={s.listTable}>
                    <thead>
                      <tr style={s.listHead}>
                        <th style={{ ...s.th, width: "35%" }}>Name</th>
                        <th style={{ ...s.th, width: "30%" }}>Description</th>
                        <th style={{ ...s.th, width: "20%" }}>Tags</th>
                        <th style={{ ...s.th, width: "10%" }}>Date</th>
                        <th style={{ ...s.th, width: "5%" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentData.map((item, i) => (
                        <tr key={item.id} style={{ ...s.listRow, background: i % 2 === 0 ? "#fff" : "#f8f9fb" }}>
                          <td style={{ ...s.td, maxWidth: "0", width: "35%" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0d3347" strokeWidth="2" style={{ flexShrink: 0 }}>
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                              </svg>
                              <span style={{ fontWeight: 500, fontSize: "13px", color: "#1f2937", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.name}>
                                {item.name}
                              </span>
                            </div>
                          </td>
                          <td style={{ ...s.td, maxWidth: "0", width: "30%" }}>
                            <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "12px", color: "#6b7280" }} title={item.description}>
                              {item.description || "—"}
                            </span>
                          </td>
                          <td style={{ ...s.td, maxWidth: "0", width: "20%" }}>
                            <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "12px", color: "#6b7280" }} title={item.tags}>
                              {item.tags || "—"}
                            </span>
                          </td>
                          <td style={{ ...s.td, fontSize: "12px", color: "#9ca3af", whiteSpace: "nowrap", width: "10%" }}>
                            {item.date ? new Date(item.date).toLocaleDateString() : "—"}
                          </td>
                          <td style={{ ...s.td, width: "5%" }}>
                            <div style={{ display: "flex", gap: "6px" }}>
                              {item.id && (
                                <a
                                  href={`${import.meta.env.VITE_AZURE_API_URL || "http://localhost:7071/api"}/file?id=${item.id}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={s.actionBtn}
                                  title="Download"
                                  download
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                                  </svg>
                                </a>
                              )}
                              <button onClick={() => handleDelete(item.id)} style={{ ...s.actionBtn, color: "#dc2626" }} title="Delete">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="3 6 5 6 21 6"/>
                                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* ── GRID VIEW ── */
                <div style={s.grid}>
                  <ObjectCard
                    currentLoc={currentLoc}
                    type={props.type}
                    currentName={currentData.map((i) => i.name)}
                    currentsize={currentData.map((i) => i.size)}
                    description={currentData.map((i) => i.description)}
                    tags={currentData.map((i) => i.tags)}
                    date={currentData.map((i) => i.date)}
                    ids={currentData.map((i) => i.id)}
                    blobUrls={currentData.map((i) => i.blob_url)}
                    flag={cardEnabled}
                    contentFlag={contentFlag}
                    loading={loading}
                    onDelete={handleDelete}
                  />
                </div>
              )}

              {filteredData.length > objectsPerPage && (
                <div style={s.paginationWrap}>
                  <ReactPaginate
                    previousLabel={<Lucide icon="ChevronLeft" className="w-4 h-4" />}
                    nextLabel={<Lucide icon="ChevronRight" className="w-4 h-4" />}
                    breakLabel="..."
                    pageCount={Math.ceil(filteredData.length / objectsPerPage)}
                    marginPagesDisplayed={2}
                    pageRangeDisplayed={5}
                    onPageChange={handlePagination}
                    containerClassName="pagination"
                    pageClassName="page-item"
                    pageLinkClassName="page-link"
                    previousClassName="page-item"
                    previousLinkClassName="page-link"
                    nextClassName="page-item"
                    nextLinkClassName="page-link"
                    breakClassName="page-item"
                    breakLinkClassName="page-link"
                    activeClassName="active"
                  />
                </div>
              )}
            </>
          )}
        </div>

      </div>
      </div>
    </div>
  );
}

// ── Sidebar styles ────────────────────────────────────────────────────────────
const sd = {
  sidebar: {
    width: "200px",
    flexShrink: 0,
    background: "#f0f7fa",
    borderRadius: "14px",
    border: "1.5px solid #bee3f8",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    alignSelf: "flex-start",
    position: "sticky",
    top: "16px",
    maxHeight: "calc(100vh - 140px)",
  },
  sidebarHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 14px",
    borderBottom: "1px solid #bee3f8",
    background: "#e0f2fe",
  },
  sidebarTitle: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#0d3347",
  },
  sidebarList: {
    flex: 1,
    overflowY: "auto",
    padding: "6px 0",
  },
  docItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 12px",
    cursor: "pointer",
    transition: "background 0.1s",
    borderBottom: "1px solid #e0f2fe",
  },
  docName: {
    fontSize: "11px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    flex: 1,
  },
};

const s = {
  page: { fontFamily: "'Segoe UI', system-ui, sans-serif", padding: "0" },
  card: {
    background: "#ffffff", borderRadius: "16px", overflow: "hidden",
    boxShadow: "0 2px 12px rgba(0,0,0,0.08)", minHeight: "500px",
    display: "flex", flexDirection: "column",
  },
  toolbar: {
    display: "flex", alignItems: "center", gap: "16px",
    padding: "20px 28px", borderBottom: "1px solid #f0f0f0", flexWrap: "wrap",
  },
  title: { fontSize: "18px", fontWeight: "600", color: "#1a1a2e", margin: 0, whiteSpace: "nowrap" },
  toolbarCentre: { display: "flex", alignItems: "center", gap: "12px", flex: 1 },
  searchWrap: { position: "relative", display: "flex", alignItems: "center" },
  searchIcon: { position: "absolute", left: "10px", width: "16px", height: "16px", pointerEvents: "none", zIndex: 1 },
  viewToggle: {
    display: "flex", alignItems: "center",
    border: "1px solid #e5e7eb", borderRadius: "8px", overflow: "hidden",
  },
  viewBtn: {
    width: "34px", height: "34px", border: "none", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    transition: "background 0.15s, color 0.15s",
  },
  uploadBtn: {
    display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px",
    background: "#0d3347", color: "#ffffff", border: "none", borderRadius: "8px",
    fontSize: "14px", fontWeight: "600", cursor: "pointer", transition: "background 0.2s",
    whiteSpace: "nowrap", marginLeft: "auto",
  },
  content: { flex: 1, padding: "24px 28px", background: "#f8f9fb" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "16px" },
  listWrap: { overflowX: "auto" },
  listTable: { width: "100%", borderCollapse: "collapse", fontSize: "13px", tableLayout: "fixed" },
  listHead: { background: "#0d3347" },
  th: { padding: "10px 12px", textAlign: "left", fontWeight: "600", color: "#ffffff", borderBottom: "2px solid #0a2535", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  listRow: { borderBottom: "1px solid #f0f0f0", transition: "background 0.1s" },
  td: { padding: "8px 12px", verticalAlign: "middle", height: "44px" },
  actionBtn: {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: "28px", height: "28px", borderRadius: "6px", border: "1px solid #e5e7eb",
    background: "#fff", cursor: "pointer", color: "#6b7280", textDecoration: "none",
  },
  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "360px" },
  emptyText: { color: "#f59e0b", fontSize: "15px", fontWeight: "500", textAlign: "center", margin: 0 },
  paginationWrap: { marginTop: "24px", display: "flex", justifyContent: "flex-start" },
};
