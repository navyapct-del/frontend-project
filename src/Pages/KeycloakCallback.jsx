import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

function KeycloakCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // Implicit flow: token is in the URL hash
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const token = params.get("access_token");

    if (token) {
      localStorage.setItem("kc_token", token);
      navigate("/top-menu/documentscontent");
    } else {
      navigate("/");
    }
  }, []);

  return <div>Logging in...</div>;
}

export default KeycloakCallback;
