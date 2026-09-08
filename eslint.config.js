// Configurazione ESLint (flat config, ESLint 9).
//
// Intento "Airbnb + Prettier" adattato al flat config: `eslint-config-airbnb` /
// `eslint-config-airbnb-typescript` non supportano il flat config di ESLint 9,
// quindi ricostruiamo lo stesso spirito con i building block ufficiali
// compatibili: JS consigliato, typescript-eslint, plugin React/React Hooks e
// plugin import, con `eslint-config-prettier` in coda a disattivare le regole di
// formattazione (la formattazione la decide Prettier, vedi steering code-style).

import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  // Ignora artefatti e cartelle non sorgente.
  {
    ignores: ['dist', 'build', 'coverage', 'node_modules', '**/*.tsbuildinfo'],
  },

  // Base: regole consigliate JS + TypeScript (spirito Airbnb).
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Regole per tutti i sorgenti TS/TSX.
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      import: importPlugin,
    },
    settings: {
      react: { version: 'detect' },
      // Il progetto usa il resolver bundler (Vite) e import di file `.ts`
      // espliciti: il resolver TypeScript risolve i moduli come fa il bundler.
      'import/resolver': {
        typescript: true,
        node: true,
      },
    },
    rules: {
      // --- React / Hooks (stile Airbnb) ---
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // Con il new JSX transform (react-jsx) non serve importare React.
      'react/react-in-jsx-scope': 'off',

      // --- Import (stile Airbnb) ---
      // Ordine import: esterni, poi interni, poi asset/stili (steering code-style).
      // Come Airbnb, imponiamo solo l'ordine dei gruppi, senza forzare righe
      // vuote o alfabetizzazione, per non riformattare gli import esistenti.
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
          ],
          'newlines-between': 'ignore',
        },
      ],
      // Il progetto importa moduli con estensione `.ts`/`.tsx` esplicita
      // (bundler mode di Vite/TS): consentito per ts/tsx, vietato altrove.
      'import/extensions': [
        'error',
        'ignorePackages',
        { ts: 'never', tsx: 'never', js: 'never', jsx: 'never' },
      ],

      // --- Regole generali in stile Airbnb ---
      'no-console': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always'],
      // Variabili non usate con prefisso `_` ammesse; `ignoreRestSiblings`
      // (come Airbnb) permette il pattern `const { x, ...rest } = obj` usato nei
      // test per omettere un campo.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      // Vietiamo `any` (steering code-style: niente any evitabili).
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },

  // I file di test usano devDependencies (vitest, fast-check): consentito.
  {
    files: ['**/*.test.{ts,tsx}'],
    plugins: { import: importPlugin },
    rules: {
      'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
    },
  },

  // File di configurazione (vite.config.ts, ecc.): possono usare devDependencies.
  {
    files: ['*.config.{ts,js}', 'vite.config.ts'],
    plugins: { import: importPlugin },
    rules: {
      'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
    },
  },

  // Prettier in coda: disattiva le regole di formattazione che confliggono.
  prettier,
);
