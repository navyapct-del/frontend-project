import { useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import ScrollToTop from "@/base-components/scroll-to-top/Main";
import { BrowserRouter } from "react-router-dom";
import { RecoilRoot } from "recoil";
import Router from "./router";

function App() {
  const { isAuthenticated, isLoading, loginWithRedirect, user } = useAuth0();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      // Silent SSO — reuse existing session, never show login page
      loginWithRedirect({ authorizationParams: { prompt: "none" } }).catch(() => {
        // Session doesn't exist in the other app either — do nothing
      });
    } else if (user?.email) {
      // Persist email so existing components (userEmail.js) pick it up
      localStorage.setItem("userEmail", user.email);
    }
  }, [isLoading, isAuthenticated, user]);

  if (isLoading) return null;

  return (
    <RecoilRoot>
      <BrowserRouter>
        <Router />
        <ScrollToTop />
      </BrowserRouter>
    </RecoilRoot>
  );
}

export default App;
