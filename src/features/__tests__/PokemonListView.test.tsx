import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { JSX, ReactElement, ReactNode } from 'react';

import type { PokeApiError, Result } from '../../api/errors';
import type { PokeApiClient } from '../../api/pokeApiClient';
import type { Pokemon, PokemonListPage } from '../../types/pokemon';
import { CaptureProvider, type CaptureStorage } from '../CaptureProvider';
import { PokemonListView } from '../PokemonListView';

// Test dei componenti (RTL) per la Vista_Elenco (PokemonListView).
// La vista collega `usePokemonList` a `PokemonList` e sceglie cosa mostrare tra
// Stato_Caricamento, Stato_Errore, Stato_Vuoto e i dati. Cabla inoltre
// `useCaptures` per passare a ogni voce lo Stato_Catturato e i comandi di
// cattura/annullamento (Toggle_Cattura). Il client PokéAPI è mockato con
// vi.fn() (nessuna rete reale) e il Gestore_Catture usa uno Store_Catture
// in-memory iniettato, così i test sono deterministici.
// _Requirements: 1.1, 1.6, 2.1, 2.3, 2.4, 2.6, 3.2_

// --- Fixture e helper -------------------------------------------------------

/**
 * jsdom non implementa IntersectionObserver: la sentinella dell'infinite scroll
 * in `PokemonList` ne ha bisogno per montare. Forniamo uno stub minimale.
 */
class MockIntersectionObserver {
  observe = vi.fn();

  unobserve = vi.fn();

  disconnect = vi.fn();

  takeRecords = vi.fn(() => []);
}

/** Un Blocco_Elenco di successo con i riferimenti dati. */
function okPage(
  results: PokemonListPage['results'],
  next: string | null = null,
): Result<PokemonListPage> {
  return {
    ok: true,
    value: { count: results.length, next, previous: null, results },
  };
}

/** Un Result di errore per un Blocco_Elenco. */
function failPage(error: PokeApiError): Result<PokemonListPage> {
  return { ok: false, error };
}

/** Errore di rete (categoria diversa da "risorsa non trovata"). */
const networkError: PokeApiError = {
  category: 'errore di rete',
  message: 'Errore di rete o timeout durante la richiesta alle PokéAPI.',
};

