
import React from 'react';
import SafeThemeProvider from './SafeThemeProvider';

const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  return <SafeThemeProvider>{children}</SafeThemeProvider>;
};

// Safe theme hook with fallback
const useTheme = () => {
  try {
    const { useTheme: useNextThemes } = require('next-themes');
    return useNextThemes();
  } catch (error) {
    console.warn('useTheme: next-themes not available, using fallback');
    return {
      theme: 'dark',
      setTheme: () => {},
      systemTheme: 'dark',
      themes: ['light', 'dark']
    };
  }
};

export { ThemeProvider, useTheme };
