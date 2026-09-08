import fc from 'fast-check';

import { describe, expect, it } from 'vitest';

import type { Pokemon, PokemonListPage } from '../../types/pokemon';
import {
  type PokeApiError,
  type PokeApiErrorCategory,
  type Result,
} from '../errors';
import {
  createPokeApiClient,
  type FetchFn,
  type FetchResponse,
  type ListParams,
} from '../pokeApiClient';

// Property-based test (fast-check).
// Feature: pokeapi-client, Property 12: La categoria dell'errore appartiene sempre all'insieme ammesso
//
// Validates: Requirements 4.5
//
// Per ogni errore prodotto dal client in QUALUNQUE scenario di fallimento, il
// campo `category` appartiene esattamente all'insieme {"risorsa non trovata",
// "risposta HTTP non valida", "parametri non validi", "errore di rete"}.
//
// Niente rete reale: ogni scenario configura una `FetchFn` mock locale (o usa
// un input non valido che corto-circuita prima della fetch) (Requirement 6.1).

/** Numero minimo di iterazioni richiesto dal design per le proprietà. */
const NUM_RUNS = 100;

/** Insieme esatto delle categorie ammesse (Requirement 4.5). */
const ALLOWED_CATEGORIES: ReadonlySet<PokeApiErrorCategory> =
  new Set<PokeApiErrorCategory>([
    'risorsa non trovata',
    'risposta HTTP non valida',
    'parametri non validi',
    'errore di rete',
  ]);

/** Un corpo `PokemonRaw` conforme, usato dai mock che devono avere successo. */
const conformingPokemonBody = {
  id: 25,
  name: 'pikachu',
  height: 4,
  weight: 60,
  base_experience: 112,
  abilities: [{ ability: { name: 'static' }, is_hidden: false, slot: 1 }],
  types: [{ slot: 1, type: { name: 'electric' } }],
} as const;

/** Crea una `FetchFn` che risponde con lo stato indicato e un corpo conforme. */
function createStatusFetch(status: number): FetchFn {
  const response: FetchResponse = {
    ok: status >= 200 && status <= 299,
    status,
    json: () => Promise.resolve(conformingPokemonBody),
  };
  return () => Promise.resolve(response);
}

/** Crea una `FetchFn` che rigetta sempre, simulando un errore di rete/abort. */
function createRejectingFetch(reason: unknown): FetchFn {
  return (): Promise<FetchResponse> => Promise.reject(reason);
}

/**
 * Crea una `FetchFn` 2xx con un corpo NON conforme (narrowing fallito), così
 * da provocare un errore "risposta HTTP non valida" a valle del parsing.
 */
function createNonConformingBodyFetch(body: unknown): FetchFn {
  const response: FetchResponse = {
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  };
  return () => Promise.resolve(response);
}

/**
 * Uno scenario di fallimento generato: descrive come configurare il client e
 * quale operazione invocare per ottenere un errore. Copre tutti i percorsi di
 * fallimento del client.
 */
type FailureResult =
  Result<Pokemon, PokeApiError> | Result<PokemonListPage, PokeApiError>;

interface FailureScenario {
  readonly fetchFn: FetchFn;
  readonly run: (
    client: ReturnType<typeof createPokeApiClient>,
  ) => Promise<FailureResult>;
}

// Stato HTTP che indica una risorsa non trovata (404).
const notFoundScenario: fc.Arbitrary<FailureScenario> = fc
  .oneof(fc.integer({ min: 1, max: 100000 }), fc.constant('pikachu'))
  .map((identifier) => ({
    fetchFn: createStatusFetch(404),
    run: (client) => client.get(identifier),
  }));

// Stato non-2xx diverso da 404 (get o list).
const nonOkStatus: fc.Arbitrary<number> = fc
  .integer({ min: 100, max: 599 })
  .filter((status) => (status < 200 || status > 299) && status !== 404);

