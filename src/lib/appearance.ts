export type ThemePreference = 'dark' | 'light';

const THEME_KEY = 'appearance_theme';
const BG_IMAGE_KEY = 'appearance_background_image';

export const getThemePreference = (): ThemePreference => {
  if (typeof window === 'undefined') return 'dark';
  const saved = window.localStorage.getItem(THEME_KEY);
  return saved === 'light' ? 'light' : 'dark';
};

export const getBackgroundImagePreference = (): string => {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(BG_IMAGE_KEY) || '';
};

export const applyAppearance = (theme: ThemePreference, backgroundImage: string) => {
  if (typeof document === 'undefined') return;

  document.documentElement.classList.toggle('light', theme === 'light');
  document.documentElement.classList.toggle('dark', theme === 'dark');

  const normalizedBackground = backgroundImage.trim();
  const hasUrl = normalizedBackground.length > 0;
  document.body.style.setProperty('--user-bg-image', hasUrl ? `url("${normalizedBackground}")` : 'none');
  document.body.style.setProperty('--user-bg-opacity', hasUrl ? '0.35' : '0');
};

export const saveAppearance = (theme: ThemePreference, backgroundImage: string) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(THEME_KEY, theme);
  window.localStorage.setItem(BG_IMAGE_KEY, backgroundImage.trim());
};

