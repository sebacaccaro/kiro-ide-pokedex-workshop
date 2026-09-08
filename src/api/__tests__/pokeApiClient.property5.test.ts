import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  createPokeApiClient,
  type FetchFn,
  type FetchResponse,
} from '../pokeApiClient';

// Property test per il client PokéAPI.
// Feature: pokeapi-client, Property 5: 404 produce "risorsa non trovata" con
// stato e identificatore.
//
// Per ogni identificatore valido, quando la risposta HTTP ha stato 404, `get`
// restituisce un Result di errore con categoria "risorsa non trovata",
// httpStatus uguale a 404 e identifier uguale all'identificatore ORIGINALE
// passato a `get` (l'implementazione conserva il valore originale, non quello
// normalizzato: vedi `notFoundError` in pokeApiClient.ts).
//
// Validates: Requirements 1.4, 4.1

/** Numero minimo di iterazioni richiesto dal design per le proprietà. */
const NUM_RUNS = 100;

/** Stato HTTP simulato: risorsa non trovata. */
const HTTP_NOT_FOUND = 404;

/**
 * Crea una `FetchFn` mock che risponde sempre con stato 404 (`ok: false`).
 * Nessuna rete reale (Requirement 6.1). Il corpo non viene mai letto perché il
 * client corto-circuita sul 404 prima di invocare `json()`.
 */
function createNotFoundFetch(): FetchFn {
  const response: FetchResponse = {
    ok: false,
    status: HTTP_NOT_FOUND,
    json: () =>
      Promise.reject(new Error('json non deve essere invocato su 404')),
  };
  return () => Promise.resolve(response);
}

/**
 * Generatore di identificatori validi: interi in 1..100000 oppure stringhe
 * non vuote di 1..100 caratteri che restano tali dopo il trim (così l'input è
 * valido come passato a `get`).
 */
function validIdentifier(): fc.Arbitrary<string | number> {
  const validInteger = fc.integer({ min: 1, max: 100000 });
  const validName = fc.string({ minLength: 1, maxLength: 100 }).filter((s) => {
    const trimmed = s.trim();
    return trimmed.length >= 1 && trimmed.length <= 100;
  });
  return fc.oneof(validInteger, validName);
}

describe('PokeApiClient.get — Property 5: 404 → "risorsa non trovata"', () => {
  it('per ogni identificatore valido, un 404 produce categoria, stato e identificatore attesi', async () => {
    await fc.assert(
      fc.asyncProperty(validIdentifier(), async (identifier) => {
        const client = createPokeApiClient({ fetchFn: createNotFoundFetch() });

        const result = await client.get(identifier);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.category).toBe('risorsa non trovata');
          expect(result.error.httpStatus).toBe(HTTP_NOT_FOUND);
          // L'identificatore riportato è quello ORIGINALE passato a `get`.
          expect(result.error.identifier).toBe(identifier);
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
