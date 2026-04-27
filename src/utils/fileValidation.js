/**
 * fileValidation.js
 * Shared file-type validation utility.
 * Checks both MIME type and file extension against the allowed list.
 */

export const ALLOWED_MIME = new Set([
  "image/jpeg", "image/png", "image/gif", "image/svg+xml", "image/webp",
  "application/pdf",
  "text/csv", "application/csv", "text/plain", "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export const ALLOWED_EXT = new Set([
  "jpg", "jpeg", "png", "gif", "svg", "webp",
  "pdf", "csv", "xls", "xlsx", "doc", "docx", "txt",
]);

/**
 * Returns true if the file's MIME type OR extension is in the allowed set.
 * @param {File} file
 * @returns {boolean}
 */
export function validateFileType(file) {
  if (!file) return false;
  const ext = file.name.split(".").pop().toLowerCase();
  return ALLOWED_EXT.has(ext) || ALLOWED_MIME.has(file.type);
}
