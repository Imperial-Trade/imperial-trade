
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    name: 'integration',
    environment: 'happy-dom',
    setupFiles: [
      './src/test/setup.ts',
      './src/__tests__/integration/setup.ts'
    ],
    globals: true,
    testTimeout: 10000, // Longer timeout for integration tests
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
        'src/__tests__/unit/**',
        'src/__tests__/performance/**'
      ]
    },
    include: ['src/__tests__/integration/**/*.test.{ts,tsx}'],
    reporters: ['verbose', 'json'],
    outputFile: {
      json: './test-results/integration-results.json'
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
