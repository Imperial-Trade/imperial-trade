
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    name: 'performance',
    environment: 'happy-dom',
    setupFiles: [
      './src/test/setup.ts',
      './src/__tests__/performance/setup.ts'
    ],
    globals: true,
    testTimeout: 30000, // Longer timeout for performance tests
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        'dist/',
        'e2e/',
        'src/integrations/supabase/types.ts',
        'src/__tests__/**'
      ]
    },
    reporters: ['verbose', 'json'],
    outputFile: {
      json: './test-results/performance-results.json'
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
