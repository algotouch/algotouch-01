
import React, { createContext, useContext, useMemo } from 'react';

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
  const value = useMemo(() => ({ dir }), [dir]);
  
  return (
    <DirectionContext.Provider value={value}>
      {children}
    </DirectionContext.Provider>
  );
}
