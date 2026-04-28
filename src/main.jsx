import { createRoot } from "react-dom/client";
import { Auth0Provider } from "@auth0/auth0-react";
import App from "./App";
import "./assets/css/app.css";

const onRedirectCallback = () => {
  window.history.replaceState({}, document.title, "/");
};

const container = document.getElementById("root");
const root = createRoot(container);

root.render(
  <Auth0Provider
    domain="dev-xttpygki3iv5gvuu.us.auth0.com"
    clientId="ugmg0j6vRn2BLkYI0Q5xzn2ej2NfFu4"
    authorizationParams={{ redirect_uri: window.location.origin }}
    cacheLocation="localstorage"
    onRedirectCallback={onRedirectCallback}
  >
    <App />
  </Auth0Provider>
);
