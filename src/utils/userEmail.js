const STORAGE_KEY = "userEmail";
const FALLBACK = "guest@demo.com";

// Read from localStorage (set by App.jsx after Auth0 login)
export const userEmail = localStorage.getItem(STORAGE_KEY) || FALLBACK;
