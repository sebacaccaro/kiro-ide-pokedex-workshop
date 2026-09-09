import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PokeApiError, Result } from '../../api/errors';
import type { PokeApiClient } from '../../api/pokeApiClient';
import type { Pokemon, PokemonListPage } from '../../types/pokemon';
import { PokemonListView } from '../PokemonListView';

// Test dei componenti (RTL) per la Vista_Elenco (PokemonListView).
// Fase RED del TDD (task 13.1): `src/features/PokemonListView.tsx` NON esiste
// ancora (implementazione nel task 13.2). Questi test descrivono il
// comportamento atteso della vista che collega `usePokemonList` a `PokemonList`
// e sceglie cosa mostrare tra Stato_Caricamento, Stato_Errore, Stato_Vuoto e i
// dati. Il client PokéAPI è mockato con vi.fn(): nessuna rete reale, test
// deterministici.
// _Requirements: 1.6, 2.1, 2.3, 2.4, 2.6_

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
  return { client: { get, list }, list };
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

    render(<PokemonListView client={client} onSelect={vi.fn()} />);

    // Nessuna voce ancora mostrata -> LoadingIndicator (role="status").
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('mostra lo Stato_Errore con la categoria e un comando di retry, e ripete la richiesta (Req 2.3, 2.4)', async () => {
    const { client, list } = createMockClient(() =>
      Promise.resolve(failPage(networkError)),
    );

    render(<PokemonListView client={client} onSelect={vi.fn()} />);

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

    render(<PokemonListView client={client} onSelect={vi.fn()} />);

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

    render(<PokemonListView client={client} onSelect={onSelect} />);

    // Attende che le voci siano rese, poi seleziona una riga.
    const charmander = await screen.findByText(/charmander/i);
    const user = userEvent.setup();
    await user.click(charmander);

    expect(onSelect).toHaveBeenCalledWith(4);
  });
});
