import { useEffect, useState } from 'react';

export const WISHLY_THEME_DARK_KEY = 'wishly_dark_theme';

function readStoredDarkTheme() {
  try {
    return localStorage.getItem(WISHLY_THEME_DARK_KEY) !== '0';
  } catch {
    return true;
  }
}

export function useAppTheme() {
  const [isDarkTheme, setIsDarkTheme] = useState(readStoredDarkTheme);

  useEffect(() => {
    try {
      localStorage.setItem(WISHLY_THEME_DARK_KEY, isDarkTheme ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [isDarkTheme]);

  return { isDarkTheme, setIsDarkTheme };
}
