import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import keycloak from "../keycloak";

function KeycloakCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    keycloak
      .init({ onLoad: "check-sso", responseMode: "query" })
      .then((authenticated) => {
        if (authenticated) {
          localStorage.setItem("kc_token", keycloak.token);
          localStorage.setItem("kc_refresh_token", keycloak.refreshToken);
          navigate("/top-menu/documentscontent");
        } else {
          navigate("/");
        }
      })
      .catch(() => navigate("/"));
  }, []);

  return <div>Logging in...</div>;
}

export default KeycloakCallback;
