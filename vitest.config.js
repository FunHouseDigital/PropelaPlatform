import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    exclude: ['node_modules/**', 'tests/e2e/**'],
    css: {
      modules: {
        classNameStrategy: 'non-scoped',
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      exclude: [
        'node_modules/**',
        'tests/e2e/**',
        'src/test/**',
        '*.config.js',
      ],
      thresholds: {
        lines: 20,
        branches: 15,
        functions: 20,
        statements: 20,
      },
    },
  },
});
