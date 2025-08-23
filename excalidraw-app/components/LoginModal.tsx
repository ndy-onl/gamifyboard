import React, { useState } from "react";

import { useSetAtom } from "../app-jotai";
import { loginActionAtom } from "../state/authAtoms";

const LoginModal = ({ onClose, onSwitchToRegister }: { onClose: () => void; onSwitchToRegister: () => void; }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const setLoginAction = useSetAtom(loginActionAtom);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    try {
      await setLoginAction({ email, password });
      onClose();
    } catch (err: any) {
      setError("Login failed. Please check your credentials.");
      console.error("Login error:", err);
    }
  };

  return (
    <div className="Modal">
      <div className="Modal__background" onClick={onClose} />
      <div className="Modal__content">
        <h2>Login</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
          <button type="submit">Login</button>
          <p className="Modal__forgot-password">
            <a
              href={`${
                import.meta.env.VITE_APP_MAIN_DOMAIN_URL
              }/reset-password`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Passwort vergessen?
            </a>
          </p>
          <p className="Modal__switch">
            Noch kein Account?{" "}
            <span className="Modal__switch-link" onClick={onSwitchToRegister}>
              Hier registrieren
            </span>
          </p>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;
