import React, { createContext, useState, useEffect } from "react";

const AccountContext = createContext();

const Account = (props) => {
  const [userdetails, setUserdetails] = useState({});
  const [userEmail, setUserEmail]     = useState("");
  const [userName, setUserName]       = useState("");

  useEffect(() => {
    getSession();
  }, []);

  const getSession = () => {
    const token = localStorage.getItem("kc_token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setUserEmail(payload.email || "");
        setUserName(payload.name || "");
        setUserdetails(payload);
        return payload;
      } catch {}
    }
    return {};
  };

  const logout = () => {
    localStorage.removeItem("kc_token");
    window.location.href = "/";
  };

  return (
    <AccountContext.Provider value={{ getSession, logout, userdetails, userEmail, userName }}>
      {props.children}
    </AccountContext.Provider>
  );
};

export { Account, AccountContext };
