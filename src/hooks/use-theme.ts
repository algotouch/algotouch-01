
import { useTheme as useNextThemes } from 'next-themes';

// Export the hook with the same interface as our previous custom hook
export const useTheme = () => {
  // Use try-catch to handle potential initialization issues
  try {
    const { theme, setTheme, resolvedTheme } = useNextThemes();
    
    return { 
      theme, 
      setTheme,
      resolvedTheme 
    };
  } catch (error) {
    // Fallback if next-themes isn't initialized yet
    console.error('Theme hook error:', error);
    return {
      theme: 'dark',
      setTheme: () => console.warn('Theme provider not ready'),
      resolvedTheme: 'dark'
    };
  }
};

export default useTheme;
