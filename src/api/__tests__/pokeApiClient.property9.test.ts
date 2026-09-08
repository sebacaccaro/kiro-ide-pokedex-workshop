import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  createPokeApiClient,
  type FetchFn,
  type FetchResponse,
} from '../pokeApiClient';

// Property-based test (fast-check).
// Feature: pokeapi-client, Property 9: Il Base_URL configurato è prefisso di ogni richiesta
// Validates: Requirements 3.1, 6.3
//
// Per ogni Base_URL assoluto http(s) valido usato alla creazione del client e
// per ogni operazione (`get` e `list`), l'URL passato alla `fetch` inizia con
// il Base_URL normalizzato (senza slash finale, come fa `buildUrl` in ./url).
// Il comportamento osservabile (tipi di dominio ed errori) non dipende dal
// valore concreto del Base_URL valido. La `fetch` iniettata registra l'URL
// richiesto e risponde con corpi conformi (nessuna rete reale, Requirement 6.1).

// --- Corpi conformi ----------------------------------------------------------

/** Un corpo `PokemonRaw` conforme: consente a `get` di completare con successo. */
const conformingPokemonBody = {
  id: 25,
  name: 'pikachu',
  height: 4,
  weight: 60,
  base_experience: 112,
  abilities: [{ ability: { name: 'static' }, is_hidden: false, slot: 1 }],
  types: [{ slot: 1, type: { name: 'electric' } }],
} as const;

/** Un corpo `PokemonListPageRaw` conforme: consente a `list` di completare. */
const conformingListBody = {
  count: 1302,
  next: null,
  previous: null,
  results: [{ name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon/1/' }],
} as const;

// --- Mock locale di FetchFn --------------------------------------------------

/** Un mock di `FetchFn` che registra l'ultimo URL richiesto. */
interface RecordingFetch {
  readonly fetchFn: FetchFn;
  readonly lastUrl: () => string | undefined;
}

/**
 * Crea una `FetchFn` che registra ogni URL richiesto e risponde 200 con il
 * `body` conforme fornito. Nessuna rete reale (Requirement 6.1).
 */
function createRecordingFetch(body: unknown): RecordingFetch {
  const calls: string[] = [];
  const response: FetchResponse = {
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  };
  const fetchFn: FetchFn = (input) => {
    calls.push(input);
    return Promise.resolve(response);
  };
  return { fetchFn, lastUrl: () => calls.at(-1) };
}

// --- Generatore validBaseUrl -------------------------------------------------

/** Schemi http(s) ammessi. */
const scheme = fc.constantFrom('http', 'https');

/**
 * Host: etichette che iniziano con una lettera (alfanumeriche a seguire),
 * separate da punto. L'etichetta iniziale evita host puramente numerici che
 * `new URL` rifiuterebbe (es. `a.0`).
 */
const host = fc
  .array(
    fc
      .string({ minLength: 1, maxLength: 12 })
      .filter((s) => /^[a-z][a-z0-9]*$/.test(s)),
    { minLength: 1, maxLength: 3 },
  )
  .map((labels) => labels.join('.'));

/** Path opzionale: segmenti alfanumerici (0..3) uniti da '/'. */
const optionalPath = fc
  .array(
    fc
      .string({ minLength: 1, maxLength: 8 })
      .filter((s) => /^[a-z0-9]+$/.test(s)),
    { minLength: 0, maxLength: 3 },
  )
  .map((segments) => (segments.length === 0 ? '' : `/${segments.join('/')}`));

/**
 * validBaseUrl: URL assoluto http(s) con host, path opzionale e slash finale
 * opzionale. Copre le forme che il client deve accettare alla creazione.
 */
const validBaseUrl: fc.Arbitrary<string> = fc
  .tuple(scheme, host, optionalPath, fc.boolean())
  .map(
    ([s, h, p, trailingSlash]) => `${s}://${h}${p}${trailingSlash ? '/' : ''}`,
  );

/** Normalizza il Base_URL rimuovendo gli slash finali, come fa `buildUrl`. */
function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

// --- Test --------------------------------------------------------------------

describe('Property 9: il Base_URL configurato è prefisso di ogni richiesta', () => {
  it('get: l URL passato a fetch inizia con il Base_URL normalizzato', async () => {
    await fc.assert(
      fc.asyncProperty(validBaseUrl, async (baseUrl) => {
        const mock = createRecordingFetch(conformingPokemonBody);
        const client = createPokeApiClient({ baseUrl, fetchFn: mock.fetchFn });

        const result = await client.get(25);

        // Comportamento osservabile indipendente dal Base_URL valido concreto.
        expect(result.ok).toBe(true);

        const url = mock.lastUrl();
        expect(url).toBeDefined();
        expect(url ?? '').toContain(`${normalizeBaseUrl(baseUrl)}/`);
        expect((url ?? '').startsWith(normalizeBaseUrl(baseUrl))).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('list: l URL passato a fetch inizia con il Base_URL normalizzato', async () => {
    await fc.assert(
      fc.asyncProperty(validBaseUrl, async (baseUrl) => {
        const mock = createRecordingFetch(conformingListBody);
        const client = createPokeApiClient({ baseUrl, fetchFn: mock.fetchFn });

        const result = await client.list({ limit: 20, offset: 0 });

        // Comportamento osservabile indipendente dal Base_URL valido concreto.
        expect(result.ok).toBe(true);

        const url = mock.lastUrl();
        expect(url).toBeDefined();
        expect((url ?? '').startsWith(normalizeBaseUrl(baseUrl))).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});
