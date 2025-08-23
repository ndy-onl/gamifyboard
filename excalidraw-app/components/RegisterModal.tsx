import React, { useState } from "react";

import { registerUser } from "../src/api";

const RegisterModal = ({ onClose }: { onClose: () => void; }) => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [error, setError] = useState("");

  const VITE_APP_MAIN_DOMAIN_URL = import.meta.env.VITE_APP_MAIN_DOMAIN_URL;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!termsAccepted || !privacyAccepted) {
      setError("You must accept the Terms and Conditions and Privacy Policy.");
      return;
    }

    try {
      const response = await registerUser(username, email, password);
      // TODO: Handle successful registration (e.g., show message, close modal, maybe login)
      console.log("Registration successful:", response.data);
      onClose();
    } catch (err: any) {
      setError("Registration failed. Please try again.");
      console.error("Registration error:", err);
    }
  };

  return (
    <div className="Modal">
      <div className="Modal__background" onClick={onClose} />
      <div className="Modal__content">
        <h2>Register</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
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
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <div className="checkbox-container">
            <input
              type="checkbox"
              id="terms"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              required
            />
            <label htmlFor="terms">
              I accept the{" "}
              <a
                href={`${VITE_APP_MAIN_DOMAIN_URL}/terms`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Terms and Conditions
              </a>
            </label>
          </div>
          <div className="checkbox-container">
            <input
              type="checkbox"
              id="privacy"
              checked={privacyAccepted}
              onChange={(e) => setPrivacyAccepted(e.target.checked)}
              required
            />
            <label htmlFor="privacy">
              I accept the{" "}
              <a
                href={`${VITE_APP_MAIN_DOMAIN_URL}/privacy`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Privacy Policy
              </a>
            </label>
          </div>
          {error && <p className="error">{error}</p>}
          <button type="submit">Register</button>
        </form>
      </div>
    </div>
  );
};

export default RegisterModal;