/** Un blocco con tre Pokémon di Prima_Generazione. */
const firstGenPage = okPage([
  { name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon/1/' },
  { name: 'charmander', url: 'https://pokeapi.co/api/v2/pokemon/4/' },
  { name: 'squirtle', url: 'https://pokeapi.co/api/v2/pokemon/7/' },
]);

/** Un blocco privo di riferimenti di Prima_Generazione (id fuori 1..151). */
const outOfRangePage = okPage([
  { name: 'chesnaught', url: 'https://pokeapi.co/api/v2/pokemon/652/' },
  { name: 'greninja', url: 'https://pokeapi.co/api/v2/pokemon/658/' },
]);

/**
 * Crea un `PokeApiClient` mockato in cui `list` è controllabile dal test.
 * `get` non è usato dalla Vista_Elenco ma è richiesto dall'interfaccia.
 */
function createMockClient(listImpl: PokeApiClient['list']): {
  readonly client: PokeApiClient;
  readonly list: ReturnType<typeof vi.fn>;
} {
  const list = vi.fn(listImpl);
  const get = vi.fn<PokeApiClient['get']>(() =>
    Promise.resolve({
      ok: false,
      error: networkError,
    } as Result<Pokemon>),
  );
  const getSpecies = vi.fn<PokeApiClient['getSpecies']>(() =>
    Promise.resolve({ ok: true, value: { id: 0, flavorText: '' } }),
  );
  return { client: { get, list, getSpecies }, list };
}

/**
 * Store_Catture in-memory iniettato nel CaptureProvider: nessuna dipendenza da
 * localStorage reale, letture/scritture deterministiche (Req 4.8).
 */
function createMemoryStorage(initial: string | null = null): CaptureStorage & {
  readonly writes: readonly string[];
} {
  let value: string | null = initial;
  const writes: string[] = [];
  return {
    read(): string | null {
      return value;
    },
    write(next: string): void {
      value = next;
      writes.push(next);
    },
    get writes(): readonly string[] {
      return writes;
    },
  };
}

/**
 * Rende la Vista_Elenco avvolta dal CaptureProvider con lo Store_Catture
 * iniettato: la vista richiede `useCaptures`, quindi deve vivere dentro un
 * provider.
 */
function renderListView(
  ui: ReactElement,
  storage: CaptureStorage = createMemoryStorage(null),
): ReturnType<typeof render> {
  function Wrapper({ children }: { readonly children: ReactNode }): JSX.Element {
    return <CaptureProvider storage={storage}>{children}</CaptureProvider>;
  }
  return render(ui, { wrapper: Wrapper });
}

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('PokemonListView', () => {
  it('mostra un indicatore di Stato_Caricamento mentre il primo blocco carica (Req 2.1)', () => {
    // Promise che non si risolve: la vista resta in caricamento iniziale.
    const { client } = createMockClient(
      () => new Promise<Result<PokemonListPage>>(() => {}),
    );

    renderListView(<PokemonListView client={client} onSelect={vi.fn()} />);

    // Nessuna voce ancora mostrata -> LoadingIndicator (role="status").
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('mostra lo Stato_Errore con la categoria e un comando di retry, e ripete la richiesta (Req 2.3, 2.4)', async () => {
    const { client, list } = createMockClient(() =>
      Promise.resolve(failPage(networkError)),
    );

    renderListView(<PokemonListView client={client} onSelect={vi.fn()} />);

    // Req 2.3: messaggio di errore (role="alert") che riporta la categoria.
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('errore di rete');
    expect(list).toHaveBeenCalledTimes(1);

    // Req 2.4: il comando di retry è disponibile e riesegue la richiesta.
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Riprova' }));

    await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
  });

  it('mostra un messaggio di Stato_Vuoto quando il primo blocco non ha voci di Prima_Generazione (Req 2.6)', async () => {
    const { client } = createMockClient(() =>
      Promise.resolve(outOfRangePage),
    );

    renderListView(<PokemonListView client={client} onSelect={vi.fn()} />);

    // Nessun errore né voci: deve comparire un messaggio di stato vuoto.
    await waitFor(() =>
      expect(screen.queryByRole('status')).not.toBeInTheDocument(),
    );
    expect(screen.getByText(/nessun/i)).toBeInTheDocument();
    expect(screen.queryByText(/bulbasaur/i)).not.toBeInTheDocument();
  });

  it('invoca onSelect con l\u0027id del Pokémon selezionato (Req 1.6)', async () => {
    const onSelect = vi.fn();
    const { client } = createMockClient(() => Promise.resolve(firstGenPage));

    renderListView(<PokemonListView client={client} onSelect={onSelect} />);

    // Attende che le voci siano rese, poi seleziona una riga.
    const charmander = await screen.findByText(/charmander/i);
    const user = userEvent.setup();
    await user.click(charmander);

    expect(onSelect).toHaveBeenCalledWith(4);
  });

  it('rende un Toggle_Cattura per ogni voce con lo Stato_Catturato iniziale dal Gestore_Catture (Req 1.1, 3.2)', async () => {
    const { client } = createMockClient(() => Promise.resolve(firstGenPage));
    // Charmander (id 4) è già catturato nello Store iniettato.
    const storage = createMemoryStorage('[4]');

    renderListView(
      <PokemonListView client={client} onSelect={vi.fn()} />,
      storage,
    );

    await screen.findByText(/charmander/i);

    // Un Toggle_Cattura per voce, con nome accessibile per lo stato.
    expect(
      screen.getByRole('button', { name: /Cattura bulbasaur/i }),
    ).toHaveAttribute('data-captured', 'false');
    expect(
      screen.getByRole('button', {
        name: /Annulla la cattura di charmander/i,
      }),
    ).toHaveAttribute('data-captured', 'true');
  });

  it('cattura un Pokémon dall\u0027Elenco aggiornando lo stato e persistendo (Req 1.1, 1.6, 2.3)', async () => {
    const { client } = createMockClient(() => Promise.resolve(firstGenPage));
    const onSelect = vi.fn();
    const storage = createMemoryStorage(null);

    renderListView(
      <PokemonListView client={client} onSelect={onSelect} />,
      storage,
    );

    await screen.findByText(/bulbasaur/i);

    const user = userEvent.setup();
    const toggle = screen.getByRole('button', { name: /Cattura bulbasaur/i });
    expect(toggle).toHaveAttribute('data-captured', 'false');

    await user.click(toggle);

    // Al termine dell'Animazione_Cattura, la voce risulta catturata (opacità 1,0
    // pilotata da data-captured) e lo Stato_Catturato è persistito (Req 2.3).
    await waitFor(() =>
      expect(
        screen.getByRole('button', {
          name: /Annulla la cattura di bulbasaur/i,
        }),
      ).toHaveAttribute('data-captured', 'true'),
    );
    await waitFor(() => expect(storage.writes.length).toBeGreaterThan(0));
    const lastWrite = storage.writes[storage.writes.length - 1];
    expect(JSON.parse(lastWrite)).toEqual([1]);

    // Catturare non deve aver aperto il dettaglio (nessuna selezione).
    expect(onSelect).not.toHaveBeenCalled();
  });
});
