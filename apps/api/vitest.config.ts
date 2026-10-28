import { defineConfig } from 'vitest/config';

// Unit tests: fast, no database. They live next to the code: src/**/*.spec.ts
export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
  },
});
