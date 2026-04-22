import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const KEYCLOAK_URL = "/keycloak";
const REALM = "dataocd";
const CLIENT_ID = "frontend-app";
const REDIRECT_URI = "https://agreeable-glacier-0b749ee0f.7.azurestaticapps.net";

function KeycloakCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code");
    if (code) {
      fetch(`${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: CLIENT_ID,
          code,
          redirect_uri: REDIRECT_URI,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.access_token) {
            localStorage.setItem("kc_token", data.access_token);
            localStorage.setItem("kc_refresh_token", data.refresh_token);
            navigate("/top-menu/documentscontent");
          } else {
            navigate("/");
          }
        });
    } else {
      navigate("/");
    }
  }, []);

  return <div>Logging in...</div>;
}

export default KeycloakCallback;
