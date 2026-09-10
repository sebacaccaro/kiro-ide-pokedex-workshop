import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import type { ThemeName } from '../theme';
import {
  SPRITE_BASE_URL,
  THEME_SPRITE_BASE_URL,
  spriteUrlForId,
  spriteUrlForTheme,
} from '../sprites';

// Unit test (esempi) per la costruzione pura dell'URL dello sprite a partire
// dall'id. Serve a mostrare una miniatura nell'elenco senza fetch aggiuntivi:
// gli sprite ufficiali PokéAPI vivono a un URL prevedibile derivabile dall'id.
// _Requirements: 8.1, 8.2_

describe('spriteUrlForId', () => {
  it("costruisce l'URL dello sprite ufficiale dall'id", () => {
    expect(spriteUrlForId(25)).toBe(`${SPRITE_BASE_URL}/25.png`);
  });

  it('funziona sui bordi della Prima_Generazione (1 e 151)', () => {
    expect(spriteUrlForId(1)).toBe(`${SPRITE_BASE_URL}/1.png`);
    expect(spriteUrlForId(151)).toBe(`${SPRITE_BASE_URL}/151.png`);
  });
});

describe('spriteUrlForId (property-based)', () => {
  it('per ogni id valido termina con "/<id>.png" sotto la base ufficiale', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1_000_000 }), (id) => {
        const url = spriteUrlForId(id);
        expect(url.startsWith(`${SPRITE_BASE_URL}/`)).toBe(true);
        expect(url.endsWith(`/${id}.png`)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});

// Unit test (esempi) per la costruzione dell'URL dello sprite in base al tema.
// Ogni tema corrisponde a un gioco delle PokéAPI e lo sprite deve provenire dal
// set di quel gioco (Tema_Rosso -> Rosso/Blu Gen I, Tema_Diamante ->
// Diamante/Perla Gen IV). Gli URL sono derivabili dal solo id, senza fetch.

describe('spriteUrlForTheme', () => {
  it("costruisce l'URL dello sprite Rosso/Blu (Gen I) con fondo trasparente per il tema rosso", () => {
    // Gli sprite Rosso/Blu "piatti" hanno un fondo bianco cotto nel PNG: usiamo
    // la variante `transparent` per una trasparenza vera, senza trucchi CSS.
    expect(spriteUrlForTheme(25, 'rosso')).toBe(
      `${THEME_SPRITE_BASE_URL}/generation-i/red-blue/transparent/25.png`,
    );
  });

  it("costruisce l'URL dello sprite Diamante/Perla (Gen IV) per il tema diamante", () => {
    expect(spriteUrlForTheme(25, 'diamante')).toBe(
      `${THEME_SPRITE_BASE_URL}/generation-iv/diamond-pearl/25.png`,
    );
  });

  it('funziona sui bordi della Prima_Generazione (1 e 151)', () => {
    expect(spriteUrlForTheme(1, 'rosso')).toBe(
      `${THEME_SPRITE_BASE_URL}/generation-i/red-blue/transparent/1.png`,
    );
    expect(spriteUrlForTheme(151, 'diamante')).toBe(
      `${THEME_SPRITE_BASE_URL}/generation-iv/diamond-pearl/151.png`,
    );
  });
});

describe('spriteUrlForTheme (property-based)', () => {
  it('per ogni id e tema termina con "/<id>.png" sotto la base per-gioco', () => {
    const themeArb: fc.Arbitrary<ThemeName> = fc.constantFrom(
      'rosso',
      'diamante',
    );

    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        themeArb,
        (id, theme) => {
          const url = spriteUrlForTheme(id, theme);
          expect(url.startsWith(`${THEME_SPRITE_BASE_URL}/`)).toBe(true);
          expect(url.endsWith(`/${id}.png`)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});
