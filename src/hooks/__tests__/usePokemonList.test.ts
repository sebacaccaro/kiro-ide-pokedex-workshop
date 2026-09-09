import { act, renderHook, waitFor } from '@testing-library/react';
import fc from 'fast-check';
import { describe, expect, it, vi } from 'vitest';

import type { PokeApiError, Result } from '../../api/errors';
import type { ListParams, PokeApiClient } from '../../api/pokeApiClient';
import { FIRST_GEN_MAX_ID, toFirstGenEntries } from '../../lib/generation';
import type { PokemonListPage, ResourceReference } from '../../types/pokemon';
import { usePokemonList } from '../usePokemonList';

// Unit test (esempi) per l'hook `usePokemonList`.
// Fase RED del TDD (task 5.1): descrivono il comportamento osservabile dell'hook
// che NON esiste ancora (`src/hooks/usePokemonList.ts`, task 5.2). Il client è
// mockato con `vi.fn()` che restituisce `Result` deterministici: nessuna rete
// reale (Requirement 9.5).
// _Requirements: 1.1, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 9.3_

const BASE_URL = 'https://pokeapi.co/api/v2';

/** Costruisce un `ResourceReference` PokéAPI per un id numerico. */
function makeReference(id: number): ResourceReference {
  return { name: `pokemon-${id}`, url: `${BASE_URL}/pokemon/${id}/` };
}

/**
 * Costruisce una `PokemonListPage` di dominio a partire dagli id forniti,
 * simulando la forma restituita da `list`. `count` è fissato al di sopra dei 151
 * per riflettere il catalogo reale delle PokéAPI.
 */
function makePage(
  ids: readonly number[],
  next: string | null,
): PokemonListPage {
  return {
    count: 1302,
    next,
    previous: null,
    results: ids.map(makeReference),
  };
}

/** Un `Result` di successo per una pagina. */
function ok(page: PokemonListPage): Result<PokemonListPage> {
  return { ok: true, value: page };
}

/** Un `Result` di errore per una data categoria. */
function fail(category: PokeApiError['category']): Result<PokemonListPage> {
  return { ok: false, error: { category, message: `errore: ${category}` } };
}

/**
 * Crea un `PokeApiClient` mockato in cui solo `list` è utile: risponde in base
 * alla sequenza di `Result` fornita, un elemento per chiamata (nell'ordine).
 * `get` non è esercitato da questo hook e restituisce sempre un errore.
 */
function createListClient(
  responses: readonly Result<PokemonListPage>[],
): {
  readonly client: PokeApiClient;
  readonly list: ReturnType<typeof vi.fn>;
} {
  let call = 0;
  const list = vi.fn((_params?: ListParams) => {
    const response = responses[Math.min(call, responses.length - 1)];
    call += 1;
    return Promise.resolve(response);
  });
  const get = vi.fn(() => Promise.resolve(fail('risorsa non trovata')));
  const client: PokeApiClient = {
    list: list as unknown as PokeApiClient['list'],
    get: get as unknown as PokeApiClient['get'],
  };
  return { client, list };
}

/** Elenco degli id 1..20 (primo blocco pieno di Prima_Generazione). */
const firstTwentyIds = Array.from({ length: 20 }, (_unused, i) => i + 1);

