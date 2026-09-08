import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  createPokeApiClient,
  type FetchFn,
  type FetchResponse,
} from '../pokeApiClient';

// Property-based test (fast-check).
// Feature: pokeapi-client, Property 4: Query di paginazione nella LIST
// Validates: Requirements 2.1
//
// Per ogni coppia (limit, offset) valida (limit in 1..100, offset >= 0), l'URL
// richiesto da `list` ha percorso `{baseUrl}pokemon` e contiene i parametri di
// query `limit={limit}` e `offset={offset}`. La `fetch` iniettata registra
// l'URL richiesto e risponde con un corpo `PokemonListPageRaw` conforme
// (nessuna rete reale, Requirement 6.1).

/**
 * Un corpo `PokemonListPageRaw` conforme, sufficiente perché `list` completi
 * senza fallire nel parsing/mapping: qui interessa l'URL richiesto, non il
 * dominio restituito.
 */
const conformingListBody = {
  count: 1302,
  next: null,
  previous: null,
  results: [{ name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon/1/' }],
} as const;

/** Un mock di `FetchFn` che registra gli URL richiesti e risponde 200 conforme. */
interface MockFetch {
  readonly fetchFn: FetchFn;
  readonly calls: string[];
  readonly lastUrl: () => string | undefined;
}

/**
 * Crea un mock di `FetchFn` che registra ogni URL richiesto e restituisce una
 * `FetchResponse` 200 con corpo conforme. Nessuna rete reale (Requirement 6.1).
 */
function createMockFetch(): MockFetch {
  const calls: string[] = [];
  const response: FetchResponse = {
    ok: true,
    status: 200,
    json: () => Promise.resolve(conformingListBody),
  };
  const fetchFn: FetchFn = (input) => {
    calls.push(input);
    return Promise.resolve(response);
  };
  return {
    fetchFn,
    calls,
    lastUrl: () => calls.at(-1),
  };
}

describe('PokeApiClient.list (property-based)', () => {
  const baseUrl = 'http://localhost/api/v2/';

  // validPagination: limit intero 1..100, offset intero >= 0.
  const validPagination: fc.Arbitrary<{ limit: number; offset: number }> =
    fc.record({
      limit: fc.integer({ min: 1, max: 100 }),
      offset: fc.integer({ min: 0, max: 1_000_000 }),
    });

  it('richiede il percorso {baseUrl}pokemon con i parametri limit e offset', async () => {
    await fc.assert(
      fc.asyncProperty(validPagination, async ({ limit, offset }) => {
        const mock = createMockFetch();
        const client = createPokeApiClient({ baseUrl, fetchFn: mock.fetchFn });

        await client.list({ limit, offset });

        const url = mock.lastUrl();
        expect(url).toBeDefined();
        const requested = url ?? '';

        // Il percorso (prima della query string) è esattamente {baseUrl}pokemon.
        const path = requested.split('?')[0];
        expect(path).toBe(`${baseUrl}pokemon`);

        // Contiene i parametri di query limit e offset con i valori richiesti.
        const query = new URLSearchParams(requested.split('?')[1] ?? '');
        expect(query.get('limit')).toBe(String(limit));
        expect(query.get('offset')).toBe(String(offset));
      }),
      { numRuns: 100 },
    );
  });
});
