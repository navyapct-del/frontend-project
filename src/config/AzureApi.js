/**
 * AzureApi.js
 * All calls go through APIM → Azure Function App backend.
 */

const AZURE_BASE_URL = import.meta.env.VITE_AZURE_API_URL || "http://localhost:7071/api";

// Returns headers with Keycloak token + APIM subscription key
const authHeaders = () => {
  const token = localStorage.getItem("kc_token");
  return {
    "Ocp-Apim-Subscription-Key": "d9668940e6b645b0a1f915ca6ae832cd",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// ─────────────────────────────────────────────
// Health
// ─────────────────────────────────────────────

export const checkHealth = async () => {
  const res = await fetch(`${AZURE_BASE_URL}/health`, { headers: authHeaders() });
  return res.json();
};

// ─────────────────────────────────────────────
// Documents — list
// ─────────────────────────────────────────────

export const listDocuments = async (userEmail = "") => {
  const url = userEmail
    ? `${AZURE_BASE_URL}/documents?uploaded_by=${encodeURIComponent(userEmail)}`
    : `${AZURE_BASE_URL}/documents`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error(`listDocuments failed: ${res.status}`);
  const data = await res.json();
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
      const headers = authHeaders();
      Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));

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
    headers: authHeaders(),
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Upload failed: ${res.status}`);
  }
  return res.json();
};

// ─────────────────────────────────────────────
// Download — get SAS URL for private blob
// ─────────────────────────────────────────────

export const downloadDocument = async (documentId) => {
  const res = await fetch(`${AZURE_BASE_URL}/download/${documentId}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Failed to get download URL: ${res.status}`);
  return res.json(); // { sas_url, filename }
};

export const getPreviewUrl = async (documentId) => {
  const res = await fetch(`${AZURE_BASE_URL}/download/${documentId}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Failed to get preview URL: ${res.status}`);
  const { sas_url } = await res.json();
  return sas_url;
};

// ─────────────────────────────────────────────
// Delete
// ─────────────────────────────────────────────

export const deleteDocument = async (documentId) => {
  const res = await fetch(`${AZURE_BASE_URL}/document/${documentId}`, {
    method: "DELETE",
    headers: authHeaders(),
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
  const res = await fetch(`${AZURE_BASE_URL}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
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
// Chat history — save a single message
// ─────────────────────────────────────────────

export const saveMessage = async (userId, sessionId, message, role) => {
  const res = await fetch(`${AZURE_BASE_URL}/saveMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ userId, sessionId, message, role }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `saveMessage failed: ${res.status}`);
  }
  return res.json();
};

// ─────────────────────────────────────────────
// Cleanup session (temp blobs for Files Knowledge Bot)
// ─────────────────────────────────────────────

export const cleanupSession = async (sessionId) => {
  const res = await fetch(`${AZURE_BASE_URL}/cleanup-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ session_id: sessionId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Cleanup failed: ${res.status}`);
  }
  return res.json();
};

// ─────────────────────────────────────────────
// Chat history — get all messages for a session
// ─────────────────────────────────────────────

export const getChatSession = async (userId, sessionId) => {
  const res = await fetch(
    `${AZURE_BASE_URL}/chatSession/${encodeURIComponent(sessionId)}?userId=${encodeURIComponent(userId)}`,
    { headers: authHeaders() }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `getChatSession failed: ${res.status}`);
  }
  return res.json(); // { sessionId, messages: [{role, content, timestamp}] }
};

// ─────────────────────────────────────────────
// Chat history — list sessions for a user
// ─────────────────────────────────────────────

export const getChatSessions = async (userId) => {
  const res = await fetch(`${AZURE_BASE_URL}/chatSessions?userId=${encodeURIComponent(userId)}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `getChatSessions failed: ${res.status}`);
  }
  return res.json(); // [{ sessionId, title, updatedAt }]
};

// ─────────────────────────────────────────────
// Chat history — delete a session
// ─────────────────────────────────────────────

export const deleteChat = async (userId, sessionId) => {
  const res = await fetch(
    `${AZURE_BASE_URL}/chatSession/${encodeURIComponent(sessionId)}?userId=${encodeURIComponent(userId)}`,
    { method: "DELETE", headers: authHeaders() }
  );
  if (!res.ok && res.status !== 404) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `deleteChat failed: ${res.status}`);
  }
  return res.json().catch(() => ({}));
};

// ─────────────────────────────────────────────
// Chat history — share a session
// ─────────────────────────────────────────────

export const shareChat = async (userId, sessionId) => {
  const res = await fetch(`${AZURE_BASE_URL}/shareChat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ userId, sessionId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `shareChat failed: ${res.status}`);
  }
  return res.json(); // { shareUrl }
};

// ─────────────────────────────────────────────
// Chat history — sync Blob → Table (backfill existing chats)
// ─────────────────────────────────────────────

export const syncChat = async (userId) => {
  const res = await fetch(`${AZURE_BASE_URL}/syncChat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `syncChat failed: ${res.status}`);
  }
  return res.json(); // { status, sessionsSynced }
};
