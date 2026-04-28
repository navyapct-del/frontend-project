import { useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate, useLocation } from "react-router-dom";
import ScrollToTop from "@/base-components/scroll-to-top/Main";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { RecoilRoot } from "recoil";
import Router from "./router";

function AuthHandler() {
  const { isAuthenticated, isLoading, loginWithRedirect, handleRedirectCallback, getTokenSilently, user } = useAuth0();
  const location = useLocation();

  useEffect(() => {
    if (isLoading) return;

    // Handle Auth0 callback redirect
    if (location.search.includes("code=") && location.search.includes("state=")) {
      handleRedirectCallback().then(() => {
        window.history.replaceState({}, document.title, "/");
      }).catch(() => {});
      return;
    }

    if (isAuthenticated) {
      if (user?.email) localStorage.setItem("userEmail", user.email);
      return;
    }

    // Try silent SSO — only redirects if a session already exists in Auth0
    getTokenSilently().catch((err) => {
      if (err.error === "login_required" || err.error === "consent_required") {
        // No session exists — stay as guest, don't redirect
        return;
      }
      // Session exists but needs redirect (e.g. MFA) — do silent redirect
      loginWithRedirect({ authorizationParams: { prompt: "none" } }).catch(() => {});
    });
  }, [isLoading, isAuthenticated, location.search]);

  if (isLoading) return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh" }}>Loading...</div>;

  return (
    <>
      <Router />
      <ScrollToTop />
    </>
  );
}

function App() {
  return (
    <RecoilRoot>
      <BrowserRouter>
        <AuthHandler />
      </BrowserRouter>
    </RecoilRoot>
  );
}

export default App;
