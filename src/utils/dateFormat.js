export function formatBirthdayForDisplay(value) {
  if (!value) {
    return '';
  }
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[1]}.${match[2]}.${match[3]}`;
  }
  return String(value).slice(0, 10).replace(/-/g, '.');
}

export function formatEventDateForDisplay(value) {
  if (!value) {
    return '';
  }
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    return String(value);
  }
  return `${match[3]}.${match[2]}.${match[1]}`;
}

/** Дата события для компактной подписи: ДД.ММ.ГГ */
export function formatEventDateShort(value) {
  const full = formatEventDateForDisplay(value);
  if (!full) {
    return '';
  }
  const m = full.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (m) {
    return `${m[1]}.${m[2]}.${m[3].slice(2)}`;
  }
  return full;
}

function pluralRu(n, one, few, many) {
  const a = Math.abs(Number(n)) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) {
    return many;
  }
  if (b > 1 && b < 5) {
    return few;
  }
  if (b === 1) {
    return one;
  }
  return many;
}

/**
 * Подпись «Через …» до даты события (ISO YYYY-MM-DD). Для прошедших дат — null.
 */
export function formatCountdownToEventBadge(isoYmd) {
  if (!isoYmd || !/^\d{4}-\d{2}-\d{2}$/.test(String(isoYmd).trim())) {
    return null;
  }
  const [y, mo, d] = String(isoYmd)
    .trim()
    .split('-')
    .map((x) => Number(x));
  const target = new Date(y, mo - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) {
    return null;
  }
  if (diffDays === 0) {
    return 'Сегодня';
  }
  if (diffDays === 1) {
    return 'Завтра';
  }
  if (diffDays < 7) {
    return `Через ${diffDays} ${pluralRu(diffDays, 'день', 'дня', 'дней')}`;
  }
  if (diffDays < 60) {
    const w = Math.floor(diffDays / 7);
    return `Через ${w} ${pluralRu(w, 'неделю', 'недели', 'недель')}`;
  }
  const months = Math.max(1, Math.round(diffDays / 30));
  return `Через ${months} ${pluralRu(months, 'месяц', 'месяца', 'месяцев')}`;
}
