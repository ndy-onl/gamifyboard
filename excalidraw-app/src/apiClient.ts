import axios from "axios";

import { appJotaiStore } from "../app-jotai";
import { authAtom } from "../state/authAtoms";

// Use hardcoded alpha URL for local dev, and build-time variable for production
const baseURL = import.meta.env.DEV
  ? "https://api.alpha.gamifyboard.com"
  : import.meta.env.VITE_APP_API_URL;

const apiClient = axios.create({
  baseURL,
  withCredentials: true, // Ensures cookies (like httpOnly refresh token) are sent
});

// Request interceptor to add the access token to every request
apiClient.interceptors.request.use(
  (config) => {
    // Do not add auth header for skipped routes
    if (config.skipAuth) {
      return config;
    }
    const auth = appJotaiStore.get(authAtom);
    if (auth?.accessToken) {
      config.headers.Authorization = `Bearer ${auth.accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor to handle 401 errors and refresh the token
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    // Check for 401, ensure it's not a retry, and not for login/register routes
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      originalRequest.url !== "/auth/login" &&
      originalRequest.url !== "/auth/register"
    ) {
      originalRequest._retry = true; // Mark as retried
      try {
        // The httpOnly refresh token cookie is sent automatically by the browser
        const { data } = await apiClient.post("/auth/refresh");
        const { user, accessToken } = data;

        // Update the global state with the new token and user data
        appJotaiStore.set(authAtom, { user, accessToken });

        // Update the header for the original request and retry it
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError);
        // If refresh fails, clear the auth state and reject the promise
        appJotaiStore.set(authAtom, null);
        return Promise.reject(refreshError);
      }
    }
    // For all other errors, just reject
    return Promise.reject(error);
  },
);

export default apiClient;
