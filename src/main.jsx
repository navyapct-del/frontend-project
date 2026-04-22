import { createRoot } from "react-dom/client";
import App from "./App";
import "./assets/css/app.css";
import keycloak from "./keycloak";

keycloak.init({ onLoad: "login-required" }).then((authenticated) => {
  if (authenticated) {
    const container = document.getElementById("root");
    const root = createRoot(container);
    root.render(<App />);
  }
});
