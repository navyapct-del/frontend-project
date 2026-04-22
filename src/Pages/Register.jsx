import dom from "@left4code/tw-starter/dist/js/dom";
import logoUrl from "@/assets/images/white-logo.png";
import illustrationUrl from "@/assets/images/illustration.svg";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const KEYCLOAK_URL = "https://data-orch-apim-consumption.azure-api.net/auth";
const REALM = "dataocd";
const ADMIN_CLIENT_ID = "admin-cli";

// Get admin token then create user
async function registerWithKeycloak(firstName, lastName, email, password) {
  // 1. Get admin token
  const tokenRes = await fetch(
    `${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "password",
        client_id: ADMIN_CLIENT_ID,
        username: "cloudthat",
        password: "cloudthat@123",
      }),
    }
  );
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error("Admin auth failed");

  // 2. Create user
  const createRes = await fetch(
    `${KEYCLOAK_URL}/admin/realms/${REALM}/users`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenData.access_token}`,
      },
      body: JSON.stringify({
        firstName,
        lastName,
        email,
        username: email,
        enabled: true,
        emailVerified: true,
        credentials: [{ type: "password", value: password, temporary: false }],
      }),
    }
  );

  if (createRes.status === 409) throw new Error("User already exists.");
  if (!createRes.ok) throw new Error("Registration failed. Please try again.");
}

function Main() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    dom("body").removeClass("main").removeClass("error-page").addClass("login");
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) return setError("Passwords do not match.");
    if (password.length < 8)  return setError("Password must be at least 8 characters.");
    setLoading(true);
    try {
      await registerWithKeycloak(firstName, lastName, email, password);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container sm:px-10">
      <div className="block xl:grid grid-cols-2 gap-4">
        <div className="hidden xl:flex flex-col min-h-screen">
          <a href="" className="-intro-x flex items-center pt-5">
            <img alt="Logo" className="w-auto h-6" src={logoUrl} />
          </a>
          <div className="my-auto">
            <img alt="" className="-intro-x w-1/2 -mt-16" src={illustrationUrl} />
            <div className="-intro-x text-white font-medium text-4xl leading-tight mt-10">
              Create your account
            </div>
            <div className="-intro-x mt-5 text-lg text-white text-opacity-70">
              Manage all your data in one place
            </div>
          </div>
        </div>

        <div className="h-screen xl:h-auto flex py-5 xl:py-0 my-10 xl:my-0">
          <div className="my-auto mx-auto xl:ml-20 bg-white dark:bg-darkmode-600 xl:bg-transparent px-5 sm:px-8 py-8 xl:p-0 rounded-md shadow-md xl:shadow-none w-full sm:w-3/4 lg:w-2/4 xl:w-auto">
            <h2 className="intro-x font-bold text-2xl xl:text-3xl text-center xl:text-left">
              Register
            </h2>

            {success ? (
              <div className="mt-6 text-center">
                <p className="text-green-600 font-medium text-lg">Account created successfully!</p>
                <button
                  className="btn bg-cyan-900 text-white py-3 px-6 mt-4"
                  onClick={() => navigate("/")}
                >
                  Go to Login
                </button>
              </div>
            ) : (
              <form className="mt-6" onSubmit={onSubmit}>
                <div className="intro-x mt-8 space-y-4">
                  <input
                    type="text"
                    className="intro-x login__input form-control py-3 px-4 block"
                    placeholder="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                  <input
                    type="text"
                    className="intro-x login__input form-control py-3 px-4 block"
                    placeholder="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                  <input
                    type="email"
                    className="intro-x login__input form-control py-3 px-4 block"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <input
                    type="password"
                    className="intro-x login__input form-control py-3 px-4 block"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <input
                    type="password"
                    className="intro-x login__input form-control py-3 px-4 block"
                    placeholder="Confirm Password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                  />
                </div>

                {error && <p className="text-red-500 mt-3 text-center text-sm">{error}</p>}

                <div className="intro-x mt-5 xl:mt-8 text-center xl:text-left">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn bg-cyan-900 text-white py-3 px-4 w-full xl:w-32 xl:mr-3 align-top"
                  >
                    {loading ? "Registering..." : "Register"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary py-3 px-4 w-full xl:w-32 mt-3 xl:mt-0 align-top"
                    onClick={() => navigate("/")}
                  >
                    Sign In
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Main;
