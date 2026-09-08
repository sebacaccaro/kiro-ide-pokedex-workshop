import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  createPokeApiClient,
  type FetchFn,
  type FetchResponse,
} from '../pokeApiClient';

// Property test per il client PokéAPI.
// Feature: pokeapi-client, Property 13: Il messaggio d'errore ha lunghezza
// compresa tra 1 e 200.
//
// Per OGNI errore prodotto dal client, in QUALUNQUE scenario di fallimento,
// `error.message` è una stringa non vuota di lunghezza compresa tra 1 e 200
// caratteri (Requirement 4.6).
//
// La proprietà è guidata da un mix di scenari di fallimento:
//  - parametri non validi (identificatori e paginazioni fuori intervallo);
//  - 404 → "risorsa non trovata";
//  - non-2xx diverso da 404 → "risposta HTTP non valida";
//  - rigetto della fetch (rete/timeout) → "errore di rete";
//  - corpo 2xx non conforme → "risposta HTTP non valida".
//
// Niente rete reale: la `fetchFn` è sempre iniettata (Requirement 6.1).

/** Numero minimo di iterazioni richiesto dal design per le proprietà. */
const NUM_RUNS = 100;

/** Confini di lunghezza ammessi per il messaggio d'errore (Requirement 4.6). */
const MIN_MESSAGE_LENGTH = 1;
const MAX_MESSAGE_LENGTH = 200;

/** Stato HTTP: risorsa non trovata. */
const HTTP_NOT_FOUND = 404;

/** Verifica il vincolo di lunghezza sul messaggio di un errore. */
function assertMessageLength(message: string): void {
  expect(typeof message).toBe('string');
  expect(message.length).toBeGreaterThanOrEqual(MIN_MESSAGE_LENGTH);
  expect(message.length).toBeLessThanOrEqual(MAX_MESSAGE_LENGTH);
}

/** `FetchFn` che risponde sempre con lo stato indicato (`ok` derivato). */
function createStatusFetch(status: number, body?: unknown): FetchFn {
  const response: FetchResponse = {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  };
  return (): Promise<FetchResponse> => Promise.resolve(response);
}

/** `FetchFn` che rigetta sempre, simulando un errore di rete o un abort. */
function createRejectingFetch(reason: unknown): FetchFn {
  return (): Promise<FetchResponse> => Promise.reject(reason);
}

// Identificatori potenzialmente NON validi per `get`: numeri fuori range, non
// interi, stringhe vuote o troppo lunghe, oltre a valori validi. L'obiettivo è
// esercitare più rami di errore "parametri non validi" (e alcuni casi validi
// che poi verranno gestiti dagli altri scenari HTTP).
const anyIdentifier: fc.Arbitrary<string | number> = fc.oneof(
  fc.integer({ min: -100000, max: 200000 }),
  fc.double({ min: -10, max: 10, noNaN: true }),
  fc.string({ minLength: 0, maxLength: 300 }),
);

// Paginazioni potenzialmente NON valide: limit/offset fuori range o non interi.
const anyPagination: fc.Arbitrary<{ limit?: number; offset?: number }> =
  fc.record({
    limit: fc.oneof(
      fc.integer({ min: -50, max: 200 }),
      fc.double({ min: -10, max: 10, noNaN: true }),
    ),
    offset: fc.oneof(
      fc.integer({ min: -50, max: 200000 }),
      fc.double({ min: -10, max: 10, noNaN: true }),
    ),
  });

// Identificatori validi, usati per gli scenari HTTP (404, 5xx, rete, corpo).
const validIdentifier: fc.Arbitrary<string | number> = fc.oneof(
  fc.integer({ min: 1, max: 100000 }),
  fc
    .string({ minLength: 1, maxLength: 100 })
    .filter((s) => s.trim().length >= 1 && s.trim().length <= 100),
);

// Paginazioni valide, usate per gli scenari HTTP.
const validPagination: fc.Arbitrary<{ limit: number; offset: number }> =
  fc.record({
    limit: fc.integer({ min: 1, max: 100 }),
    offset: fc.integer({ min: 0, max: 100000 }),
  });

