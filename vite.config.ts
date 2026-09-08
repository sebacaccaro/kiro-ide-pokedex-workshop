/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // Il client PokéAPI vive in src/api/ e non dipende dal DOM: ambiente node.
    environment: 'node',
    // Abilita le API globali (describe/it/expect) senza import espliciti.
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
