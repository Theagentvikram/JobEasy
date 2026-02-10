import axios from 'axios';
import { auth } from '../firebase/config';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000', // Uses env var in prod, localhost in dev
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add Firebase Token
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    // Check for mock user (backdoor login)
    const mockUser = localStorage.getItem('jobeasy_mock_user');
    if (mockUser) {
      config.headers.Authorization = `Bearer mock-token-${mockUser}`;
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;
