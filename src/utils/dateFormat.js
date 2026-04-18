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
