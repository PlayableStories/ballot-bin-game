/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

// Served from https://playablestories.github.io/ballot-bin-game/ in production,
// from / in dev. BASE_PATH is set by the deploy workflow.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  build: {
    target: 'es2022',
    // Phaser is large; splitting it keeps the game bundle diffable in review.
    rollupOptions: {
      output: {
        manualChunks: { phaser: ['phaser'] },
      },
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
