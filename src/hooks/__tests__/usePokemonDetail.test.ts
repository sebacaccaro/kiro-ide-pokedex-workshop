import { act, renderHook, waitFor } from '@testing-library/react';
import fc from 'fast-check';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
  PokeApiError,
  PokeApiErrorCategory,
  Result,
} from '../../api/errors';
import type { PokeApiClient } from '../../api/pokeApiClient';
import type { Pokemon } from '../../types/pokemon';
import { usePokemonDetail } from '../usePokemonDetail';

// Unit test (esempi) per l'hook `usePokemonDetail`.
// Fase RED del TDD: questi test descrivono il comportamento atteso dell'hook
// che NON esiste ancora (implementato nel task 6.2). Il client PokéAPI è
// mockato con vi.fn(): nessuna rete reale, test deterministici.
// _Requirements: 3.1, 4.1, 4.2, 4.3, 4.4, 4.5_

// --- Helper: fixture di dominio e mock del client ---------------------------

/** Un `Pokemon` di dominio conforme, sufficiente per gli assert dei test. */
const pikachu: Pokemon = {
  id: 25,
  name: 'pikachu',
  height: 4,
  weight: 60,
  baseExperience: 112,
  abilities: [{ name: 'static', isHidden: false, slot: 1 }],
  types: [{ slot: 1, name: 'electric' }],
  spriteUrl: 'https://example.test/pikachu.png',
};

/** Costruisce un `Result` di successo con il Pokémon dato. */
function ok(value: Pokemon): Result<Pokemon> {
  return { ok: true, value };
}

/** Costruisce un `Result` di errore con l'errore dato. */
function fail(error: PokeApiError): Result<Pokemon> {
  return { ok: false, error };
}

/** Errore "risorsa non trovata" per un identificatore. */
function notFound(identifier: number): PokeApiError {
  return {
    category: 'risorsa non trovata',
    message: `Risorsa non trovata per l'identificatore ${identifier}.`,
    httpStatus: 404,
    identifier,
  };
}

/** Errore di rete (categoria diversa da "risorsa non trovata"). */
const networkError: PokeApiError = {
  category: 'errore di rete',
  message: 'Errore di rete o timeout durante la richiesta alle PokéAPI.',
};

/**
 * Crea un `PokeApiClient` mockato in cui `get` è controllabile dal test.
 * `list` non è usato dall'hook di dettaglio ma è richiesto dall'interfaccia.
 */
function createMockClient(getImpl: PokeApiClient['get']): {
  readonly client: PokeApiClient;
  readonly get: ReturnType<typeof vi.fn>;
} {
  const get = vi.fn(getImpl);
  const list = vi.fn<PokeApiClient['list']>(() =>
    Promise.resolve({
      ok: true,
      value: { count: 0, next: null, previous: null, results: [] },
    }),
  );
  const getSpecies = vi.fn<PokeApiClient['getSpecies']>(() =>
    Promise.resolve({ ok: true, value: { id: 0, flavorText: '' } }),
  );
  return { client: { get, list, getSpecies }, get };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('usePokemonDetail', () => {
  it('richiede il Pokémon con get(id) usando l\'identificatore fornito (Req 3.1)', async () => {
    const { client, get } = createMockClient(() => Promise.resolve(ok(pikachu)));

    renderHook(() => usePokemonDetail(client, 25));

    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(get).toHaveBeenCalledWith(25);
  });

  it('parte in Stato_Caricamento e lo rimuove mostrando i dati al successo (Req 4.1, 4.2)', async () => {
    const { client } = createMockClient(() => Promise.resolve(ok(pikachu)));

    const { result } = renderHook(() => usePokemonDetail(client, 25));

    // Req 4.1: mentre la richiesta è in corso, isLoading è true e non ci sono dati.
    expect(result.current.isLoading).toBe(true);
    expect(result.current.pokemon).toBeNull();
    expect(result.current.error).toBeNull();

    // Req 4.2: al completamento con esito positivo, isLoading torna false e i dati compaiono.
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.pokemon).toEqual(pikachu);
    expect(result.current.error).toBeNull();
    expect(result.current.isNotFound).toBe(false);
  });

  it('segnala isNotFound su "risorsa non trovata" senza dati parziali (Req 4.3)', async () => {
    const { client } = createMockClient(() => Promise.resolve(fail(notFound(9999))));

    const { result } = renderHook(() => usePokemonDetail(client, 9999));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isNotFound).toBe(true);
    expect(result.current.pokemon).toBeNull();
    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.category).toBe('risorsa non trovata');
  });

  it('espone l\'errore con la sua category per categorie diverse da "risorsa non trovata" (Req 4.4)', async () => {
    const { client } = createMockClient(() => Promise.resolve(fail(networkError)));

    const { result } = renderHook(() => usePokemonDetail(client, 25));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error?.category).toBe('errore di rete');
    expect(result.current.isNotFound).toBe(false);
    expect(result.current.pokemon).toBeNull();
  });

  it('con retry ripete get sullo stesso id e ripristina lo Stato_Caricamento (Req 4.5)', async () => {
    const { client, get } = createMockClient(() => Promise.resolve(fail(networkError)));

    const { result } = renderHook(() => usePokemonDetail(client, 25));

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenLastCalledWith(25);

    // Il prossimo tentativo va a buon fine.
    get.mockImplementation(() => Promise.resolve(ok(pikachu)));

    act(() => {
      result.current.retry();
    });

    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    expect(get).toHaveBeenLastCalledWith(25);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.pokemon).toEqual(pikachu);
    expect(result.current.error).toBeNull();
  });
});

// --- Property test (fast-check) ---------------------------------------------

/** Le quattro categorie ammesse per un PokeApiError (vedi src/api/errors.ts). */
const ERROR_CATEGORIES: readonly PokeApiErrorCategory[] = [
  'risorsa non trovata',
  'risposta HTTP non valida',
  'parametri non validi',
  'errore di rete',
];

/** Costruisce un PokeApiError con la categoria data e un messaggio generico. */
function errorWithCategory(category: PokeApiErrorCategory): PokeApiError {
  return {
    category,
    message: `Errore di categoria "${category}" durante la richiesta.`,
  };
}

describe('usePokemonDetail (property)', () => {
  // Feature: pokedex-themed-views, Property 5: La categoria dell'errore è propagata fedelmente e nessuna eccezione sfugge
  it('espone lo stato di errore con la stessa category del client, senza eccezioni non gestite e senza dati', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...ERROR_CATEGORIES),
        async (category) => {
          const { client } = createMockClient(() =>
            Promise.resolve(fail(errorWithCategory(category))),
          );

          const { result, unmount } = renderHook(() =>
            usePokemonDetail(client, 25),
          );

          try {
            await waitFor(() =>
              expect(result.current.isLoading).toBe(false),
            );

            // La categoria dell'errore è propagata fedelmente (Req 4.4, 9.6).
            expect(result.current.error).not.toBeNull();
            expect(result.current.error?.category).toBe(category);
            // Nessun dato parziale accompagna lo stato di errore.
            expect(result.current.pokemon).toBeNull();
            // Nessuna eccezione sfugge: il render è arrivato allo stato finale.
          } finally {
            unmount();
          }
        },
      ),
      { numRuns: 100 },
    );
  }, 30_000);
});
