import React, { useState } from 'react';
import { useSetAtom } from 'jotai';
import { loginActionAtom } from '../state/authAtoms'; // Neuer Import
import { registerUser } from '../src/api'; // registerUser beibehalten, falls noch für die Registrierung verwendet

const AuthPanel = React.forwardRef(({ authPanelView, setAuthPanelView, onLoginSuccess }, ref) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const setLoginAction = useSetAtom(loginActionAtom); // NEU: setLoginAction verwenden

  if (!authPanelView) {
    return null;
  }

  const isLoginView = authPanelView === 'login';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (isLoginView) {
        await setLoginAction({ email, password }); // Call the action atom
      } else {
        // If registerUser is still used for registration, keep it.
        // Otherwise, you might want a registerActionAtom as well.
        const response = await registerUser(email, password);
        console.log('Registration successful:', response.data);
        // For registration, you might still need to call onLoginSuccess or update authAtom
        // depending on whether registration automatically logs in.
      }
      setSuccess('Login successful!'); // Set success message
      onLoginSuccess(); // Notify parent component

    } catch (err) {
      console.error(`${isLoginView ? 'Login' : 'Registration'} error:`, err);
      setError(`${isLoginView ? 'Login' : 'Registration'} failed. Please try again. Details: ${err.message || err}`);
    } finally {
      setAuthPanelView(null); // Close panel on success
    }
  };

  return (
    <div className="properties-sidebar auth-panel" ref={ref}>
      <div className="properties-sidebar-header">
        <h3>{isLoginView ? 'Login' : 'Register'}</h3>
      </div>
      <div className="properties-sidebar-content">
        <form onSubmit={handleSubmit}>
          <div>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              required
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              required
            />
          </div>
          {error && <p className="error">{error}</p>}
          {success && <p className="success">{success}</p>}
          <div>
            <button type="submit">{isLoginView ? 'Login' : 'Register'}</button>
          </div>
        </form>
        <div className="Modal__switch">
          {isLoginView ? (
            <p>
              Noch kein Account?{" "}
              <span className="Modal__switch-link" onClick={() => setAuthPanelView('register')}>
                Hier registrieren
              </span>
            </p>
          ) : (
            <p>
              Bereits einen Account?{" "}
              <span className="Modal__switch-link" onClick={() => setAuthPanelView('login')}>
                Hier einloggen
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}); // Closing for React.forwardRef

export default AuthPanel;
