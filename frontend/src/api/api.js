import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('amber_runner_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  register: (payload) => api.post('/auth/register', payload).then((r) => r.data),
  login: (payload) => api.post('/auth/login', payload).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
};

export const scoreApi = {
  submit: (payload) => api.post('/scores', payload).then((r) => r.data),
  leaderboard: (limit = 10) => api.get(`/scores/leaderboard?limit=${limit}`).then((r) => r.data),
  myRuns: () => api.get('/scores/me').then((r) => r.data),
};

export default api;
