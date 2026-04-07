import { useContext } from 'react';
import { ThemeContext } from '../contexts/ThemeContext';
import type { ColorScheme } from '../theme';

export function useTheme(): ColorScheme {
  const theme = useContext(ThemeContext);
  return theme;
}