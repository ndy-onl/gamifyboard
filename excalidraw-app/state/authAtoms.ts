import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

import apiClient from "../src/apiClient"; // Import apiClient

// Define the structure of authentication data
interface AuthState {
  accessToken: string | null;
  user: { id: string; email: string } | null; // Assuming user has id and email
}

// Define Credentials interface
interface Credentials {
  email: string;
  password: string;
}

// authAtom (The State)
// Using atomWithStorage for automatic persistence and synchronization
export const authAtom = atomWithStorage<AuthState | null>("auth-session", null);

// authStatusAtom (The Derived Status)
export const authStatusAtom = atom((get) => {
  const auth = get(authAtom);
  console.log("authStatusAtom: auth value:", auth); // ADD THIS
  return {
    isLoggedIn: !!auth?.accessToken,
    user: auth?.user ?? null,
    accessToken: auth?.accessToken ?? null,
  };
});

// loginActionAtom (The Action)
export const loginActionAtom = atom(
  null,
  async (get, set, credentials: Credentials) => {
    console.log("loginActionAtom: Initiating login for", credentials.email); // Added
    try {
      console.log(
        "loginActionAtom: Making API call to /auth/login with",
        credentials,
      ); // Added
      const response = await apiClient.post("/auth/login", credentials);
      console.log(
        "loginActionAtom: API call successful, response.data:",
        response.data,
      ); // Added
      const { user, accessToken } = response.data;
      set(authAtom, { user, accessToken });
    } catch (error) {
      console.error("loginActionAtom: Login fehlgeschlagen:", error); // Modified
      set(authAtom, null);
      throw error;
    }
  },
);

// logoutActionAtom (The Action)
export const logoutActionAtom = atom(
  null,
  async (get, set, onLogoutSuccess?: () => void) => {
    console.log("logoutActionAtom: Initiating logout"); // Added
    try {
      console.log("logoutActionAtom: Making API call to /auth/logout"); // Added
      await apiClient.post("/auth/logout", {}, { skipAuth: true }); // Call backend logout
      console.log("logoutActionAtom: API call successful"); // Added
    } catch (error) {
      console.error("logoutActionAtom: Logout failed:", error); // Modified
    } finally {
      console.log("logoutActionAtom: Clearing local state"); // Added
      set(authAtom, null); // Clear local state regardless of backend success
      localStorage.removeItem("accessToken"); // Clear localStorage
      if (onLogoutSuccess) {
        // DIESEN BLOCK HINZUFÜGEN
        onLogoutSuccess();
      }
    }
  },
);
