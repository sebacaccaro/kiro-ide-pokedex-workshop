/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // I test dei componenti (React Testing Library) richiedono il DOM: ambiente jsdom.
    // Il client PokéAPI in src/api/ non dipende dal DOM ma resta compatibile con jsdom.
    environment: 'jsdom',
    // Abilita le API globali (describe/it/expect) senza import espliciti.
    globals: true,
    // File di setup: registra i matcher di @testing-library/jest-dom.
    setupFiles: ['src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
