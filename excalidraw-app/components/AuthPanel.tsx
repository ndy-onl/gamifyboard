import React, { useState } from "react";
import { useAtom } from "jotai";

import { authAtom } from "../state/auth";
import { loginUser, registerUser, getProfile } from "../src/api";

const AuthPanel = ({ authPanelView, setAuthPanelView }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const setAuth = useSetAtom(authAtom);

  if (!authPanelView) {
    return null;
  }

  const isLoginView = authPanelView === "login";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      let response;
      if (isLoginView) {
        response = await loginUser(email, password);
        console.log("Login successful:", response.data);
      } else {
        response = await registerUser(email, password);
        console.log("Registration successful:", response.data);
      }
      setAuth({
        user: response.data.user,
        accessToken: response.data.access_token,
      }); // Set the global auth state
      setAuthPanelView(null); // Close panel on success

      /* --- TEST CASE --- 
      // Fetch profile right after login to test the interceptor
      try {
        const profileResponse = await getProfile();
        console.log('Successfully fetched profile:', profileResponse.data);
      } catch (profileError) {
        console.error('Could not fetch profile after login:', profileError);
      }
      // --- END TEST CASE --- */
    } catch (err) {
      console.error(`${isLoginView ? "Login" : "Registration"} error:`, err);
      setError(
        `${isLoginView ? "Login" : "Registration"} failed. Please try again.`,
      );
    }
  };

  const handleEmailKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow backspace and delete keys to function normally
    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.stopPropagation();
      return;
    }

    // Allow character keys and other common input keys (e.g., arrow keys, tab)
    // This is a simplified check; a more robust solution might involve checking event.keyCode or event.code
    // to differentiate between character keys and control keys more precisely.
    if (event.key.length === 1 || event.ctrlKey || event.altKey || event.metaKey) {
      event.stopPropagation();
    }
  };

  return (
    <div className="properties-sidebar auth-panel">
      <div className="properties-sidebar-header">
        <h3>{isLoginView ? "Login" : "Register"}</h3>
        <button className="close" onClick={() => setAuthPanelView(null)}>
          &#x2715;
        </button>
      </div>
      <div className="properties-sidebar-content">
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleEmailKeyDown} // Add this line
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="error">{error}</p>}
          <button type="submit">{isLoginView ? "Login" : "Register"}</button>
        </form>
        <div className="Modal__switch">
          {isLoginView ? (
            <p>
              Noch kein Account?{" "}
              <span
                className="Modal__switch-link"
                onClick={() => setAuthPanelView("register")}
              >
                Hier registrieren
              </span>
            </p>
          ) : (
            <p>
              Bereits einen Account?{" "}
              <span
                className="Modal__switch-link"
                onClick={() => setAuthPanelView("login")}
              >
                Hier einloggen
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPanel;