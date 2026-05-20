// utils/theme.js
// Design tokens for DARK and LIGHT modes.

export const DarkColors = {
  bg: '#0D1117',
  bgCard: '#161B22',
  bgCardHover: '#1C2330',
  bgInput: '#0D1117',
  border: '#30363D',
  textPrimary: '#E6EDF3',
  textSecondary: '#8B949E',
  textMuted: '#484F58',
  accent: '#00C6A2',
  accentDim: 'rgba(0,198,162,0.12)',
  safe: '#2EA043',
  safeBg: '#0D2D1A',
  safeDim: 'rgba(46,160,67,0.12)',
  danger: '#F85149',
  dangerBg: '#2D0F0E',
  dangerDim: 'rgba(248,81,73,0.12)',
  warning: '#D29922',
  warningBg: '#2D2109',
  white: '#FFFFFF',
  black: '#000000',
  isDark: true,
};

export const LightColors = {
  bg: '#F6F8FA',
  bgCard: '#FFFFFF',
  bgCardHover: '#F0F2F5',
  bgInput: '#FFFFFF',
  border: '#D8DEE4',
  textPrimary: '#1C2128',
  textSecondary: '#57606A',
  textMuted: '#8C959F',
  accent: '#008F72',
  accentDim: 'rgba(0,143,114,0.10)',
  safe: '#1A7F37',
  safeBg: '#DAFBE1',
  safeDim: 'rgba(26,127,55,0.10)',
  danger: '#CF222E',
  dangerBg: '#FFEBE9',
  dangerDim: 'rgba(207,34,46,0.10)',
  warning: '#9A6700',
  warningBg: '#FFF8C5',
  white: '#FFFFFF',
  black: '#000000',
  isDark: false,
};

// Keep a default Colors export pointing to dark (avoids breaking any
// remaining static imports during the refactor)
export const Colors = DarkColors;

export const Typography = {
  xs: 11, sm: 13, base: 15, md: 17, lg: 20,
  xl: 24, '2xl': 30, '3xl': 38, '4xl': 48,
};

export const Spacing = {
  xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24, '2xl': 32, '3xl': 48,
};

export const Radius = {
  sm: 6, md: 10, lg: 16, xl: 24, full: 999,
};
