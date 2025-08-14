import React, { useState } from 'react';
import { useSetAtom } from 'jotai';
import { authAtom } from '../state/auth';
import { loginUser, registerUser, getProfile } from '../src/api';

const AuthPanel = React.forwardRef(({ authPanelView, setAuthPanelView }, ref) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const setAuth = useSetAtom(authAtom);

  if (!authPanelView) {
    return null;
  }

  const isLoginView = authPanelView === 'login';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      let response;
      if (isLoginView) {
        response = await loginUser(email, password);
        console.log('Login successful:', response.data);
      } else {
        response = await registerUser(email, password);
        console.log('Registration successful:', response.data);
      }
      setAuth({ user: response.data.user, accessToken: response.data.access_token }); // Set the global auth state
      localStorage.setItem('accessToken', response.data.access_token); // Added for persistent login
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
      console.error(`${isLoginView ? 'Login' : 'Registration'} error:`, err);
      setError(`${isLoginView ? 'Login' : 'Registration'} failed. Please try again.`);
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
