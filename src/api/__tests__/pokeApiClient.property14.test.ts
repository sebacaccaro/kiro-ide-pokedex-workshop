import fc from 'fast-check';

import { describe, expect, it } from 'vitest';

import {
  createPokeApiClient,
  type FetchFn,
  type FetchResponse,
} from '../pokeApiClient';

// Property-based test (fast-check).
// Feature: pokeapi-client, Property 14: httpStatus presente e valido per le categorie HTTP
//
// Validates: Requirements 4.7
//
// Per ogni errore con categoria "risorsa non trovata" o "risposta HTTP non
// valida", `httpStatus` è presente ed è un intero compreso tra 100 e 599.
//
// Nota: solo gli errori che portano uno stato HTTP garantiscono `httpStatus`.
// La categoria "risposta HTTP non valida" può anche derivare da un corpo 2xx
// non conforme (dove l'errore NON ha `httpStatus`, cfr. Property 8). Qui
// pilotiamo esclusivamente gli scenari che portano uno stato HTTP:
//   - 404             -> httpStatus = 404
//   - non-2xx != 404  -> "risposta HTTP non valida", httpStatus = stato ricevuto
//
// Nota sul 404: `get` lo traduce in "risorsa non trovata" (porta l'identifier),
// mentre `list` lo tratta come un qualunque stato non-2xx e produce "risposta
// HTTP non valida". In entrambi i casi la categoria è una delle due categorie
// HTTP e `httpStatus` è 404: è esattamente ciò che Property 14 richiede, quindi
// per il caso 404 asseriamo solo l'invariante della proprietà, non la specifica
// categoria per-operazione.

/** Numero minimo di iterazioni richiesto dal design per le proprietà. */
const NUM_RUNS = 100;

/** Estremi ammessi per uno stato HTTP valido. */
const MIN_HTTP_STATUS = 100;
const MAX_HTTP_STATUS = 599;

/** Stato HTTP: risorsa non trovata. */
const HTTP_NOT_FOUND = 404;

/** Le due sole categorie di errore che devono portare `httpStatus`. */
const HTTP_STATUS_CATEGORIES = [
  'risorsa non trovata',
  'risposta HTTP non valida',
] as const;

/**
 * Crea una `FetchFn` mock che risponde con `ok: false` e lo stato indicato,
 * senza alcuna rete reale (Requirement 6.1). Il corpo non viene consumato:
 * l'errore scatta sullo stato prima di leggere `json()`.
 */
function createStatusFetch(status: number): FetchFn {
  const response: FetchResponse = {
    ok: false,
    status,
    json: () =>
      Promise.reject(
        new Error('json non deve essere invocato su stato non-2xx'),
      ),
  };
  return () => Promise.resolve(response);
}

/**
 * Genera uno stato HTTP di errore fuori dall'intervallo 200-299 e diverso da
 * 404: interi in 100..599 esclusi i codici 2xx e il 404. Producono la categoria
 * "risposta HTTP non valida" con `httpStatus` uguale allo stato ricevuto.
 */
const invalidResponseStatus: fc.Arbitrary<number> = fc
  .integer({ min: MIN_HTTP_STATUS, max: MAX_HTTP_STATUS })
  .filter(
    (status) => (status < 200 || status > 299) && status !== HTTP_NOT_FOUND,
  );

/**
 * Verifica che l'errore appartenga a una categoria HTTP e che `httpStatus` sia
 * presente, intero e nell'intervallo 100..599.
 */
function expectValidHttpStatusError(error: {
  category: string;
  httpStatus?: number;
}): void {
  expect(HTTP_STATUS_CATEGORIES).toContain(error.category);
  expect(error.httpStatus).toBeDefined();
  const { httpStatus } = error;
  expect(Number.isInteger(httpStatus)).toBe(true);
  expect(httpStatus).toBeGreaterThanOrEqual(MIN_HTTP_STATUS);
  expect(httpStatus).toBeLessThanOrEqual(MAX_HTTP_STATUS);
}

describe('PokeApiClient — Property 14: httpStatus presente e valido per le categorie HTTP', () => {
  it('get: un 404 produce un errore con categoria HTTP e httpStatus intero 100..599', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(HTTP_NOT_FOUND), async (status) => {
        const client = createPokeApiClient({
          fetchFn: createStatusFetch(status),
        });

        const result = await client.get(25);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          // `get` conserva la semantica "risorsa non trovata" per il 404.
          expect(result.error.category).toBe('risorsa non trovata');
          expect(result.error.httpStatus).toBe(status);
          expectValidHttpStatusError(result.error);
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('list: un 404 produce un errore con categoria HTTP e httpStatus intero 100..599', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(HTTP_NOT_FOUND), async (status) => {
        const client = createPokeApiClient({
          fetchFn: createStatusFetch(status),
        });

        const result = await client.list({ limit: 20, offset: 0 });

        expect(result.ok).toBe(false);
        if (!result.ok) {
          // `list` tratta il 404 come uno stato non-2xx qualunque.
          expect(result.error.category).toBe('risposta HTTP non valida');
          expect(result.error.httpStatus).toBe(status);
          expectValidHttpStatusError(result.error);
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('get: uno stato non-2xx != 404 produce "risposta HTTP non valida" con httpStatus intero 100..599', async () => {
    await fc.assert(
      fc.asyncProperty(invalidResponseStatus, async (status) => {
        const client = createPokeApiClient({
          fetchFn: createStatusFetch(status),
        });

        const result = await client.get(25);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.category).toBe('risposta HTTP non valida');
          expect(result.error.httpStatus).toBe(status);
          expectValidHttpStatusError(result.error);
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('list: uno stato non-2xx != 404 produce "risposta HTTP non valida" con httpStatus intero 100..599', async () => {
    await fc.assert(
      fc.asyncProperty(invalidResponseStatus, async (status) => {
        const client = createPokeApiClient({
          fetchFn: createStatusFetch(status),
        });

        const result = await client.list({ limit: 20, offset: 0 });

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.category).toBe('risposta HTTP non valida');
          expect(result.error.httpStatus).toBe(status);
          expectValidHttpStatusError(result.error);
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
