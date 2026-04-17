/**
 * AzureApi.js
 * All calls to the Azure Function App backend.
 */

const AZURE_BASE_URL = import.meta.env.VITE_AZURE_API_URL || "http://localhost:7071/api";
const APIM_KEY = import.meta.env.VITE_AZURE_APIM_KEY || "";

// Add APIM subscription key to all requests if present
const apimHeaders = APIM_KEY ? { "Ocp-Apim-Subscription-Key": APIM_KEY } : {};

console.log("[AzureApi] Base URL:", AZURE_BASE_URL);

// ─────────────────────────────────────────────
// Health
// ─────────────────────────────────────────────

export const checkHealth = async () => {
  const res = await fetch(`${AZURE_BASE_URL}/health`, { headers: apimHeaders });
  return res.json();
};

// ─────────────────────────────────────────────
// Documents — list
// ─────────────────────────────────────────────

export const listDocuments = async () => {
  console.log("[AzureApi] GET /documents");
  const res = await fetch(`${AZURE_BASE_URL}/documents`, { headers: apimHeaders });
  if (!res.ok) throw new Error(`listDocuments failed: ${res.status}`);
  const data = await res.json();
  console.log("[AzureApi] /documents response:", data);
  const rawArray = Array.isArray(data) ? data : (Array.isArray(data?.value) ? data.value : []);
  return rawArray.map(d => ({
    ...d,
    tags:        Array.isArray(d.tags) ? d.tags.join(", ") : (d.tags || ""),
    description: d.summary || d.description || "",
  }));
};

// ─────────────────────────────────────────────
// Upload
// ─────────────────────────────────────────────

export const uploadDocument = async (file, description = "", tags = "", onProgress = null, extraFields = {}) => {
  console.log("[AzureApi] POST /upload →", file.name);
  const formData = new FormData();
  formData.append("file", file);
  formData.append("filename", file.name);
  formData.append("description", description);
  formData.append("tags", tags);
  Object.entries(extraFields).forEach(([k, v]) => formData.append(k, v));

  if (onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${AZURE_BASE_URL}/upload`);
      if (APIM_KEY) xhr.setRequestHeader("Ocp-Apim-Subscription-Key", APIM_KEY);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };

      xhr.onload = () => {
        if (xhr.status === 201) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          let errMsg = `Upload failed: ${xhr.status}`;
          try {
            const parsed = JSON.parse(xhr.responseText);
            if (parsed.error) errMsg = parsed.error;
          } catch {}
          reject(new Error(errMsg));
        }
      };

      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.send(formData);
    });
  }

  const res = await fetch(`${AZURE_BASE_URL}/upload`, {
    method: "POST",
    headers: apimHeaders,
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Upload failed: ${res.status}`);
  }
  return res.json();
};

// ─────────────────────────────────────────────
// Download — get file via proxy endpoint
// ─────────────────────────────────────────────

export const downloadDocument = async (documentId) => {
  console.log("[AzureApi] GET /file?id=", documentId);
  const file_url = `${AZURE_BASE_URL}/file?id=${documentId}`;
  return { file_url, filename: "" };
};

// ─────────────────────────────────────────────
// Delete
// ─────────────────────────────────────────────

export const deleteDocument = async (documentId) => {
  console.log("[AzureApi] DELETE /document/", documentId);
  const res = await fetch(`${AZURE_BASE_URL}/document/${documentId}`, {
    method: "DELETE",
    headers: apimHeaders,
  });
  if (!res.ok && res.status !== 404) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Delete failed: ${res.status}`);
  }
  return res.json();
};

// ─────────────────────────────────────────────
// Query
// ─────────────────────────────────────────────

const CHART_INTENT_KEYWORDS = [
  "plot", "chart", "graph", "visualize", "visualise",
  "bar chart", "pie chart", "line chart", "show me a graph",
  "how many", "count", "distribution", "breakdown",
];

const detectChartIntent = (question) =>
  CHART_INTENT_KEYWORDS.some((kw) => question.toLowerCase().includes(kw));

export const queryDocuments = async (question, filenameFilter = "", history = []) => {
  console.log("[AzureApi] POST /query →", question);
  const res = await fetch(`${AZURE_BASE_URL}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...apimHeaders },
    body: JSON.stringify({
      q: question,
      filename: filenameFilter,
      history,
      intent: detectChartIntent(question) ? "chart" : "auto",
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Query failed: ${res.status}`);
  }
  return res.json();
};

// ─────────────────────────────────────────────
// Cleanup session (temp blobs for Files Knowledge Bot)
// ─────────────────────────────────────────────

export const cleanupSession = async (sessionId) => {
  console.log("[AzureApi] POST /cleanup-session →", sessionId);
  const res = await fetch(`${AZURE_BASE_URL}/cleanup-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...apimHeaders },
    body: JSON.stringify({ session_id: sessionId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Cleanup failed: ${res.status}`);
  }
  return res.json();
};
