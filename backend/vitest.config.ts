import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Dua file e2e berbagi satu DB test fisik — wajib serial satu proses
    fileParallelism: false,
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true }
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        'test/**',
        'tests/**'
      ]
    }
  }
});
