import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import { darkColors, lightColors, ThemeColors, ThemeMode } from '../utils/theme';
import { getSettings, saveSettings, AppSettings } from '../utils/storage';

interface ThemeContextValue {
  colors: ThemeColors;
  themeMode: ThemeMode;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: darkColors,
  themeMode: 'dark',
  isDark: true,
  setThemeMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getSettings().then((s) => {
      setThemeModeState(s.themeMode ?? 'dark');
      setLoaded(true);
    }).catch(() => {
      setLoaded(true);
    });
  }, []);

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    const settings = await getSettings();
    await saveSettings({ ...settings, themeMode: mode });
  }, []);

  const isDark = themeMode === 'dark' || (themeMode === 'system' && systemScheme !== 'light');
  const currentColors = isDark ? darkColors : lightColors;

  const value = useMemo<ThemeContextValue>(
    () => ({ colors: currentColors, themeMode, isDark, setThemeMode }),
    [currentColors, themeMode, isDark, setThemeMode],
  );

  // Don't render until we know the stored preference
  if (!loaded) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

export type { ThemeColors };