describe('usePokemonList', () => {
  it('richiede il primo blocco con limit=20 e offset=0 all avvio (Req 1.1)', async () => {
    const { client, list } = createListClient([
      ok(makePage(firstTwentyIds, `${BASE_URL}/pokemon?offset=20&limit=20`)),
    ]);

    renderHook(() => usePokemonList(client));

    await waitFor(() => {
      expect(list).toHaveBeenCalledWith({ limit: 20, offset: 0 });
    });
  });

  it('mostra lo Stato_Caricamento iniziale finché nessuna voce è disponibile (Req 2.1)', async () => {
    const { client } = createListClient([
      ok(makePage(firstTwentyIds, `${BASE_URL}/pokemon?offset=20&limit=20`)),
    ]);

    const { result } = renderHook(() => usePokemonList(client));

    // Subito dopo il render il primo blocco è in caricamento e non c'è ancora
    // alcuna voce.
    expect(result.current.isInitialLoading).toBe(true);
    expect(result.current.entries).toHaveLength(0);

    await waitFor(() => {
      expect(result.current.isInitialLoading).toBe(false);
    });
    expect(result.current.entries.length).toBeGreaterThan(0);
  });

  it('aggiunge in coda le voci del blocco filtrate alla Prima_Generazione (Req 1.3)', async () => {
    // Il blocco contiene id validi e un id fuori 1..151 che va scartato.
    const { client } = createListClient([
      ok(makePage([1, 2, 3, 9999], null)),
    ]);

    const { result } = renderHook(() => usePokemonList(client));

    await waitFor(() => {
      expect(result.current.entries).toHaveLength(3);
    });
    expect(result.current.entries.map((e) => e.id)).toEqual([1, 2, 3]);
    expect(result.current.entries.map((e) => e.name)).toEqual([
      'pokemon-1',
      'pokemon-2',
      'pokemon-3',
    ]);
  });

  it('con loadMore richiede il blocco successivo con offset aumentato di 20 (Req 1.4)', async () => {
    const secondTwentyIds = Array.from(
      { length: 20 },
      (_unused, i) => i + 21,
    );
    const { client, list } = createListClient([
      ok(makePage(firstTwentyIds, `${BASE_URL}/pokemon?offset=20&limit=20`)),
      ok(makePage(secondTwentyIds, `${BASE_URL}/pokemon?offset=40&limit=20`)),
    ]);

    const { result } = renderHook(() => usePokemonList(client));

    await waitFor(() => {
      expect(result.current.entries).toHaveLength(20);
    });

    act(() => {
      result.current.loadMore();
    });

    await waitFor(() => {
      expect(list).toHaveBeenCalledWith({ limit: 20, offset: 20 });
    });
    await waitFor(() => {
      expect(result.current.entries).toHaveLength(40);
    });
    // Le voci precedenti restano come prefisso (nessuna rimozione).
    expect(result.current.entries.slice(0, 20).map((e) => e.id)).toEqual(
      firstTwentyIds,
    );
  });

  it('mostra isLoadingMore mentre carica un blocco successivo al primo (Req 2.2)', async () => {
    const secondTwentyIds = Array.from(
      { length: 20 },
      (_unused, i) => i + 21,
    );
    const { client } = createListClient([
      ok(makePage(firstTwentyIds, `${BASE_URL}/pokemon?offset=20&limit=20`)),
      ok(makePage(secondTwentyIds, `${BASE_URL}/pokemon?offset=40&limit=20`)),
    ]);

    const { result } = renderHook(() => usePokemonList(client));

    await waitFor(() => {
      expect(result.current.entries).toHaveLength(20);
    });
    expect(result.current.isLoadingMore).toBe(false);

    act(() => {
      result.current.loadMore();
    });

    // Durante il caricamento del secondo blocco: caricamento incrementale, non
    // iniziale, con le voci già mostrate ancora presenti.
    expect(result.current.isLoadingMore).toBe(true);
    expect(result.current.isInitialLoading).toBe(false);
    expect(result.current.entries).toHaveLength(20);

    await waitFor(() => {
      expect(result.current.isLoadingMore).toBe(false);
    });
  });

  it('diventa isComplete e non richiede altri blocchi una volta coperto il 151 (Req 1.5)', async () => {
    // Otto blocchi da 20 coprono 1..160; solo 1..151 sono ammessi. Il blocco che
    // contiene il 151 rende l'elenco completo.
    const pages: Result<PokemonListPage>[] = [];
    for (let block = 0; block < 8; block += 1) {
      const start = block * 20 + 1;
      const ids = Array.from({ length: 20 }, (_unused, i) => start + i);
      const isLast = block === 7;
      pages.push(
        ok(
          makePage(
            ids,
            isLast ? null : `${BASE_URL}/pokemon?offset=${(block + 1) * 20}&limit=20`,
          ),
        ),
      );
    }
    const { client, list } = createListClient(pages);

    const { result } = renderHook(() => usePokemonList(client));

    // Consuma i blocchi finché l'elenco non è completo.
    await waitFor(() => {
      expect(result.current.entries).toHaveLength(20);
    });
    for (let i = 0; i < 7; i += 1) {
      act(() => {
        result.current.loadMore();
      });
      // Attende che il blocco appena richiesto sia stato assorbito.
      await waitFor(() => {
        expect(result.current.isLoadingMore).toBe(false);
      });
    }

    await waitFor(() => {
      expect(result.current.isComplete).toBe(true);
    });
    // Solo i 151 di Prima_Generazione sono presenti (gli id 152..160 scartati).
    expect(result.current.entries).toHaveLength(151);
    expect(result.current.entries.at(-1)?.id).toBe(151);

    const callsWhenComplete = list.mock.calls.length;
    act(() => {
      result.current.loadMore();
    });
    // Nessuna nuova chiamata dopo il completamento.
    expect(list.mock.calls.length).toBe(callsWhenComplete);
  });

  it('espone lo Stato_Errore con la categoria quando il primo blocco fallisce (Req 2.3)', async () => {
    const { client } = createListClient([fail('errore di rete')]);

    const { result } = renderHook(() => usePokemonList(client));

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });
    expect(result.current.error?.category).toBe('errore di rete');
    expect(result.current.isInitialLoading).toBe(false);
    expect(result.current.entries).toHaveLength(0);
  });

  it('con retry richiede di nuovo lo stesso blocco e torna in caricamento (Req 2.4, 2.5)', async () => {
    // Primo tentativo fallisce, il retry (stesso offset 0) va a buon fine.
    const { client, list } = createListClient([
      fail('errore di rete'),
      ok(makePage(firstTwentyIds, `${BASE_URL}/pokemon?offset=20&limit=20`)),
    ]);

    const { result } = renderHook(() => usePokemonList(client));

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    act(() => {
      result.current.retry();
    });

    // Torna in caricamento per lo stesso blocco (offset 0) e l'errore è azzerato.
    await waitFor(() => {
      expect(result.current.error).toBeNull();
    });
    await waitFor(() => {
      expect(result.current.entries).toHaveLength(20);
    });

    // Entrambe le chiamate sono state fatte con lo stesso offset 0.
    const offsets = list.mock.calls.map(
      (args) => (args[0] as ListParams | undefined)?.offset,
    );
    expect(offsets).toEqual([0, 0]);
  });

  it('mostra lo Stato_Vuoto quando il primo blocco non ha voci di Prima_Generazione (Req 2.6)', async () => {
    // Un blocco di soli id fuori 1..151: nessuna voce ammessa.
    const { client } = createListClient([ok(makePage([9990, 9991], null))]);

    const { result } = renderHook(() => usePokemonList(client));

    await waitFor(() => {
      expect(result.current.isInitialLoading).toBe(false);
    });
    expect(result.current.isEmpty).toBe(true);
    expect(result.current.entries).toHaveLength(0);
    expect(result.current.error).toBeNull();
  });
});

