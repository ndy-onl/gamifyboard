import React, { useState } from 'react';
import { useSetAtom } from '../app-jotai';
import { useI18n } from '@excalidraw/excalidraw';
import Trans from '@excalidraw/excalidraw/components/Trans';
import { loginActionAtom } from '../state/authAtoms';
import { registerUser } from '../src/api';

const AuthPanel = React.forwardRef(({ authPanelView, setAuthPanelView, onLoginSuccess }, ref) => {
  const { t } = useI18n();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const setLoginAction = useSetAtom(loginActionAtom);

  if (!authPanelView) {
    return null;
  }

  const isLoginView = authPanelView === 'login';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isLoginView) {
      if (password !== confirmPassword) {
        setError(t('auth.passwordsDoNotMatch'));
        return;
      }
      if (!termsAccepted) {
        setError(t('auth.mustAcceptTerms'));
        return;
      }
    }

    try {
      if (isLoginView) {
        await setLoginAction({ email, password });
      } else {
        const response = await registerUser(username, email, password);
        console.log('Registration successful:', response.data);
        await setLoginAction({ email, password });
      }
      setSuccess(isLoginView ? t('auth.loginSuccessful') : t('auth.registrationSuccessful'));
      onLoginSuccess();

    } catch (err) {
      console.error(`${isLoginView ? 'Login' : 'Registration'} error:`, err);
      setError(t(isLoginView ? 'auth.loginFailed' : 'auth.registrationFailed', { details: err.message || '' }));
    } finally {
      if (success) {
        setAuthPanelView(null);
      }
    }
  };

  const mainDomainUrl = import.meta.env.VITE_APP_MAIN_DOMAIN_URL || 'https://gamifyboard.com';

  return (
    <div className="properties-sidebar auth-panel" ref={ref}>
      <div className="properties-sidebar-header">
        <h3>{isLoginView ? t('auth.login') : t('auth.register')}</h3>
      </div>
      <div className="properties-sidebar-content">
        <form onSubmit={handleSubmit}>
          {!isLoginView && (
            <div>
              <input
                type="text"
                placeholder={t('auth.username')}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                required
              />
            </div>
          )}
          <div>
            <input
              type="email"
              placeholder={t('auth.email')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              required
            />
          </div>
          <div>
            <input
              type="password"
              placeholder={t('auth.password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              required
            />
          </div>
          {!isLoginView && (
            <div>
              <input
                type="password"
                placeholder={t('auth.confirmPassword')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                required
              />
            </div>
          )}
          {!isLoginView && (
            <div className="terms-checkbox">
              <input
                type="checkbox"
                id="terms"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                required
              />
              <label htmlFor="terms">
                <span>
                  <Trans
                    i18nKey="auth.termsAndPrivacy"
                    terms={(el) => (
                      <a
                        href={`${mainDomainUrl}/terms`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {el}
                      </a>
                    )}
                    privacy={(el) => (
                      <a
                        href={`${mainDomainUrl}/privacy`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {el}
                      </a>
                    )}
                  />
                </span>
              </label>
            </div>
          )}
          {error && <p className="error">{error}</p>}
          {success && <p className="success">{success}</p>}
          <div>
            <button type="submit">{isLoginView ? t('auth.login') : t('auth.register')}</button>
          </div>
        </form>
        <div className="Modal__switch">
          {isLoginView ? (
            <p>
              {t('auth.noAccount')}{" "}
              <span className="Modal__switch-link" onClick={() => setAuthPanelView('register')}>
                {t('auth.registerHere')}
              </span>
              <br />
              <a href={`${mainDomainUrl}/reset-password`} target="_blank" rel="noopener noreferrer" className="Modal__switch-link">
                {t('auth.forgotPassword')}
              </a>
            </p>
          ) : (
            <p>
              {t('auth.alreadyHaveAccount')}{" "}
              <span className="Modal__switch-link" onClick={() => setAuthPanelView('login')}>
                {t('auth.loginHere')}
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
});

export default AuthPanel;
