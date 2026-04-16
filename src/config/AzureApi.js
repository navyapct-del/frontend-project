/**
 * AzureApi.js
 * -----------
 * All calls to the Azure Function App backend.
 * Change AZURE_BASE_URL to your deployed Function App URL when going to production.
 */

const AZURE_BASE_URL = import.meta.env.VITE_AZURE_API_URL || "http://localhost:7071/api";
const FUNCTION_KEY   = import.meta.env.VITE_AZURE_FUNCTION_KEY || "";

console.log("[AzureApi] Base URL:", AZURE_BASE_URL);
console.log("[AzureApi] Function key configured:", FUNCTION_KEY ? "yes" : "no (anonymous mode)");

// Append ?code= to URL if a function key is configured
function withKey(url) {
  if (!FUNCTION_KEY) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}code=${FUNCTION_KEY}`;
}

// ─────────────────────────────────────────────
// Health
// ─────────────────────────────────────────────

export const checkHealth = async () => {
  console.log("[AzureApi] GET /health");
  const res = await fetch(withKey(`${AZURE_BASE_URL}/health`));
  return res.json();
};

// ─────────────────────────────────────────────
// Documents — list
// ─────────────────────────────────────────────

export const listDocuments = async () => {
  console.log("[AzureApi] GET /documents →", `${AZURE_BASE_URL}/documents`);
  const res = await fetch(withKey(`${AZURE_BASE_URL}/documents`));
  if (!res.ok) throw new Error(`listDocuments failed: ${res.status}`);
  const data = await res.json();
  console.log("[AzureApi] /documents response:", data);
  // Handle both plain array and { value: [...] } wrapper shapes
  const rawArray = Array.isArray(data) ? data : (Array.isArray(data?.value) ? data.value : []);
  // Normalize: tags array → comma string, summary → description
  const normalized = rawArray.map(d => ({
    ...d,
    tags:        Array.isArray(d.tags) ? d.tags.join(", ") : (d.tags || ""),
    description: d.summary || d.description || "",
  }));
  return normalized;
};

// ─────────────────────────────────────────────
// Upload
// ─────────────────────────────────────────────

/**
 * Upload a single file to the Azure Function App.
 * @param {File}   file        - The File object from an <input type="file">
 * @param {string} description - Optional description
 * @param {string} tags        - Comma-separated tags string
 * @param {function} onProgress - Optional callback(percent: number)
 * @param {object} extraFields  - Optional extra FormData fields (e.g. { temp, session_id })
 * @returns {{ id, filename, blob_url, message }}
 */
export const uploadDocument = async (file, description = "", tags = "", onProgress = null, extraFields = {}) => {
  console.log("[AzureApi] POST /upload →", file.name);
  const formData = new FormData();
  formData.append("file", file);
  formData.append("filename", file.name);
  formData.append("description", description);
  formData.append("tags", tags);

  // Append any extra fields (e.g. temp, session_id)
  Object.entries(extraFields).forEach(([k, v]) => formData.append(k, v));

  // Use XMLHttpRequest if progress tracking is needed
  if (onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", withKey(`${AZURE_BASE_URL}/upload`));

      // Append extra fields to formData before sending
      Object.entries(extraFields).forEach(([k, v]) => {
        if (!formData.has(k)) formData.append(k, v);
      });

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
            if (parsed.duplicate) errMsg = parsed.error; // friendly duplicate message
          } catch {}
          reject(new Error(errMsg));
        }
      };

      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.send(formData);
    });
  }

  const res = await fetch(withKey(`${AZURE_BASE_URL}/upload`), {
    method: "POST",
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

/**
 * Get the download URL for a document (proxied through the Function App).
 * @param {string} documentId
 * @returns {{ file_url: string, filename: string }}
 */
export const downloadDocument = async (documentId) => {
  console.log("[AzureApi] GET /file?id=", documentId);
  // The /file endpoint streams the blob — construct the URL with the function key
  const file_url = withKey(`${AZURE_BASE_URL}/file?id=${documentId}`);
  // We need the filename — fetch documents list or just return the URL
  return { file_url, filename: "" };
};

// ─────────────────────────────────────────────
// Delete
// ─────────────────────────────────────────────

/**
 * Delete a document by ID (synchronous cascade delete).
 * @param {string} documentId
 * @returns {{ id, status, details, errors, correlation_id }}
 */
export const deleteDocument = async (documentId) => {
  console.log("[AzureApi] DELETE /document/", documentId);
  const res = await fetch(withKey(`${AZURE_BASE_URL}/document/${documentId}`), {
    method: "DELETE",
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

/**
 * Send a natural-language query against uploaded documents.
 *
 * Response shape (type discriminated):
 *   { type: "text",  answer, query, sources }
 *   { type: "table", answer, columns, rows, script, query, sources }
 *   { type: "chart", answer, data, chart_config, script, query, sources }
 *   { type: "error", answer, invalid_columns, available_columns, suggestions }
 *
 * @param {string} question       - Natural language question
 * @param {string} filenameFilter - Optional filename to scope the search
 */
// Keywords that signal the user wants a chart
const CHART_INTENT_KEYWORDS = [
  "plot", "chart", "graph", "visualize", "visualise",
  "bar chart", "pie chart", "line chart", "show me a graph",
  "how many", "count", "distribution", "breakdown",
];

const detectChartIntent = (question) =>
  CHART_INTENT_KEYWORDS.some((kw) => question.toLowerCase().includes(kw));

export const queryDocuments = async (question, filenameFilter = "", history = []) => {
  console.log("[AzureApi] POST /query →", question);
  const res = await fetch(withKey(`${AZURE_BASE_URL}/query`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

/**
 * Delete all temp blobs and entities for a session.
 * Called when user clicks "Clear Chat" in Files Knowledge Bot.
 * @param {string} sessionId
 */
export const cleanupSession = async (sessionId) => {
  console.log("[AzureApi] POST /cleanup-session →", sessionId);
  const res = await fetch(withKey(`${AZURE_BASE_URL}/cleanup-session`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Cleanup failed: ${res.status}`);
  }
  return res.json();
};