// Property test (fast-check) per l'hook `usePokemonList`.
// Una property per test, >= 100 iterazioni, client sempre mockato: nessuna rete
// reale (Requirement 9.5). Le proprietà sono definite in design.md.

/**
 * Costruisce, per un dato numero di Pokémon totali `totalCount`, la sequenza di
 * pagine da 20 che il client restituirebbe partendo dall'id 1. L'ultima pagina
 * ha `next === null`. Serve come backing deterministico per l'infinite scroll.
 */
function buildBacking(totalCount: number): Result<PokemonListPage>[] {
  const pages: Result<PokemonListPage>[] = [];
  const pageCount = Math.ceil(totalCount / 20);
  for (let block = 0; block < pageCount; block += 1) {
    const start = block * 20 + 1;
    const size = Math.min(20, totalCount - block * 20);
    const ids = Array.from({ length: size }, (_unused, i) => start + i);
    const isLast = block === pageCount - 1;
    const next = isLast
      ? null
      : `${BASE_URL}/pokemon?offset=${(block + 1) * 20}&limit=20`;
    pages.push(ok(makePage(ids, next)));
  }
  return pages;
}

describe('usePokemonList (property)', () => {
  // Feature: pokedex-themed-views, Property 3: La progressione degli offset copre il 151 senza salti né ripetizioni
  it('richiede gli offset 0,20,40,... senza salti né ripetizioni e si ferma coperto il 151', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Il catalogo contiene almeno la Prima_Generazione completa (>= 151),
        // così l'infinite scroll copre sempre l'id 151. Il tetto è vicino a 151:
        // oltre l'id 151 l'hook si ferma comunque, quindi cataloghi più grandi
        // non aggiungono copertura ma solo tempo di esecuzione.
        fc.integer({ min: FIRST_GEN_MAX_ID, max: FIRST_GEN_MAX_ID + 40 }),
        async (totalCount) => {
          const { client, list } = createListClient(buildBacking(totalCount));

          const { result } = renderHook(() => usePokemonList(client));

          // Sollecita loadMore finché l'elenco non è completo (con un tetto di
          // sicurezza abbondante per non ciclare all'infinito in caso di bug).
          await waitFor(() => {
            expect(result.current.isInitialLoading).toBe(false);
          });
          // Bastano 8 blocchi (offset 0..140) per coprire l'id 151; il tetto è
          // una guardia di sicurezza contro loop infiniti in caso di regressione.
          for (let step = 0; step < 10 && !result.current.isComplete; step += 1) {
            act(() => {
              result.current.loadMore();
            });
            await waitFor(() => {
              expect(result.current.isLoadingMore).toBe(false);
            });
          }

          expect(result.current.isComplete).toBe(true);

          // Gli offset richiesti formano la progressione 0,20,40,... passo 20.
          const offsets = list.mock.calls.map(
            (args) => (args[0] as ListParams | undefined)?.offset ?? 0,
          );
          const expected = offsets.map((_unused, index) => index * 20);
          expect(offsets).toEqual(expected);

          // L'elenco copre l'id 151 e ulteriori loadMore non generano chiamate.
          expect(
            result.current.entries.some((e) => e.id === FIRST_GEN_MAX_ID),
          ).toBe(true);
          const callsWhenComplete = list.mock.calls.length;
          act(() => {
            result.current.loadMore();
          });
          expect(list.mock.calls.length).toBe(callsWhenComplete);
        },
      ),
      { numRuns: 100 },
    );
  }, 60_000);

  // Feature: pokedex-themed-views, Property 4: L'elenco cresce per concatenazione filtrata senza rimuovere le voci precedenti
  it('dopo un nuovo blocco le entries hanno come prefisso le precedenti e aggiungono il blocco filtrato', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Due blocchi di id arbitrari (anche fuori 1..151, per esercitare il
        // filtro). Nessun blocco contiene il 151, così loadMore resta abilitato.
        fc.array(fc.integer({ min: 1, max: 5000 }), {
          minLength: 1,
          maxLength: 20,
        }),
        fc.array(fc.integer({ min: 1, max: 5000 }), {
          minLength: 1,
          maxLength: 20,
        }),
        async (rawFirst, rawSecond) => {
          // Rimuove il 151 per non attivare isComplete durante la property.
          const firstIds = rawFirst.filter((id) => id !== FIRST_GEN_MAX_ID);
          const secondIds = rawSecond.filter((id) => id !== FIRST_GEN_MAX_ID);
          const firstReferences = firstIds.map(makeReference);
          const secondReferences = secondIds.map(makeReference);

          const { client } = createListClient([
            ok(makePage(firstIds, `${BASE_URL}/pokemon?offset=20&limit=20`)),
            ok(makePage(secondIds, `${BASE_URL}/pokemon?offset=40&limit=20`)),
          ]);

          const { result } = renderHook(() => usePokemonList(client));

          const firstFiltered = toFirstGenEntries(firstReferences);
          await waitFor(() => {
            expect(result.current.isInitialLoading).toBe(false);
          });
          const afterFirst = result.current.entries;
          expect(afterFirst.map((e) => e.id)).toEqual(
            firstFiltered.map((e) => e.id),
          );

          // Se il primo blocco non ha voci di Prima_Generazione l'hook è vuoto e
          // loadMore è inibito: la property (crescita) non si applica.
          if (afterFirst.length === 0) {
            return;
          }

          act(() => {
            result.current.loadMore();
          });
          await waitFor(() => {
            expect(result.current.isLoadingMore).toBe(false);
          });

          const secondFiltered = toFirstGenEntries(secondReferences);
          const afterSecond = result.current.entries;

          // Prefisso invariato: le voci precedenti restano identiche e in ordine.
          expect(afterSecond.slice(0, afterFirst.length)).toEqual(afterFirst);
          // Le nuove voci sono esattamente il secondo blocco filtrato.
          expect(afterSecond.slice(afterFirst.length)).toEqual(secondFiltered);
        },
      ),
      { numRuns: 100 },
    );
  }, 30_000);

  // Feature: pokedex-themed-views, Property 5: La categoria dell'errore è propagata fedelmente e nessuna eccezione sfugge
  it('propaga fedelmente la categoria di qualunque PokeApiError senza sollevare eccezioni', async () => {
    const categories: readonly PokeApiError['category'][] = [
      'risorsa non trovata',
      'risposta HTTP non valida',
      'parametri non validi',
      'errore di rete',
    ];

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...categories),
        async (category) => {
          const { client } = createListClient([fail(category)]);

          const { result } = renderHook(() => usePokemonList(client));

          // Nessuna eccezione sfugge: l'errore diventa stato osservabile con la
          // stessa categoria restituita dal client.
          await waitFor(() => {
            expect(result.current.error).not.toBeNull();
          });
          expect(result.current.error?.category).toBe(category);
          expect(result.current.isInitialLoading).toBe(false);
          expect(result.current.entries).toHaveLength(0);
        },
      ),
      { numRuns: 100 },
    );
  }, 30_000);
});
