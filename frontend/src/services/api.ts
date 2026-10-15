import axios from 'axios';

export const getApiUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }
  return 'http://localhost:8000/api';
};

export const getWebSocketUrl = (path: string): string => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  // If explicit WS URL is configured via environment variable
  const explicitWs = import.meta.env.VITE_WS_URL;
  if (explicitWs) {
    return `${explicitWs.replace(/\/+$/, '')}${cleanPath}`;
  }

  // Otherwise derive ws/wss from HTTP/HTTPS API URL
  const apiUrl = getApiUrl();
  try {
    const parsed = new URL(apiUrl);
    const protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${parsed.host}${cleanPath}`;
  } catch {
    return `ws://localhost:8000${cleanPath}`;
  }
};

export const api = axios.create({
  baseURL: getApiUrl(),
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
