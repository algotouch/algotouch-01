
import React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

// Simplified theme provider - no mounting check needed
const ThemeProviderWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <NextThemesProvider 
      attribute="class" 
      defaultTheme="dark" 
      enableSystem={false}
      storageKey="theme"
    >
      {children}
    </NextThemesProvider>
  );
};

// Export the wrapper as ThemeProvider
export const ThemeProvider = ThemeProviderWrapper;

// Re-export the hook with error handling
export { useTheme } from '@/hooks/use-theme';
