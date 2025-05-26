
import { useTheme as useNextThemes } from 'next-themes';
import { useEffect, useState } from 'react';

// Simplified theme hook - ReactReadyProvider ensures safe usage
export const useTheme = () => {
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted before using theme
  useEffect(() => {
    setMounted(true);
  }, []);

  try {
    const themeData = useNextThemes();
    
    // Return safe defaults until mounted
    if (!mounted) {
      return {
        theme: 'dark',
        setTheme: () => {},
        resolvedTheme: 'dark'
      };
    }
    
    return {
      theme: themeData.theme || 'dark',
      setTheme: themeData.setTheme,
      resolvedTheme: themeData.resolvedTheme || 'dark'
    };
  } catch (error) {
    console.error('Theme hook error:', error);
    // Return safe fallback
    return {
      theme: 'dark',
      setTheme: () => console.warn('Theme provider not ready'),
      resolvedTheme: 'dark'
    };
  }
};

export default useTheme;
