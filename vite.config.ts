
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { visualizer } from 'rollup-plugin-visualizer';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  return {
    plugins: [
      react(),
      mode === 'analyze' && visualizer({
        open: true,
        filename: 'dist/stats.html',
        gzipSize: true,
        brotliSize: true,
      }),
    ],
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },
    build: {
      target: 'esnext',
      minify: 'terser',
      sourcemap: mode !== 'production',
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'ui-vendor': ['@radix-ui/react-*'],
            'utils-vendor': ['date-fns', 'zod', 'zustand'],
          },
        },
      },
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
          drop_debugger: mode === 'production',
        },
      },
    },
    server: {
      port: 8080,
      strictPort: true,
      host: true,
    },
    preview: {
      port: 8080,
      strictPort: true,
      host: true,
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
  };
});
