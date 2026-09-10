import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PokeApiError, Result } from '../../api/errors';
import type { PokeApiClient } from '../../api/pokeApiClient';
import type { PokemonSpecies } from '../../types/pokemon';
import { usePokemonSpecies } from '../usePokemonSpecies';

// Unit test (esempi) per l'hook `usePokemonSpecies`.
// Fase RED del TDD: questi test descrivono il comportamento atteso dell'hook
// che NON esiste ancora (implementato nel task 6.2). Il client PokéAPI è
// mockato con vi.fn(): nessuna rete reale, test deterministici.
// _Requirements: 5.1, 5.3, 5.4, 5.5_

// --- Helper: fixture di dominio e mock del client ---------------------------

/** Un `PokemonSpecies` di dominio conforme, sufficiente per gli assert. */
const bulbasaurSpecies: PokemonSpecies = {
  id: 1,
  flavorText: 'Un seme è stato piantato sulla sua schiena alla nascita.',
};

/** Costruisce un `Result` di successo con la species data. */
function ok(value: PokemonSpecies): Result<PokemonSpecies> {
  return { ok: true, value };
}

/** Costruisce un `Result` di errore con l'errore dato. */
function fail(error: PokeApiError): Result<PokemonSpecies> {
  return { ok: false, error };
}

/** Errore di rete (categoria diversa da "risorsa non trovata"). */
const networkError: PokeApiError = {
  category: 'errore di rete',
  message: 'Errore di rete o timeout durante la richiesta alle PokéAPI.',
};

/**
 * Crea un `PokeApiClient` mockato in cui `getSpecies` è controllabile dal test.
 * `get` e `list` non sono usati dall'hook species ma sono richiesti
 * dall'interfaccia del client.
 */
function createMockClient(getSpeciesImpl: PokeApiClient['getSpecies']): {
  readonly client: PokeApiClient;
  readonly getSpecies: ReturnType<typeof vi.fn>;
} {
  const getSpecies = vi.fn(getSpeciesImpl);
  const get = vi.fn<PokeApiClient['get']>(() =>
    Promise.resolve({
      ok: false,
      error: networkError,
    }),
  );
  const list = vi.fn<PokeApiClient['list']>(() =>
    Promise.resolve({
      ok: true,
      value: { count: 0, next: null, previous: null, results: [] },
    }),
  );
  return { client: { get, list, getSpecies }, getSpecies };
}

/** Promise controllabile dall'esterno per pilotare i tempi della richiesta. */
function createDeferred<T>(): {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
} {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('usePokemonSpecies', () => {
  it('richiede la species con getSpecies(id) usando l\'identificatore fornito (Req 5.1)', async () => {
    const { client, getSpecies } = createMockClient(() =>
      Promise.resolve(ok(bulbasaurSpecies)),
    );

    renderHook(() => usePokemonSpecies(client, 1, true));

    await waitFor(() => expect(getSpecies).toHaveBeenCalled());
    expect(getSpecies).toHaveBeenCalledWith(1);
  });

  it('effettua un solo fetch per un dato id anche con re-render (Req 5.1)', async () => {
    const { client, getSpecies } = createMockClient(() =>
      Promise.resolve(ok(bulbasaurSpecies)),
    );

    const { rerender, result } = renderHook(
      ({ id }) => usePokemonSpecies(client, id, true),
      { initialProps: { id: 1 } },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Re-render con lo stesso id: nessuna nuova richiesta.
    rerender({ id: 1 });
    rerender({ id: 1 });

    expect(getSpecies).toHaveBeenCalledTimes(1);
  });

  it('con enabled=false non effettua alcuna richiesta e non espone caricamento (Req 5.3)', async () => {
    const { client, getSpecies } = createMockClient(() =>
      Promise.resolve(ok(bulbasaurSpecies)),
    );

    const { result } = renderHook(() => usePokemonSpecies(client, 1, false));

    // Nessuna richiesta al Client_PokeAPI.
    expect(getSpecies).not.toHaveBeenCalled();
    // Non è in caricamento e non ci sono dati né errore.
    expect(result.current.isLoading).toBe(false);
    expect(result.current.species).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('parte in caricamento e mostra i dati al successo (Req 5.4)', async () => {
    const deferred = createDeferred<Result<PokemonSpecies>>();
    const { client } = createMockClient(() => deferred.promise);

    const { result } = renderHook(() => usePokemonSpecies(client, 1, true));

    // Mentre la richiesta è in corso, isLoading è true e non ci sono dati.
    expect(result.current.isLoading).toBe(true);
    expect(result.current.species).toBeNull();
    expect(result.current.error).toBeNull();

    // Al completamento con esito positivo, isLoading torna false e i dati compaiono.
    deferred.resolve(ok(bulbasaurSpecies));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.species).toEqual(bulbasaurSpecies);
    expect(result.current.error).toBeNull();
  });

  it('espone l\'errore con la sua category e rimuove il caricamento (Req 5.5)', async () => {
    const { client } = createMockClient(() =>
      Promise.resolve(fail(networkError)),
    );

    const { result } = renderHook(() => usePokemonSpecies(client, 1, true));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error?.category).toBe('errore di rete');
    expect(result.current.species).toBeNull();
  });

  it('scarta i risultati obsoleti al cambio di id: vince solo la richiesta corrente', async () => {
    const first = createDeferred<Result<PokemonSpecies>>();
    const second = createDeferred<Result<PokemonSpecies>>();
    const responses = [first.promise, second.promise];
    const { client } = createMockClient(() => responses.shift()!);

    const secondSpecies: PokemonSpecies = { id: 2, flavorText: 'Ivysaur.' };

    const { rerender, result } = renderHook(
      ({ id }) => usePokemonSpecies(client, id, true),
      { initialProps: { id: 1 } },
    );

    // Cambio id prima che la prima richiesta si completi.
    rerender({ id: 2 });

    // La seconda richiesta (id=2) risponde per prima.
    second.resolve(ok(secondSpecies));
    await waitFor(() => expect(result.current.species).toEqual(secondSpecies));

    // La prima richiesta (id=1, ormai obsoleta) risponde dopo: va ignorata.
    first.resolve(ok(bulbasaurSpecies));

    // Lo stato resta quello della richiesta corrente (id=2).
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.species).toEqual(secondSpecies);
  });

  it('non aggiorna lo stato dopo l\'unmount (scarto del risultato obsoleto)', async () => {
    const deferred = createDeferred<Result<PokemonSpecies>>();
    const { client } = createMockClient(() => deferred.promise);

    const { result, unmount } = renderHook(() =>
      usePokemonSpecies(client, 1, true),
    );

    // Smonta prima che la richiesta si completi.
    unmount();

    // La risposta arriva dopo lo smontaggio: non deve provocare aggiornamenti.
    deferred.resolve(ok(bulbasaurSpecies));

    // Nessun errore/aggiornamento su componente smontato; lo snapshot resta al
    // valore precedente all'unmount (caricamento in corso, nessun dato).
    expect(result.current.species).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
