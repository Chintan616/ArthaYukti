import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT from localStorage to every outgoing request
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('ay_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default axiosInstance;
