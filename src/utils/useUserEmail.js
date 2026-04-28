import { useAuth0 } from "@auth0/auth0-react";

/**
 * Returns the authenticated user's email from Auth0.
 * Falls back to localStorage (set on login) then to guest.
 */
export function useUserEmail() {
  const { user } = useAuth0();
  return user?.email || localStorage.getItem("userEmail") || "guest@demo.com";
}
