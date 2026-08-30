import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // The additive database is loaded from disk once per process; running the
    // suite in a single fork keeps that to one read.
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
  },
});
