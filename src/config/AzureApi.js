/**
 * AzureApi.js
 * -----------
 * All calls to the Azure Function App backend.
 * Change AZURE_BASE_URL to your deployed Function App URL when going to production.
 */

const AZURE_BASE_URL = import.meta.env.VITE_AZURE_API_URL || "http://localhost:7071/api";

console.log("[AzureApi] Base URL:", AZURE_BASE_URL);

// ─────────────────────────────────────────────
// Health
// ─────────────────────────────────────────────

export const checkHealth = async () => {
  console.log("[AzureApi] GET /health");
  const res = await fetch(`${AZURE_BASE_URL}/health`);
  return res.json();
};

// ─────────────────────────────────────────────
// Documents — list
// ─────────────────────────────────────────────

export const listDocuments = async () => {
  console.log("[AzureApi] GET /documents →", `${AZURE_BASE_URL}/documents`);
  const res = await fetch(`${AZURE_BASE_URL}/documents`);
  if (!res.ok) throw new Error(`listDocuments failed: ${res.status}`);
  const data = await res.json();
  console.log("[AzureApi] /documents response:", data);
  return data;
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
 * @returns {{ id, filename, blob_url, message }}
 */
export const uploadDocument = async (file, description = "", tags = "", onProgress = null) => {
  console.log("[AzureApi] POST /upload →", file.name);
  const formData = new FormData();
  formData.append("file", file);
  formData.append("filename", file.name);
  formData.append("description", description);
  formData.append("tags", tags);

  // Use XMLHttpRequest if progress tracking is needed
  if (onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${AZURE_BASE_URL}/upload`);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };

      xhr.onload = () => {
        if (xhr.status === 201) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new Error(`Upload failed: ${xhr.status} — ${xhr.responseText}`));
        }
      };

      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.send(formData);
    });
  }

  const res = await fetch(`${AZURE_BASE_URL}/upload`, {
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
// Delete
// ─────────────────────────────────────────────

/**
 * Delete a document by ID (synchronous cascade delete).
 * @param {string} documentId
 * @returns {{ id, status, details, errors, correlation_id }}
 */
export const deleteDocument = async (documentId) => {
  console.log("[AzureApi] DELETE /document/", documentId);
  const res = await fetch(`${AZURE_BASE_URL}/document/${documentId}`, {
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
  const res = await fetch(`${AZURE_BASE_URL}/query`, {
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
