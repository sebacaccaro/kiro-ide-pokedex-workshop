import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { SPRITE_BASE_URL, spriteUrlForId } from '../sprites';

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
