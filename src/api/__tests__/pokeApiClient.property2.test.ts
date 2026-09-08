import { describe, expect, it } from 'vitest';
import fc from 'fast-check';

import {
  createPokeApiClient,
  type FetchFn,
  type FetchResponse,
} from '../pokeApiClient';

// Property test — Feature: pokeapi-client, Property 2: Composizione
// dell'identificatore normalizzato nell'URL.
// Validates: Requirements 1.1, 1.2
//
// Per ogni identificatore valido (intero in 1..100000 oppure stringa non vuota
// di 1..100 caratteri), l'URL richiesto da `get` è esattamente
// `{baseUrl}pokemon/{identificatore}` con le stringhe normalizzate in minuscolo;
// per ogni intero valido il segmento coincide con l'id.
//
// Il file è dedicato (non tocca pokeApiClient.test.ts) e usa un mock locale di
// `FetchFn` che registra l'URL richiesto e restituisce un corpo `PokemonRaw`
// conforme (ok:true, status:200). Nessuna rete reale (Requirement 6.1).

// --- Costanti ----------------------------------------------------------------

const MIN_ID = 1;
const MAX_ID = 100000;
const MAX_NAME_LENGTH = 100;

/** Base_URL fisso e valido usato per la composizione (senza slash finale). */
const BASE_URL = 'http://localhost/api/v2';

/** Un corpo `PokemonRaw` conforme: consente a `get` di comporre e richiedere l'URL. */
const conformingPokemonBody = {
  id: 25,
  name: 'pikachu',
  height: 4,
  weight: 60,
  base_experience: 112,
  abilities: [{ ability: { name: 'static' }, is_hidden: false, slot: 1 }],
  types: [{ slot: 1, type: { name: 'electric' } }],
} as const;

// --- Mock locale di FetchFn --------------------------------------------------

/** Un mock di FetchFn che registra l'ultimo URL richiesto. */
interface RecordingFetch {
  readonly fetchFn: FetchFn;
  readonly lastUrl: () => string | undefined;
}

/**
 * Crea una `FetchFn` che registra ogni URL richiesto e risponde sempre con un
 * corpo `PokemonRaw` conforme (ok:true, status:200). Nessuna rete reale.
 */
function createRecordingFetch(): RecordingFetch {
  const calls: string[] = [];
  const response: FetchResponse = {
    ok: true,
    status: 200,
    json: () => Promise.resolve(conformingPokemonBody),
  };
  const fetchFn: FetchFn = (input) => {
    calls.push(input);
    return Promise.resolve(response);
  };
  return { fetchFn, lastUrl: () => calls.at(-1) };
}

// --- Generatori --------------------------------------------------------------

/** Interi validi in 1..100000. */
const validIntegerId = fc.integer({ min: MIN_ID, max: MAX_ID });

/**
 * Stringhe valide 1..100 caratteri che restano tali dopo la normalizzazione
 * (trim + lowercase) e senza `/` interni, così da avere un unico segmento
 * confrontabile in modo deterministico con l'URL atteso.
 */
const validStringId = fc
  .string({ minLength: 1, maxLength: MAX_NAME_LENGTH })
  .filter((s) => {
    const trimmed = s.trim();
    return (
      trimmed.length >= 1 &&
      trimmed.length <= MAX_NAME_LENGTH &&
      !trimmed.includes('/')
    );
  });

/** Identificatore valido: unione di interi e stringhe. */
const validIdentifier: fc.Arbitrary<string | number> = fc.oneof(
  validIntegerId,
  validStringId,
);

/** La normalizzazione applicata dal client per comporre il segmento dell'URL. */
function expectedSegment(identifier: string | number): string {
  return typeof identifier === 'number'
    ? String(identifier)
    : identifier.trim().toLowerCase();
}

// --- Test --------------------------------------------------------------------

describe('Property 2: composizione dell identificatore normalizzato nell URL', () => {
  it('richiede {baseUrl}pokemon/{identificatore} con le stringhe in minuscolo', async () => {
    await fc.assert(
      fc.asyncProperty(validIdentifier, async (identifier) => {
        const mock = createRecordingFetch();
        const client = createPokeApiClient({
          baseUrl: BASE_URL,
          fetchFn: mock.fetchFn,
        });

        const result = await client.get(identifier);

        // L'identificatore è valido: la richiesta viene effettuata e ha successo.
        expect(result.ok).toBe(true);

        const segment = expectedSegment(identifier);
        expect(mock.lastUrl()).toBe(`${BASE_URL}/pokemon/${segment}`);

        // Per ogni intero valido il segmento coincide con l'id.
        if (typeof identifier === 'number') {
          expect(segment).toBe(String(identifier));
        } else {
          // Le stringhe sono normalizzate in minuscolo.
          expect(segment).toBe(segment.toLowerCase());
        }
      }),
      { numRuns: 100 },
    );
  });
});
