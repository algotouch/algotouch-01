
import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';

type Direction = 'ltr' | 'rtl';

interface DirectionContextValue {
  dir: Direction;
}

// Create context with a default value to avoid null checks
const DirectionContext = createContext<DirectionContextValue>({ dir: 'rtl' });

export function useDirection() {
  const context = useContext(DirectionContext);
  return context; // No need to check for null now
}

interface DirectionProviderProps {
  dir?: Direction;
  children: React.ReactNode;
}

export function DirectionProvider({
  dir = 'rtl', // Default to RTL based on your app's Hebrew language
  children,
}: DirectionProviderProps) {
  const [mounted, setMounted] = useState(false);
  
  // Ensure component is mounted before using React hooks
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Use a simple value until mounted - no useMemo here
  if (!mounted) {
    return (
      <DirectionContext.Provider value={{ dir }}>
        {children}
      </DirectionContext.Provider>
    );
  }
  
  return <DirectionProviderMounted dir={dir}>{children}</DirectionProviderMounted>;
}

const DirectionProviderMounted: React.FC<{ dir: Direction; children: React.ReactNode }> = ({
  dir,
  children,
}) => {
  // Now we can safely use useMemo since the component is mounted
  const value = useMemo(() => ({ dir }), [dir]);
  
  return (
    <DirectionContext.Provider value={value}>
      {children}
    </DirectionContext.Provider>
  );
};
