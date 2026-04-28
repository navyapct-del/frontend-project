import { useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import ScrollToTop from "@/base-components/scroll-to-top/Main";
import { BrowserRouter } from "react-router-dom";
import { RecoilRoot } from "recoil";
import Router from "./router";

function AuthHandler() {
  const { isAuthenticated, isLoading, getTokenSilently, user } = useAuth0();

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) {
      if (user?.email) localStorage.setItem("userEmail", user.email);
      return;
    }
    // Try silent SSO — uses hidden iframe, no redirect if no session
    getTokenSilently().catch(() => {
      // No session — stay as guest
    });
  }, [isLoading, isAuthenticated, user]);

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontSize: "16px" }}>
        Loading...
      </div>
    );
  }

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