const httpErrorScenario: fc.Arbitrary<FailureScenario> = fc
  .tuple(nonOkStatus, fc.boolean())
  .map(([status, useList]) => ({
    fetchFn: createStatusFetch(status),
    run: (client) => (useList ? client.list() : client.get(25)),
  }));

// Errore di rete: la fetch rigetta (get o list).
const rejectionReason: fc.Arbitrary<unknown> = fc.oneof(
  fc
    .string({ minLength: 1, maxLength: 50 })
    .map((message) => new Error(message)),
  fc.constant(new TypeError('Failed to fetch')),
  fc.constant(new DOMException('The operation was aborted.', 'AbortError')),
);

const networkScenario: fc.Arbitrary<FailureScenario> = fc
  .tuple(rejectionReason, fc.boolean())
  .map(([reason, useList]) => ({
    fetchFn: createRejectingFetch(reason),
    run: (client) => (useList ? client.list() : client.get(25)),
  }));

// Corpo 2xx non conforme: mancano campi obbligatori o hanno tipo errato.
const nonConformingBody: fc.Arbitrary<unknown> = fc.oneof(
  fc.constant(null),
  fc.constant({}),
  fc.constant([1, 2, 3]),
  fc.string(),
  fc.integer(),
  fc.record({ id: fc.string(), name: fc.integer() }),
);

const nonConformingBodyScenario: fc.Arbitrary<FailureScenario> = fc
  .tuple(nonConformingBody, fc.boolean())
  .map(([body, useList]) => ({
    fetchFn: createNonConformingBodyFetch(body),
    run: (client) => (useList ? client.list() : client.get(25)),
  }));

// Parametri non validi: la fetch mock non verrà mai invocata (corto-circuito).
const guardFetch: FetchFn = () =>
  Promise.reject(
    new Error('la fetch non deve essere invocata per input non validi'),
  );

const invalidIdentifier: fc.Arbitrary<string | number> = fc.oneof(
  fc.integer({ min: -1000, max: 0 }),
  fc.integer({ min: 100001, max: 1000000 }),
  fc.double({ min: 1, max: 100000, noInteger: true }),
  fc.constant(''),
  fc.string({ minLength: 101, maxLength: 200 }),
);

const invalidPagination: fc.Arbitrary<ListParams> = fc.oneof(
  fc.record({ limit: fc.integer({ min: -100, max: 0 }) }),
  fc.record({ limit: fc.integer({ min: 101, max: 1000 }) }),
  fc.record({ offset: fc.integer({ min: -1000, max: -1 }) }),
);

const invalidParamsScenario: fc.Arbitrary<FailureScenario> = fc.oneof(
  invalidIdentifier.map((identifier) => ({
    fetchFn: guardFetch,
    run: (client: ReturnType<typeof createPokeApiClient>) =>
      client.get(identifier),
  })),
  invalidPagination.map((params) => ({
    fetchFn: guardFetch,
    run: (client: ReturnType<typeof createPokeApiClient>) =>
      client.list(params),
  })),
);

/** Unione di tutti gli scenari di fallimento del client. */
const failureScenario: fc.Arbitrary<FailureScenario> = fc.oneof(
  notFoundScenario,
  httpErrorScenario,
  networkScenario,
  nonConformingBodyScenario,
  invalidParamsScenario,
);

describe("PokeApiClient — Property 12: categoria dell'errore sempre nell'insieme ammesso", () => {
  it("per ogni scenario di fallimento, la categoria dell'errore appartiene all'insieme ammesso", async () => {
    await fc.assert(
      fc.asyncProperty(failureScenario, async (scenario) => {
        const client = createPokeApiClient({ fetchFn: scenario.fetchFn });

        const result = await scenario.run(client);

        // Ogni scenario è costruito per fallire: verifichiamo l'invariante
        // sulla categoria solo sugli errori effettivamente prodotti.
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(ALLOWED_CATEGORIES.has(result.error.category)).toBe(true);
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
