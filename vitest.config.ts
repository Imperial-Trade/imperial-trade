
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'src/__tests__/**/*.{test,spec}.{ts,tsx}'
    ],
    exclude: [
      'node_modules/',
      'dist/',
      'e2e/',
      'src/__tests__/integration/**',
      'src/__tests__/performance/**',
      'src/__tests__/load/**',
      'src/__tests__/visual/**',
      'src/__tests__/maintenance/**',
      'src/__tests__/monitoring/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        'dist/',
        'e2e/',
        'src/integrations/supabase/types.ts',
        'src/__tests__/**'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
