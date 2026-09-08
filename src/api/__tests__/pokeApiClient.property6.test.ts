import fc from 'fast-check';

import { describe, expect, it } from 'vitest';

import {
  createPokeApiClient,
  type FetchFn,
  type FetchResponse,
} from '../pokeApiClient';

// Property-based test (fast-check).
// Feature: pokeapi-client, Property 6: Stato non-2xx diverso da 404 produce "risposta HTTP non valida"
//
// Validates: Requirements 1.6, 4.2
//
// Per ogni stato HTTP fuori dall'intervallo 200-299 e diverso da 404,
// l'operazione (`get` o `list`) restituisce un errore con categoria
// "risposta HTTP non valida" e `httpStatus` uguale allo stato ricevuto.

/**
 * Un corpo `PokemonRaw` conforme. Non viene mai consumato in questi test
 * (l'errore scatta prima, sullo stato non-2xx), ma è comunque un `json()`
 * plausibile per il mock.
 */
const conformingPokemonBody = {
  id: 25,
  name: 'pikachu',
  height: 4,
  weight: 60,
  base_experience: 112,
  abilities: [{ ability: { name: 'static' }, is_hidden: false, slot: 1 }],
  types: [{ slot: 1, type: { name: 'electric' } }],
} as const;

/**
 * Genera uno stato HTTP di errore fuori dall'intervallo 200-299 e diverso da
 * 404: interi in 100..599 esclusi i codici 2xx e il 404.
 */
const errorStatusExcept404: fc.Arbitrary<number> = fc
  .integer({ min: 100, max: 599 })
  .filter((status) => (status < 200 || status > 299) && status !== 404);

/**
 * Crea una `FetchFn` mock che risponde con `ok: false` e lo stato indicato,
 * senza alcuna rete reale (Requirement 6.1).
 */
function createStatusFetch(status: number): FetchFn {
  const response: FetchResponse = {
    ok: false,
    status,
    json: () => Promise.resolve(conformingPokemonBody),
  };
  return () => Promise.resolve(response);
}

describe('PokeApiClient — Property 6: non-2xx diverso da 404 → "risposta HTTP non valida"', () => {
  it('get restituisce "risposta HTTP non valida" con httpStatus uguale allo stato ricevuto', async () => {
    await fc.assert(
      fc.asyncProperty(errorStatusExcept404, async (status) => {
        const client = createPokeApiClient({
          fetchFn: createStatusFetch(status),
        });

        const result = await client.get(25);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.category).toBe('risposta HTTP non valida');
          expect(result.error.httpStatus).toBe(status);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('list restituisce "risposta HTTP non valida" con httpStatus uguale allo stato ricevuto', async () => {
    await fc.assert(
      fc.asyncProperty(errorStatusExcept404, async (status) => {
        const client = createPokeApiClient({
          fetchFn: createStatusFetch(status),
        });

        const result = await client.list({ limit: 20, offset: 0 });

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.category).toBe('risposta HTTP non valida');
          expect(result.error.httpStatus).toBe(status);
        }
      }),
      { numRuns: 100 },
    );
  });
});
