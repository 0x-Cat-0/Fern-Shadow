// 浅色模式颜色
export const lightColors = {
  primary: '#FF4040',
  primaryDark: '#E03030',
  primaryLight: '#FFE5E5',

  accent: '#4CAF50',

  danger: '#FF4040',
  dangerDark: '#E03030',

  background: '#F5F5F5',
  surface: '#FFFFFF',
  border: '#F0F0F0',

  textPrimary: '#333333',
  textSecondary: '#666666',
  textDisabled: '#999999',
  textInverse: '#FFFFFF',

  tabActive: '#FF4040',
  tabInactive: '#999999',

  success: '#4CAF50',
  warning: '#FF9800',
  error: '#FF4040',
};

// 深色模式颜色
export const darkColors = {
  primary: '#FF6B6B',
  primaryDark: '#FF4040',
  primaryLight: '#CC3030',

  accent: '#66BB6A',

  danger: '#EF5350',
  dangerDark: '#FF4040',

  background: '#121212',
  surface: '#1E1E1E',
  border: '#333333',

  textPrimary: '#FFFFFF',
  textSecondary: '#B0B0B0',
  textDisabled: '#666666',
  textInverse: '#333333',

  tabActive: '#FF6B6B',
  tabInactive: '#666666',

  success: '#66BB6A',
  warning: '#FFB74D',
  error: '#EF5350',
};

export type ColorScheme = typeof lightColors;

export const colors = {
  light: lightColors,
  dark: darkColors,
};