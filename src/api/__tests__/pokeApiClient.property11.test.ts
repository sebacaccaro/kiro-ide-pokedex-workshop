import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  createPokeApiClient,
  type FetchFn,
  type FetchResponse,
} from '../pokeApiClient';

// Property test per il client PokéAPI.
// Feature: pokeapi-client, Property 11: Parametri non validi vengono rifiutati
// senza richiesta HTTP.
//
// Per ogni identificatore non valido (intero fuori 1..100000, numero non intero,
// stringa vuota o più lunga di 100 caratteri) e per ogni coppia di paginazione
// non valida (limit < 1 o > 100, oppure offset < 0), l'operazione restituisce un
// errore con categoria "parametri non validi" e la `fetch` iniettata NON viene
// mai invocata.
//
// Validates: Requirements 1.5, 2.5

/** Numero minimo di iterazioni richiesto dal design per le proprietà. */
const NUM_RUNS = 100;

/** Limiti dell'identificatore numerico (Requirement 1.1). */
const MIN_ID = 1;
const MAX_ID = 100000;

/** Lunghezza massima dell'identificatore testuale (Requirement 1.2). */
const MAX_NAME_LENGTH = 100;

/** Limiti della paginazione (Requirement 2.5). */
const MIN_LIMIT = 1;
const MAX_LIMIT = 100;

// --- Mock locale di FetchFn --------------------------------------------------

/** Un mock di FetchFn che registra ogni chiamata ricevuta. */
interface RecordingFetch {
  readonly fetchFn: FetchFn;
  readonly callCount: () => number;
}

/**
 * Crea una `FetchFn` che registra ogni invocazione. Per input non validi la
 * `fetch` NON deve mai essere chiamata, quindi `callCount()` deve restare 0.
 * Se venisse invocata risponderebbe comunque con un corpo conforme, così un
 * eventuale bug (fetch chiamata) non verrebbe mascherato da un errore diverso.
 * Nessuna rete reale (Requirement 6.1).
 */
function createRecordingFetch(): RecordingFetch {
  const calls: string[] = [];
  const response: FetchResponse = {
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
  };
  const fetchFn: FetchFn = (input) => {
    calls.push(input);
    return Promise.resolve(response);
  };
  return { fetchFn, callCount: () => calls.length };
}

// --- Generatori --------------------------------------------------------------

/**
 * Identificatore numerico non valido: interi fuori 1..100000 (≤ 0 o > 100000)
 * oppure numeri non interi (float con parte frazionaria).
 */
const invalidNumberIdentifier: fc.Arbitrary<number> = fc.oneof(
  fc.integer({ max: MIN_ID - 1 }),
  fc.integer({ min: MAX_ID + 1 }),
  fc
    .double({ min: 1, max: 100000, noNaN: true, noDefaultInfinity: true })
    .filter((n) => !Number.isInteger(n)),
);

/**
 * Identificatore testuale non valido: stringa che dopo il trim è vuota, oppure
 * stringa la cui lunghezza (dopo il trim) supera i 100 caratteri.
 */
const invalidStringIdentifier: fc.Arbitrary<string> = fc.oneof(
  // Vuota o composta solo da spazi: dopo il trim ha lunghezza 0.
  fc.stringMatching(/^[ \t]*$/),
  // Più lunga di 100 caratteri anche dopo il trim (nessun whitespace ai bordi).
  fc
    .string({ minLength: MAX_NAME_LENGTH + 1, maxLength: 200 })
    .map((s) => `x${s.replace(/\s/g, 'x')}x`),
);

/** Identificatore non valido: unione di numeri e stringhe non valide. */
const invalidIdentifier: fc.Arbitrary<string | number> = fc.oneof(
  invalidNumberIdentifier,
  invalidStringIdentifier,
);

/**
 * Paginazione non valida: almeno uno tra limit e offset viola i vincoli
 * (limit < 1 o > 100, oppure offset < 0). Costruita scegliendo esplicitamente
 * quale campo rendere invalido, così ogni valore generato è genuinamente non
 * valido.
 */
const invalidPagination: fc.Arbitrary<{ limit?: number; offset?: number }> =
  fc.oneof(
    // limit troppo basso (< 1)
    fc.record({
      limit: fc.integer({ max: MIN_LIMIT - 1 }),
      offset: fc.integer({ min: 0, max: 1000 }),
    }),
    // limit troppo alto (> 100)
    fc.record({
      limit: fc.integer({ min: MAX_LIMIT + 1 }),
      offset: fc.integer({ min: 0, max: 1000 }),
    }),
    // offset negativo
    fc.record({
      limit: fc.integer({ min: MIN_LIMIT, max: MAX_LIMIT }),
      offset: fc.integer({ max: -1 }),
    }),
  );

// --- Test --------------------------------------------------------------------

describe('Property 11: parametri non validi rifiutati senza richiesta HTTP', () => {
  it('get con identificatore non valido restituisce "parametri non validi" e non invoca fetch', async () => {
    await fc.assert(
      fc.asyncProperty(invalidIdentifier, async (identifier) => {
        const mock = createRecordingFetch();
        const client = createPokeApiClient({ fetchFn: mock.fetchFn });

        const result = await client.get(identifier);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.category).toBe('parametri non validi');
        }
        expect(mock.callCount()).toBe(0);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('list con paginazione non valida restituisce "parametri non validi" e non invoca fetch', async () => {
    await fc.assert(
      fc.asyncProperty(invalidPagination, async (params) => {
        const mock = createRecordingFetch();
        const client = createPokeApiClient({ fetchFn: mock.fetchFn });

        const result = await client.list(params);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.category).toBe('parametri non validi');
        }
        expect(mock.callCount()).toBe(0);
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
