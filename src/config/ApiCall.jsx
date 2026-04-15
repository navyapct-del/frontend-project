/**
 * ApiCall.jsx
 * -----------
 * All legacy AWS calls replaced with Azure Function App equivalents.
 * Endpoints map to: https://dataocrhfunapp-g6ekg0bvhqfycma2.eastus-01.azurewebsites.net/api
 */

import { uploadDocument, listDocuments, checkHealth, queryDocuments } from "./AzureApi";

export const fetchTagsData = async (type, currentLoc, checkboxes) => {
  const docs = await listDocuments();
  return docs.filter((d) => {
    const matchType = !type || d.type === type;
    const matchLoc = !currentLoc || d.folder === currentLoc;
    return matchType && matchLoc;
  });
};

export const listObjects = async (type, currentLoc) => {
  const docs = await listDocuments();
  return docs.filter((d) => {
    const matchType = !type || d.type === type;
    const matchLoc = !currentLoc || d.folder === currentLoc;
    return matchType && matchLoc;
  });
};

export const getUploadData = async (inputFields, userEmail, currentFolder) => {
  const requests = inputFields.map((field) =>
    uploadDocument(
      field.selectedFile[0],
      field.description || "",
      field.manualtags || "",
      null,
      { userinfo: userEmail, current_folder: currentFolder }
    )
  );
  await Promise.all(requests);
};

const AZURE_BASE_URL = import.meta.env.VITE_AZURE_API_URL || "http://localhost:7071/api";
const FUNCTION_KEY   = import.meta.env.VITE_AZURE_FUNCTION_KEY || "";

function withKey(url) {
  if (!FUNCTION_KEY) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}code=${FUNCTION_KEY}`;
}

export const createKendraIndex = async () => {
  const res = await fetch(withKey(`${AZURE_BASE_URL}/reset-index`), { method: "POST" });
  return res.json();
};

export const getKendraStatus = async () => {
  const res = await fetch(withKey(`${AZURE_BASE_URL}/diagnose`));
  return res.json();
};

export const getStepFunctionStatus = async () => {
  return checkHealth();
};

export const deleteKendraIndex = async () => {
  const res = await fetch(withKey(`${AZURE_BASE_URL}/reset-index`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ confirm_delete: true }),
  });
  return res.json();
};
