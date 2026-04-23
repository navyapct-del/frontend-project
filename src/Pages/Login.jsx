import dom from "@left4code/tw-starter/dist/js/dom";
import logoUrl from "@/assets/images/white-logo.png";
import illustrationUrl from "@/assets/images/illustration.svg";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_AZURE_API_URL || "http://localhost:7071/api";

function Main() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    dom("body").removeClass("main").removeClass("error-page").addClass("login");
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.access_token) {
        localStorage.setItem("kc_token", data.access_token);
        navigate("/top-menu/documentscontent");
      } else {
        setError(data.error || "Invalid credentials");
      }
    } catch {
      setError("Login failed. Please try again.");
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
              A few more clicks to <br /> sign in to your account.
            </div>
            <div className="-intro-x mt-5 text-lg text-white text-opacity-70">
              Manage all your data in one place
            </div>
          </div>
        </div>

        <div className="h-screen xl:h-auto flex py-5 xl:py-0 my-10 xl:my-0">
          <div className="my-auto mx-auto xl:ml-20 bg-white dark:bg-darkmode-600 xl:bg-transparent px-5 sm:px-8 py-8 xl:p-0 rounded-md shadow-md xl:shadow-none w-full sm:w-3/4 lg:w-2/4 xl:w-auto">
            <h2 className="intro-x font-bold text-2xl xl:text-3xl text-center xl:text-left">
              Sign In
            </h2>
            <form className="mt-6" onSubmit={onSubmit}>
              <div className="intro-x mt-8">
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
                  className="intro-x login__input form-control py-3 px-4 block mt-4"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                  {loading ? "Signing in..." : "Login"}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary py-3 px-4 w-full xl:w-32 mt-3 xl:mt-0 align-top"
                  onClick={() => navigate("/register")}
                >
                  Register
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Main;
