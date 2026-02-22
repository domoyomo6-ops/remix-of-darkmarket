export type ThemePreference = 'dark' | 'light';
export type ThemeVariant = 'neon-night' | 'violet-club' | 'ocean-grid' | 'sunset-arcade';

const THEME_KEY = 'appearance_theme';
const THEME_VARIANT_KEY = 'appearance_theme_variant';
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

export const getThemeVariantPreference = (): ThemeVariant => {
  if (typeof window === 'undefined') return 'neon-night';
  const saved = window.localStorage.getItem(THEME_VARIANT_KEY);
  if (saved === 'violet-club' || saved === 'ocean-grid' || saved === 'sunset-arcade') {
    return saved;
  }
  return 'neon-night';
};

export const applyAppearance = (theme: ThemePreference, backgroundImage: string, variant: ThemeVariant = 'neon-night') => {
  if (typeof document === 'undefined') return;

  document.documentElement.classList.toggle('light', theme === 'light');
  document.documentElement.classList.toggle('dark', theme === 'dark');

  const normalizedBackground = backgroundImage.trim();
  const hasUrl = normalizedBackground.length > 0;
  document.body.style.setProperty('--user-bg-image', hasUrl ? `url("${normalizedBackground}")` : 'none');
  document.body.style.setProperty('--user-bg-opacity', hasUrl ? '0.35' : '0');
  document.body.dataset.themeVariant = variant;
};

export const saveAppearance = (theme: ThemePreference, backgroundImage: string, variant: ThemeVariant) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(THEME_KEY, theme);
  window.localStorage.setItem(BG_IMAGE_KEY, backgroundImage.trim());
  window.localStorage.setItem(THEME_VARIANT_KEY, variant);
};
