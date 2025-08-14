import axios from 'axios';
import { appJotaiStore } from '../app-jotai';
import { authAtom } from '../state/auth';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_APP_API_URL,
  withCredentials: true, // Ensures cookies (like httpOnly refresh token) are sent
});

// Request interceptor to add the access token to every request
apiClient.interceptors.request.use(
  (config) => {
    const token = appJotaiStore.get(authAtom).accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 errors and refresh the token
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        // The httpOnly cookie is sent automatically by the browser
        const { data } = await apiClient.post('/auth/refresh');
        const { user, accessToken } = data;
        
        // Update the global state with the new token and user data
        appJotaiStore.set(authAtom, { user, accessToken });

        // Update the header for the original request and retry
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        // If refresh fails, clear the auth state and reject
        appJotaiStore.set(authAtom, { user: null, accessToken: null });
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
