
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Use relative paths for better compatibility with various hosting environments
  base: "./",
  
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Ensure single React instance
      "react": path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
      "react-router-dom": path.resolve(__dirname, "./node_modules/react-router-dom")
    },
  },
  optimizeDeps: {
    // Force bundling of React dependencies to prevent conflicts
    include: ['react', 'react-dom', 'react-router-dom'],
    // Exclude problematic dependencies that might cause React conflicts
    exclude: []
  },
  build: {
    // Force inline critical modules
    assetsInlineLimit: 10000,
    rollupOptions: {
      output: {
        // Use consistent filenames without hashes for better caching and debugging
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
        // Define manual chunks to ensure consistent chunk names and prevent React conflicts
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'ui-components': ['lucide-react', '@radix-ui/react-toast', '@radix-ui/react-dialog']
        }
      },
      // Ensure React is treated as external in the right contexts
      external: (id) => {
        // Don't externalize React in the main build
        return false;
      }
    },
    chunkSizeWarningLimit: 1000,
    // Add source maps in development for better debugging
    sourcemap: true,
    // Improve error handling in production
    reportCompressedSize: true,
    // Add specific options to prevent React conflicts
    commonjsOptions: {
      include: [/react/, /react-dom/, /node_modules/]
    }
  }
}));
