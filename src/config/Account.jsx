import React, { createContext, useState, useEffect } from "react";

const AccountContext = createContext();

const Account = (props) => {
  const [userdetails, setUserdetails] = useState({});
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");

  useEffect(() => {
    getSession();
  }, []);

  const getSession = () => {
    const token = localStorage.getItem("kc_token");
    if (token) {
      const payload = JSON.parse(atob(token.split(".")[1]));
      setUserEmail(payload.email || "");
      setUserName(payload.name || "");
      setUserdetails(payload);
    }
  };

  const authenticate = async (username, password) => {
    const res = await fetch(
      `/keycloak/realms/dataocd/protocol/openid-connect/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "password",
          client_id: "frontend-app",
          username,
          password,
        }),
      }
    );
    const data = await res.json();
    if (data.access_token) {
      localStorage.setItem("kc_token", data.access_token);
      localStorage.setItem("kc_refresh_token", data.refresh_token);
      getSession();
    }
    return data;
  };

  const logout = () => {
    localStorage.removeItem("kc_token");
    localStorage.removeItem("kc_refresh_token");
    window.location.href = "/";
  };

  return (
    <AccountContext.Provider
      value={{ authenticate, getSession, logout, userdetails, userEmail, userName }}
    >
      {props.children}
    </AccountContext.Provider>
  );
};

export { Account, AccountContext };
