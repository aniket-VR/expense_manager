// context/ThemeContext.js
// ─────────────────────────────────────────────────────────
// Provides theme (dark/light) to the whole app.
// Persisted in AsyncStorage so the preference survives restarts.
// ─────────────────────────────────────────────────────────

import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkColors, LightColors } from '../utils/theme';

const THEME_KEY = 'app_theme';

const ThemeContext = createContext({
  Colors: DarkColors,
  isDark: true,
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(true); // default dark

  // Load persisted preference on mount
  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((val) => {
      if (val !== null) setIsDark(val === 'dark');
    });
  }, []);

  const toggleTheme = async () => {
    const next = !isDark;
    setIsDark(next);
    await AsyncStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
  };

  const Colors = isDark ? DarkColors : LightColors;

  return (
    <ThemeContext.Provider value={{ Colors, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Convenience hook used in every screen/component
export const useTheme = () => useContext(ThemeContext);
