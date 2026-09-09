import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Result } from '../api/errors';
import type { PokeApiClient } from '../api/pokeApiClient';
import type { Pokemon, PokemonListPage } from '../types/pokemon';
import App from '../App';

// Test dei componenti (RTL) per il wiring dell'Applicazione (App).
// Fase RED del TDD (task 15.1): `src/App.tsx` NON contiene ancora il wiring
// (navigazione state-based, ThemeProvider a monte, iniezione del client): oggi
// rende solo "Hello World". Questi test descrivono il comportamento atteso e
// devono FALLIRE finché il wiring non viene implementato (task 15.2).
//
// Il client PokéAPI è iniettato come prop e mockato con vi.fn(): nessuna rete
// reale, test deterministici (Req 9.5).
// _Requirements: 1.6, 3.7, 5.5_

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

/** Un blocco con due Pokémon di Prima_Generazione, senza pagina successiva. */
const firstGenPage: Result<PokemonListPage> = {
  ok: true,
  value: {
    count: 2,
    next: null,
    previous: null,
    results: [
      { name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon/1/' },
      { name: 'charmander', url: 'https://pokeapi.co/api/v2/pokemon/4/' },
    ],
  },
};

/** Il dettaglio di Charmander (id 4), coerente col riferimento della lista. */
const charmander: Pokemon = {
  id: 4,
  name: 'charmander',
  height: 6,
  weight: 85,
  baseExperience: 62,
  abilities: [{ name: 'blaze', isHidden: false, slot: 1 }],
  types: [{ slot: 1, name: 'fire' }],
  spriteUrl: 'https://example.test/charmander.png',
};

/**
 * Crea un `PokeApiClient` mockato con `list` e `get` controllabili dal test.
 * Di default `list` restituisce il blocco di Prima_Generazione e `get`
 * restituisce Charmander.
 */
function createMockClient(
  overrides?: Partial<{
    list: PokeApiClient['list'];
    get: PokeApiClient['get'];
  }>,
): {
  readonly client: PokeApiClient;
  readonly list: ReturnType<typeof vi.fn>;
  readonly get: ReturnType<typeof vi.fn>;
} {
  const list = vi.fn<PokeApiClient['list']>(
    overrides?.list ?? (() => Promise.resolve(firstGenPage)),
  );
  const get = vi.fn<PokeApiClient['get']>(
    overrides?.get ?? (() => Promise.resolve({ ok: true, value: charmander })),
  );
  return { client: { get, list }, list, get };
}

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  document.documentElement.removeAttribute('data-theme');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.documentElement.removeAttribute('data-theme');
});

describe('App — wiring dell\u0027applicazione', () => {
  it('naviga dalla Vista_Elenco alla Vista_Dettaglio alla selezione di un Pokémon (Req 1.6)', async () => {
    const { client, get } = createMockClient();

    render(<App client={client} />);

    // La Vista_Elenco carica e mostra le voci di Prima_Generazione.
    const charmanderRow = await screen.findByText(/charmander/i);

    const user = userEvent.setup();
    await user.click(charmanderRow);

    // Alla selezione l'App passa alla Vista_Dettaglio del Pokémon scelto:
    // il dettaglio richiede `get(id)` con l'id selezionato e mostra i dati.
    await waitFor(() => expect(get).toHaveBeenCalledWith(4));

    // Compaiono elementi propri della Vista_Dettaglio (comando di ritorno e
    // i dati scalari), assenti nella Vista_Elenco.
    expect(
      await screen.findByRole('button', { name: 'Indietro' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/esperienza base/i)).toBeInTheDocument();
  });

  it('torna dalla Vista_Dettaglio alla Vista_Elenco al comando di ritorno (Req 3.7)', async () => {
    const { client } = createMockClient();

    render(<App client={client} />);

    // Entra nel dettaglio selezionando una voce.
    const user = userEvent.setup();
    await user.click(await screen.findByText(/charmander/i));

    const back = await screen.findByRole('button', { name: 'Indietro' });

    // Il comando di ritorno riporta alla Vista_Elenco.
    await user.click(back);

    // Torna la Vista_Elenco (le voci sono di nuovo mostrate) e il dettaglio
    // (comando "Indietro") non è più presente.
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Indietro' }),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByText(/bulbasaur/i)).toBeInTheDocument();
  });

  it('avvolge entrambe le viste con il ThemeProvider: applica il tema alla radice e mostra il Selettore_Tema (Req 5.5)', async () => {
    const { client } = createMockClient();

    render(<App client={client} />);

    // Il ThemeProvider applica `data-theme` sulla radice: il Tema_Rosso è il
    // predefinito, così il tema vale per la Vista_Elenco.
    await waitFor(() =>
      expect(document.documentElement.getAttribute('data-theme')).toBe('rosso'),
    );

    // Il Selettore_Tema è presente (unico, a monte delle viste) con due opzioni.
    const selector = screen.getByRole('radiogroup', {
      name: /tema/i,
    });
    expect(selector).toBeInTheDocument();

    // Navigando al dettaglio il tema resta applicato alla radice: lo stesso
    // provider avvolge anche la Vista_Dettaglio (Req 5.5).
    const user = userEvent.setup();
    await user.click(await screen.findByText(/charmander/i));
    await screen.findByRole('button', { name: 'Indietro' });

    expect(document.documentElement.getAttribute('data-theme')).toBe('rosso');
  });
});
