/**
 * fileValidation.js
 * Shared file-type validation utility.
 * Checks both MIME type and file extension against the allowed list.
 */

export const ALLOWED_MIME = new Set([
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/svg+xml",
  "image/webp",
  // Documents
  "application/pdf",
  // CSV — browsers report different MIME types for CSV
  "text/csv",
  "application/csv",
  "text/plain",
  "application/vnd.ms-excel",
  // Excel
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  // Word
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  // Text
  "text/plain",
]);

export const ALLOWED_EXT = new Set([
  "jpg", "jpeg", "png", "gif", "svg", "webp",
  "pdf",
  "csv",
  "xls", "xlsx",
  "doc", "docx",
  "txt",
]);

/**
 * Returns true if the file's MIME type OR extension is in the allowed set.
 * @param {File} file
 * @returns {boolean}
 */
export function validateFileType(file) {
  if (!file) return false;
  const ext = file.name.split(".").pop().toLowerCase();
  // Always allow by extension — MIME types are unreliable across browsers/OS
  return ALLOWED_EXT.has(ext) || ALLOWED_MIME.has(file.type);
}
