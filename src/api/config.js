/**
 * Базовый URL бэкенда.
 * - Если задан REACT_APP_API_URL в .env — используется он (продакшен, отдельный хост API).
 * - В development без переменной — пустая строка: запросы идут на тот же origin, что и страница
 *   (например http://192.168.x.x:3000), а CRA proxy пересылает их на Node (см. package.json "proxy").
 *   Так вход с телефона по Wi‑Fi не упирается в localhost на устройстве.
 */
function resolveApiBaseUrl() {
  const raw = process.env.REACT_APP_API_URL;
  if (raw != null && String(raw).trim() !== '') {
    return String(raw).trim().replace(/\/$/, '');
  }
  if (process.env.NODE_ENV === 'development') {
    return '';
  }
  return 'http://localhost:5000';
}

export const API_BASE_URL = resolveApiBaseUrl();

export function apiUrl(path) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (!API_BASE_URL) {
    return normalized;
  }
  return `${API_BASE_URL}${normalized}`;
}
