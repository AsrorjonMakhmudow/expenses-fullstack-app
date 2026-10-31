import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { tsconfigPaths: true }, // understands the "@/*" alias from tsconfig.json
  server: {
    port: 5173,
    // The browser talks to the same origin (localhost:5173); Vite forwards /api to the API.
    // Same origin = no CORS setup needed. In production a reverse proxy does the same job.
    proxy: { '/api': 'http://localhost:3000' },
  },
  build: {
    // The dashboard chunk carries the chart library (~600 kB, ~200 kB gzipped) and is loaded
    // only on that page. Accepted on purpose — raise the warning threshold to match.
    chunkSizeWarningLimit: 650,
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
