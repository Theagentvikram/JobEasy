import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { auth } from '../firebase/config';

type RetryableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add Firebase ID Token
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ detail?: string }>) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const shouldRetry =
      error.response?.status === 401 &&
      !!originalRequest &&
      !originalRequest._retry &&
      !!auth.currentUser;

    if (shouldRetry) {
      originalRequest._retry = true;
      try {
        const freshToken = await auth.currentUser!.getIdToken(true);
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${freshToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
