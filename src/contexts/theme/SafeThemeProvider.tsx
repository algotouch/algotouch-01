
import React, { Component, ReactNode } from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

interface SafeThemeProviderProps {
  children: ReactNode;
}

interface SafeThemeProviderState {
  hasError: boolean;
  error?: Error;
}

class SafeThemeProvider extends Component<SafeThemeProviderProps, SafeThemeProviderState> {
  constructor(props: SafeThemeProviderProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): SafeThemeProviderState {
    console.error('SafeThemeProvider: Error detected:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('SafeThemeProvider: Theme provider error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      reactVersion: React.version
    });
  }

  render() {
    if (this.state.hasError) {
      console.warn('SafeThemeProvider: Falling back to light theme due to error');
      // Fallback to basic styling without theme provider
      return (
        <div className="light" style={{ colorScheme: 'light' }}>
          {this.props.children}
        </div>
      );
    }

    // Check if React and useContext are available
    if (!React || typeof React.useContext !== 'function') {
      console.error('SafeThemeProvider: React or useContext not available');
      return (
        <div className="light" style={{ colorScheme: 'light' }}>
          {this.props.children}
        </div>
      );
    }

    try {
      return (
        <NextThemesProvider 
          attribute="class" 
          defaultTheme="dark" 
          enableSystem={false}
          storageKey="theme"
        >
          {this.props.children}
        </NextThemesProvider>
      );
    } catch (error) {
      console.error('SafeThemeProvider: NextThemesProvider failed:', error);
      return (
        <div className="light" style={{ colorScheme: 'light' }}>
          {this.props.children}
        </div>
      );
    }
  }
}

export default SafeThemeProvider;
