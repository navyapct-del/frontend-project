/**
 * fileValidation.js
 * Shared file-type validation utility.
 * Checks both MIME type and file extension against the allowed list.
 */

export const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "application/pdf",
  "text/csv",
]);

export const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "pdf", "csv"]);

/**
 * Returns true if the file's MIME type OR extension is in the allowed set.
 * @param {File} file
 * @returns {boolean}
 */
export function validateFileType(file) {
  if (!file) return false;
  const ext = file.name.split(".").pop().toLowerCase();
  return ALLOWED_MIME.has(file.type) || ALLOWED_EXT.has(ext);
}
