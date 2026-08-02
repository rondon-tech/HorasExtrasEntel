import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    
    if (error.response?.data) {
      const serverError = error.response.data;
      const message = serverError.message || serverError.error || error.message;
      const enhancedError = new Error(message);
      (enhancedError as any).serverData = serverError;
      (enhancedError as any).status = error.response.status;
      return Promise.reject(enhancedError);
    }
    
    return Promise.reject(error);
  }
);
