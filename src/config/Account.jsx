import React, { createContext, useState, useEffect } from "react";
import keycloak from "../keycloak";

const AccountContext = createContext();

const Account = (props) => {
  const [userdetails, setUserdetails] = useState({});
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");

  useEffect(() => {
    getSession();
  }, []);

  const getSession = async () => {
    if (keycloak.authenticated) {
      const profile = await keycloak.loadUserProfile();
      setUserEmail(profile.email || "");
      setUserName(`${profile.firstName || ""} ${profile.lastName || ""}`.trim());
      setUserdetails(keycloak.tokenParsed || {});
    }
  };

  const authenticate = async (Username, Password) => {
    // Keycloak handles login via its own UI; direct login via keycloak.login()
    return keycloak.login();
  };

  const logout = () => {
    keycloak.logout({ redirectUri: window.location.origin });
  };

  return (
    <AccountContext.Provider
      value={{
        authenticate,
        getSession,
        logout,
        userdetails,
        userEmail,
        userName,
      }}
    >
      {props.children}
    </AccountContext.Provider>
  );
};

export { Account, AccountContext };
