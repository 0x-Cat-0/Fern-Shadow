import { createContext, useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { lightColors, darkColors } from '../theme/colors';
import type { ColorScheme } from '../theme/colors';
import type { ThemeMode } from '../types';

export const ThemeContext = createContext<ColorScheme>(lightColors);

interface ThemeProviderProps {
  children: React.ReactNode;
  themeMode?: ThemeMode;
}

export function ThemeProvider({ children, themeMode = 'system' }: ThemeProviderProps) {
  const systemColorScheme = useRNColorScheme();
  const [theme, setTheme] = useState<ColorScheme>(lightColors);

  useEffect(() => {
    if (themeMode === 'system') {
      setTheme(systemColorScheme === 'dark' ? darkColors : lightColors);
    } else {
      setTheme(themeMode === 'dark' ? darkColors : lightColors);
    }
  }, [themeMode, systemColorScheme]);

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}