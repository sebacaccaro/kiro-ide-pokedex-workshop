import fc from 'fast-check';

import { describe, expect, it } from 'vitest';

import {
  createPokeApiClient,
  type FetchFn,
  type FetchResponse,
} from '../pokeApiClient';

// Property-based test (fast-check).
// Feature: pokeapi-client, Property 7: Errore di rete produce "errore di rete"
// Validates: Requirements 1.7, 4.3
//
// Per ogni operazione (`get` o `list`) in cui la `fetch` iniettata rigetta
// (errore di rete o abort per timeout) prima di produrre una risposta, il
// risultato è un errore con categoria "errore di rete".
//
// Niente rete reale: la `fetchFn` iniettata rigetta sempre (Requirement 6.1).

/**
 * Crea una `FetchFn` che rigetta sempre con la ragione fornita, simulando un
 * errore di rete o un abort per timeout prima che arrivi una risposta.
 */
function createRejectingFetch(reason: unknown): FetchFn {
  return (): Promise<FetchResponse> => Promise.reject(reason);
}

// Identificatori validi per `get`: interi in 1..100000 oppure stringhe non
// vuote di lunghezza 1..100 (Requirement 1.1, 1.2).
const validIdentifier: fc.Arbitrary<string | number> = fc.oneof(
  fc.integer({ min: 1, max: 100000 }),
  fc.string({ minLength: 1, maxLength: 100 }),
);

// Paginazione valida per `list`: limit in 1..100, offset >= 0 (Requirement 2.4).
const validPagination: fc.Arbitrary<{ limit: number; offset: number }> =
  fc.record({
    limit: fc.integer({ min: 1, max: 100 }),
    offset: fc.integer({ min: 0, max: 100000 }),
  });

// Ragioni di rigetto plausibili: errore di rete generico e abort per timeout.
const rejectionReason: fc.Arbitrary<unknown> = fc.oneof(
  fc
    .string({ minLength: 1, maxLength: 50 })
    .map((message) => new Error(message)),
  fc.constant(new TypeError('Failed to fetch')),
  fc.constant(new DOMException('The operation was aborted.', 'AbortError')),
);

describe('PokeApiClient — errore di rete (property-based)', () => {
  it('get: per ogni identificatore valido, se la fetch rigetta il risultato è "errore di rete"', async () => {
    await fc.assert(
      fc.asyncProperty(
        validIdentifier,
        rejectionReason,
        async (identifier, reason) => {
          const client = createPokeApiClient({
            fetchFn: createRejectingFetch(reason),
          });

          const result = await client.get(identifier);

          expect(result.ok).toBe(false);
          if (!result.ok) {
            expect(result.error.category).toBe('errore di rete');
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('list: per ogni paginazione valida, se la fetch rigetta il risultato è "errore di rete"', async () => {
    await fc.assert(
      fc.asyncProperty(
        validPagination,
        rejectionReason,
        async ({ limit, offset }, reason) => {
          const client = createPokeApiClient({
            fetchFn: createRejectingFetch(reason),
          });

          const result = await client.list({ limit, offset });

          expect(result.ok).toBe(false);
          if (!result.ok) {
            expect(result.error.category).toBe('errore di rete');
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
