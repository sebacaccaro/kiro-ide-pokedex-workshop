import fc from 'fast-check';

import { describe, expect, it } from 'vitest';

import { DEFAULT_THEME, normalizeThemeName, type ThemeName } from '../theme';

/** Numero minimo di iterazioni richiesto dal design per le proprietà. */
const NUM_RUNS = 100;

/** I due `ThemeName` validi, restituiti invariati dalla normalizzazione. */
const VALID_THEME_NAMES: readonly ThemeName[] = ['rosso', 'diamante'];

// Unit test (esempi) per la normalizzazione del tema persistito.
// normalizeThemeName mappa un valore persistito sconosciuto in un ThemeName
// valido, ripiegando su DEFAULT_THEME per qualsiasi valore non riconosciuto.
// _Requirements: 5.7_

describe('normalizeThemeName', () => {
  it('restituisce "rosso" invariato quando il valore persistito è "rosso"', () => {
    expect(normalizeThemeName('rosso')).toBe('rosso');
  });

  it('restituisce "diamante" invariato quando il valore persistito è "diamante"', () => {
    expect(normalizeThemeName('diamante')).toBe('diamante');
  });

  it('restituisce DEFAULT_THEME per una stringa sconosciuta', () => {
    expect(normalizeThemeName('verde')).toBe(DEFAULT_THEME);
  });

  it('restituisce DEFAULT_THEME per una stringa vuota', () => {
    expect(normalizeThemeName('')).toBe(DEFAULT_THEME);
  });

  it('restituisce DEFAULT_THEME quando il valore persistito è null', () => {
    expect(normalizeThemeName(null)).toBe(DEFAULT_THEME);
  });

  it('restituisce DEFAULT_THEME quando il valore persistito è undefined', () => {
    expect(normalizeThemeName(undefined)).toBe(DEFAULT_THEME);
  });

  it('restituisce DEFAULT_THEME per valori non stringa (numero, booleano, oggetto)', () => {
    expect(normalizeThemeName(42)).toBe(DEFAULT_THEME);
    expect(normalizeThemeName(true)).toBe(DEFAULT_THEME);
    expect(normalizeThemeName({ theme: 'rosso' })).toBe(DEFAULT_THEME);
    expect(normalizeThemeName(['rosso'])).toBe(DEFAULT_THEME);
  });
});

describe('DEFAULT_THEME', () => {
  it('è il Tema_Rosso, coerente con il tema predefinito (Req 5.2, 5.7)', () => {
    expect(DEFAULT_THEME).toBe('rosso');
  });
});

// Property-based test (fast-check).
// Feature: pokedex-themed-views, Property 12: La normalizzazione del tema persistito è totale e stabile sui temi validi
//
// Validates: Requirements 5.7
//
// Per ogni valore persistito arbitrario, `normalizeThemeName` restituisce sempre
// un `ThemeName` valido; per i valori 'rosso' e 'diamante' li restituisce
// invariati, per qualsiasi altro valore ripiega su 'rosso' (DEFAULT_THEME).

describe('normalizeThemeName — Property 12: normalizzazione totale e stabile', () => {
  it("per ogni valore persistito arbitrario restituisce sempre un ThemeName valido, invariato sui temi validi e 'rosso' altrimenti", () => {
    // Mescola valori arbitrari qualsiasi con le costanti 'rosso'/'diamante',
    // così i due temi validi ricorrono con frequenza sufficiente.
    const persisted: fc.Arbitrary<unknown> = fc.oneof(
      fc.anything(),
      fc.constantFrom<ThemeName>('rosso', 'diamante'),
    );

    fc.assert(
      fc.property(persisted, (value) => {
        const result = normalizeThemeName(value);

        // Totale: il risultato è sempre uno dei ThemeName validi.
        expect(VALID_THEME_NAMES).toContain(result);

        // Stabile: i temi validi restano invariati, tutto il resto → 'rosso'.
        if (value === 'rosso' || value === 'diamante') {
          expect(result).toBe(value);
        } else {
          expect(result).toBe(DEFAULT_THEME);
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
