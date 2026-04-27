const STORAGE_KEY = "userEmail";
const PARAM_KEY = "userEmail";
const FALLBACK = "guest@demo.com";

// Read from URL param, persist to localStorage, then return
const params = new URLSearchParams(window.location.search);
const fromUrl = params.get(PARAM_KEY);
if (fromUrl) {
  localStorage.setItem(STORAGE_KEY, fromUrl);
}

export const userEmail =
  localStorage.getItem(STORAGE_KEY) || FALLBACK;
