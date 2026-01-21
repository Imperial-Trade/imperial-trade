
// ⚡ VITE CONFIG - Chunk Loading Fix Build: 2025-11-12-v3
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Define build timestamp for version tracking
  define: {
    __BUILD_TIMESTAMP__: JSON.stringify(Date.now().toString()),
  },
  server: {
    host: "0.0.0.0", // Accept connections from all interfaces so mobile can reach via your PC's IP (e.g. http://192.168.1.x:8081)
    port: 8081,
    strictPort: true, // Fail if 8081 is in use (required for dev:mobile tunnel)
    allowedHosts: true, // Allow tunnel hosts (e.g. *.lhr.life) so mobile can load via dev:mobile
    // Add history API fallback for SPA routing
    historyApiFallback: true,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Force single React instance to prevent hook errors
      'react': path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
      'react/jsx-runtime': path.resolve(__dirname, './node_modules/react/jsx-runtime'),
    },
    // Dedupe React instances to prevent hook errors
    dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
  },
  // Optimize dependencies to ensure single React instance
  optimizeDeps: {
    include: ['react', 'react-dom', 'react/jsx-runtime', '@tanstack/react-query'],
    esbuildOptions: {
      target: 'esnext',
      // Ensure proper JSX handling
      jsx: 'automatic',
    },
  },
  // Use fresh cache directory to prevent React duplication issues
  cacheDir: 'node_modules/.vite-fresh',
  // Production build optimizations for DigitalOcean deployment
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Force cache busting on every build
    rollupOptions: {
      output: {
        // Add hash to all asset filenames for cache busting
        entryFileNames: `assets/[name].[hash].js`,
        chunkFileNames: `assets/[name].[hash].js`,
        assetFileNames: `assets/[name].[hash].[ext]`,
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          router: ['react-router-dom'],
        },
      },
    },
  },
  // Preview configuration for production server with SPA support
  preview: {
    host: "0.0.0.0",
    port: 8080,
    strictPort: true,
  },
  // Ensure static files are copied to build output
  publicDir: 'public',
}));
