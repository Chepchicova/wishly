/** Базовый URL бэкенда. Переопределение: REACT_APP_API_URL в .env */
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export function apiUrl(path) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalized}`;
}