// Stati non-2xx diversi da 404 → "risposta HTTP non valida".
const nonOkStatus: fc.Arbitrary<number> = fc
  .integer({ min: 100, max: 599 })
  .filter((s) => (s < 200 || s >= 300) && s !== HTTP_NOT_FOUND);

// Corpi 2xx non conformi alla struttura attesa → "risposta HTTP non valida".
const nonConformingBody: fc.Arbitrary<unknown> = fc.oneof(
  fc.constant(null),
  fc.constant(undefined),
  fc.string(),
  fc.integer(),
  fc.boolean(),
  fc.array(fc.anything()),
  fc.object(),
);

// Ragioni di rigetto della fetch (rete/timeout).
const rejectionReason: fc.Arbitrary<unknown> = fc.oneof(
  fc.string({ minLength: 1, maxLength: 50 }).map((m) => new Error(m)),
  fc.constant(new TypeError('Failed to fetch')),
  fc.constant(new DOMException('The operation was aborted.', 'AbortError')),
);

describe("PokeApiClient — Property 13: lunghezza del messaggio d'errore in 1..200", () => {
  it('get: parametri non validi producono un messaggio di lunghezza 1..200', async () => {
    await fc.assert(
      fc.asyncProperty(anyIdentifier, async (identifier) => {
        const client = createPokeApiClient({
          fetchFn: createRejectingFetch(new Error('non deve importare')),
        });

        const result = await client.get(identifier);

        if (!result.ok) {
          assertMessageLength(result.error.message);
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('list: paginazioni non valide producono un messaggio di lunghezza 1..200', async () => {
    await fc.assert(
      fc.asyncProperty(anyPagination, async (params) => {
        const client = createPokeApiClient({
          fetchFn: createRejectingFetch(new Error('non deve importare')),
        });

        const result = await client.list(params);

        if (!result.ok) {
          assertMessageLength(result.error.message);
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('get: 404 → messaggio di lunghezza 1..200', async () => {
    await fc.assert(
      fc.asyncProperty(validIdentifier, async (identifier) => {
        const client = createPokeApiClient({
          fetchFn: createStatusFetch(HTTP_NOT_FOUND),
        });

        const result = await client.get(identifier);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          assertMessageLength(result.error.message);
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('get/list: non-2xx (≠404) → messaggio di lunghezza 1..200', async () => {
    await fc.assert(
      fc.asyncProperty(
        validIdentifier,
        validPagination,
        nonOkStatus,
        async (identifier, pagination, status) => {
          const client = createPokeApiClient({
            fetchFn: createStatusFetch(status),
          });

          const getResult = await client.get(identifier);
          expect(getResult.ok).toBe(false);
          if (!getResult.ok) {
            assertMessageLength(getResult.error.message);
          }

          const listResult = await client.list(pagination);
          expect(listResult.ok).toBe(false);
          if (!listResult.ok) {
            assertMessageLength(listResult.error.message);
          }
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it('get/list: la fetch rigetta (rete/timeout) → messaggio di lunghezza 1..200', async () => {
    await fc.assert(
      fc.asyncProperty(
        validIdentifier,
        validPagination,
        rejectionReason,
        async (identifier, pagination, reason) => {
          const client = createPokeApiClient({
            fetchFn: createRejectingFetch(reason),
          });

          const getResult = await client.get(identifier);
          expect(getResult.ok).toBe(false);
          if (!getResult.ok) {
            assertMessageLength(getResult.error.message);
          }

          const listResult = await client.list(pagination);
          expect(listResult.ok).toBe(false);
          if (!listResult.ok) {
            assertMessageLength(listResult.error.message);
          }
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it('get/list: corpo 2xx non conforme → messaggio di lunghezza 1..200', async () => {
    await fc.assert(
      fc.asyncProperty(
        validIdentifier,
        validPagination,
        nonConformingBody,
        async (identifier, pagination, body) => {
          const client = createPokeApiClient({
            fetchFn: createStatusFetch(200, body),
          });

          const getResult = await client.get(identifier);
          expect(getResult.ok).toBe(false);
          if (!getResult.ok) {
            assertMessageLength(getResult.error.message);
          }

          const listResult = await client.list(pagination);
          expect(listResult.ok).toBe(false);
          if (!listResult.ok) {
            assertMessageLength(listResult.error.message);
          }
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});
