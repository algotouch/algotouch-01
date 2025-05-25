
import React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

// Create a wrapper component to ensure proper initialization
const ThemeProviderWrapper = ({ children }: { children: React.ReactNode }) => {
  // Use a simple state to ensure component is mounted before initializing themes
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render the theme provider until component is mounted
  if (!mounted) {
    return <>{children}</>;
  }

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
