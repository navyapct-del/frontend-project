/**
 * ApiCall.jsx
 * -----------
 * All calls go through APIM → Azure Function App backend.
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

// No function key needed — backend protected by APIM + IP restrictions
const authHeaders = {};

export const createKendraIndex = async () => {
  const res = await fetch(`${AZURE_BASE_URL}/reset-index`, {
    method: "POST",
    headers: authHeaders,
  });
  return res.json();
};

export const getKendraStatus = async () => {
  const res = await fetch(`${AZURE_BASE_URL}/diagnose`, { headers: authHeaders });
  return res.json();
};

export const getStepFunctionStatus = async () => {
  return checkHealth();
};

export const deleteKendraIndex = async () => {
  const res = await fetch(`${AZURE_BASE_URL}/reset-index`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders },
    body: JSON.stringify({ confirm_delete: true }),
  });
  return res.json();
};
