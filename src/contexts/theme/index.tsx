
import React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

// Re-export the hook
export { useTheme } from '@/hooks/use-theme';

// For backward compatibility, we wrap the next-themes provider
export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      {children}
    </NextThemesProvider>
  );
};
