const STORAGE_KEY = "userEmail";
const FALLBACK = "guest@demo.com";

export function useUserEmail() {
  return localStorage.getItem(STORAGE_KEY) || FALLBACK;
}
