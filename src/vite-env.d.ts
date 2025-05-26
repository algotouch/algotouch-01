
/// <reference types="vite/client" />

// Add TypeScript declaration for window object
declare global {
  interface Window {
    __VITE_TIMESTAMP__: number;
    moduleLoadErrors?: Array<{
      message: string;
      time: string;
    }>;
  }
}
