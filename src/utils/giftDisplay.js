import { API_BASE_URL } from '../api/config';
import giftDefaultImage from '../assets/wishlist-icons/giftdef.png';

export { giftDefaultImage };

export function resolveGiftImageUrl(imagePath) {
  if (!imagePath || !String(imagePath).trim()) {
    return giftDefaultImage;
  }
  const path = String(imagePath).trim();
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  if (path.startsWith('/')) {
    return `${API_BASE_URL}${path}`;
  }
  return `${API_BASE_URL}/${path}`;
}

export function formatGiftLinkLabel(rawUrl) {
  const url = String(rawUrl || '').trim();
  if (!url) {
    return '';
  }
  try {
    const normalized = url.match(/^https?:\/\//i) ? url : `https://${url}`;
    const u = new URL(normalized);
    const host = u.hostname.replace(/^www\./i, '');
    const path = u.pathname === '/' ? '' : u.pathname;
    const base = host + path;
    return base.length > 56 ? `${base.slice(0, 53)}…` : base;
  } catch {
    return url.length > 56 ? `${url.slice(0, 53)}…` : url;
  }
}

export function formatGiftPrice(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const n = Number(value);
  if (Number.isNaN(n)) {
    return null;
  }
  return new Intl.NumberFormat('be-BY', {
    style: 'currency',
    currency: 'BYN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}
