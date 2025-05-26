
import React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
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

export { ThemeProvider };
export { useTheme } from 'next-themes';
