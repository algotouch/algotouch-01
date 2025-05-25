
import React, { createContext, useContext, useState, useEffect } from 'react';

interface ReactReadyContextType {
  isReady: boolean;
}

const ReactReadyContext = createContext<ReactReadyContextType>({ isReady: false });

export const useReactReady = () => {
  const context = useContext(ReactReadyContext);
  return context;
};

interface ReactReadyProviderProps {
  children: React.ReactNode;
}

export const ReactReadyProvider: React.FC<ReactReadyProviderProps> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Ensure React is fully initialized
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  // Show loading until React is ready
  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-background/90">
        <div className="text-center space-y-4">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-t-primary mx-auto"></div>
          <p className="text-muted-foreground">מתחיל...</p>
        </div>
      </div>
    );
  }

  return (
    <ReactReadyContext.Provider value={{ isReady }}>
      {children}
    </ReactReadyContext.Provider>
  );
};
