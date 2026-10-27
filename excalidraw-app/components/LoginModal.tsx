import React, { useState } from 'react';
import { loginUser } from '../src/api';

const LoginModal = ({ onClose, onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await loginUser(email, password);
      // TODO: Handle successful login (e.g., save tokens, close modal, update UI)
      console.log('Login successful:', response.data);
      onClose();
    } catch (err) {
      setError('Login failed. Please check your credentials.');
      console.error('Login error:', err);
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
