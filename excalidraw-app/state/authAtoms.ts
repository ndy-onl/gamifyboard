import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { loginUser, logoutUser as apiLogout } from '../src/api';

interface AuthState {
  accessToken: string;
  user: { id: string; email: string; };
}

interface Credentials {
  email: string;
  password: string;
}

export const authAtom = atomWithStorage<AuthState | null>('auth-session', null);

export const authStatusAtom = atom((get) => {
  const auth = get(authAtom);
  return {
    isLoggedIn: !!auth?.accessToken,
    user: auth?.user ?? null,
    accessToken: auth?.accessToken ?? null,
  };
});

export const loginActionAtom = atom(
  null,
  async (get, set, credentials: Credentials) => {
    try {
      const response = await loginUser(credentials.email, credentials.password);
      const { user, accessToken } = response.data;
      set(authAtom, { user, accessToken });
    } catch (error) {
      console.error("Login fehlgeschlagen:", error);
      set(authAtom, null);
      throw error;
    }
  }
);

export const logoutActionAtom = atom(null, async (get, set, onLogoutSuccess?: () => void) => {
  try {
    await apiLogout();
  } catch (error) {
    console.error("Logout auf dem Backend fehlgeschlagen:", error);
  } finally {
    set(authAtom, null);
    if (onLogoutSuccess) {
      onLogoutSuccess();
    }
  }
});
