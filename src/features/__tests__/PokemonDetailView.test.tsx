import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PokeApiError, Result } from '../../api/errors';
import type { PokeApiClient } from '../../api/pokeApiClient';
import type {
  Pokemon,
  PokemonListPage,
  PokemonSpecies,
} from '../../types/pokemon';
import { CaptureProvider, type CaptureStorage } from '../CaptureProvider';
import { PokemonDetailView } from '../PokemonDetailView';

// Test dei componenti (RTL) per la Vista_Dettaglio (PokemonDetailView).
// Fase RED del TDD (task 13.1): `src/features/PokemonDetailView.tsx` NON esiste
// ancora (implementazione nel task 13.2). Questi test descrivono il
// comportamento atteso della vista che collega `usePokemonDetail` a
// `PokemonDetail` e sceglie cosa mostrare tra Stato_Caricamento, not-found,
// Stato_Errore e i dati. Il client PokéAPI è mockato con vi.fn(): nessuna rete
// reale, test deterministici.
// _Requirements: 3.7, 4.1, 4.2, 4.3, 4.4, 4.5_

// --- Fixture e helper -------------------------------------------------------

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

/** Un Result di successo con il Pokémon dato. */
function ok(value: Pokemon): Result<Pokemon> {
  return { ok: true, value };
}

/** Un Result di errore con l'errore dato. */
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
 * `list` non è usato dalla Vista_Dettaglio ma è richiesto dall'interfaccia.
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
    } as Result<PokemonListPage>),
  );
  const getSpecies = vi.fn<PokeApiClient['getSpecies']>(() =>
    Promise.resolve({ ok: true, value: { id: 0, flavorText: '' } }),
  );
  return { client: { get, list, getSpecies }, get };
}

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * Uno `CaptureStorage` in memoria vuoto: nessun Pokémon catturato. La vista ora
 * dipende dal `CaptureProvider` (usa `useCaptures`), quindi anche i test che non
 * riguardano la Descrizione_Pokedex avvolgono la vista in un provider
 * deterministico che non tocca `window.localStorage` (Req 4.8).
 */
function emptyStorage(): CaptureStorage {
  let value: string | null = '[]';
  return {
    read: () => value,
    write: (next: string) => {
      value = next;
    },
  };
}

describe('PokemonDetailView', () => {
  it('mostra lo Stato_Caricamento mentre get(id) è in corso e i dati al successo (Req 4.1, 4.2)', async () => {
    const { client } = createMockClient(() => Promise.resolve(ok(pikachu)));

    render(
      <CaptureProvider storage={emptyStorage()}>
        <PokemonDetailView client={client} id={25} onBack={vi.fn()} />
      </CaptureProvider>,
    );

    // Req 4.1: mentre la richiesta è in corso, l'indicatore è visibile.
    expect(screen.getByRole('status')).toBeInTheDocument();

    // Req 4.2: al successo l'indicatore sparisce e compaiono i dati (il nome).
    await waitFor(() =>
      expect(screen.queryByRole('status')).not.toBeInTheDocument(),
    );
    expect(screen.getByText(/pikachu/i)).toBeInTheDocument();
  });

  it('mostra un messaggio di inesistenza su "risorsa non trovata", senza dati parziali (Req 4.3)', async () => {
    const { client } = createMockClient(() =>
      Promise.resolve(fail(notFound(9999))),
    );

    render(
      <CaptureProvider storage={emptyStorage()}>
        <PokemonDetailView client={client} id={9999} onBack={vi.fn()} />
      </CaptureProvider>,
    );

    // Il messaggio indica che il Pokémon non esiste.
    await screen.findByText(/non esiste/i);
    // Nessun dato parziale: l'indicatore di caricamento è rimosso.
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('mostra lo Stato_Errore con la categoria e un comando di retry, e ripete la richiesta sullo stesso id (Req 4.4, 4.5)', async () => {
    const { client, get } = createMockClient(() =>
      Promise.resolve(fail(networkError)),
    );

    render(
      <CaptureProvider storage={emptyStorage()}>
        <PokemonDetailView client={client} id={25} onBack={vi.fn()} />
      </CaptureProvider>,
    );

    // Req 4.4: messaggio di errore (role="alert") che riporta la categoria.
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('errore di rete');
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenLastCalledWith(25);

    // Req 4.5: il retry riesegue la richiesta per lo stesso id.
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Riprova' }));

    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    expect(get).toHaveBeenLastCalledWith(25);
  });

  it('invoca onBack quando l\u0027Utente attiva il comando di ritorno (Req 3.7)', async () => {
    const onBack = vi.fn();
    const { client } = createMockClient(() => Promise.resolve(ok(pikachu)));

    render(
      <CaptureProvider storage={emptyStorage()}>
        <PokemonDetailView client={client} id={25} onBack={onBack} />
      </CaptureProvider>,
    );

    // Attende il rendering dei dati (compare il comando "Indietro").
    const back = await screen.findByRole('button', { name: 'Indietro' });
    const user = userEvent.setup();
    await user.click(back);

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Gating della Descrizione_Pokedex sullo Stato_Catturato (task 10.3, fase RED).
//
// La Vista_Dettaglio deve richiedere la Descrizione_Pokedex SOLO quando il
// Pokémon aperto è catturato (via CaptureProvider/useCaptures):
//   - catturato   → una sola richiesta `getSpecies(id)` e la sezione descrizione
//                   (classe stabile `.pokemon-species-text`, resa da
//                   `PokemonSpeciesText`) compare (Req 5.1);
//   - non catturato → nessuna richiesta `getSpecies` e nessuna sezione
//                   descrizione (Req 5.3).
//
// Questi test FALLISCONO finché il wiring `usePokemonSpecies` + `useCaptures`
// non è implementato in `PokemonDetailView` (task 10.4): oggi la vista non
// chiama mai `getSpecies` né rende la sezione descrizione.
// _Requirements: 5.1, 5.3_

/** Una Descrizione_Pokedex di dominio di esempio con testo non vuoto. */
const pikachuSpecies: PokemonSpecies = {
  id: 25,
  flavorText: 'Quando è arrabbiato, questo Pokémon scarica subito energia.',
};

/**
 * Crea un `PokeApiClient` mockato in cui `get` restituisce sempre `pikachu` e
 * `getSpecies` è controllabile e osservabile dal test (conteggio chiamate).
 */
function createMockClientWithSpecies(
  getSpeciesImpl: PokeApiClient['getSpecies'],
): {
  readonly client: PokeApiClient;
  readonly getSpecies: ReturnType<typeof vi.fn>;
} {
  const get = vi.fn<PokeApiClient['get']>(() => Promise.resolve(ok(pikachu)));
  const list = vi.fn<PokeApiClient['list']>(() =>
    Promise.resolve({
      ok: true,
      value: { count: 0, next: null, previous: null, results: [] },
    } as Result<PokemonListPage>),
  );
  const getSpecies = vi.fn(getSpeciesImpl);
  return { client: { get, list, getSpecies }, getSpecies };
}

/**
 * Uno `CaptureStorage` in memoria seminato con gli id catturati indicati: rende
 * i test deterministici senza toccare `window.localStorage` (Req 4.8).
 */
function seededStorage(capturedIds: readonly number[]): CaptureStorage {
  let value: string | null = JSON.stringify([...capturedIds]);
  return {
    read: () => value,
    write: (next: string) => {
      value = next;
    },
  };
}

describe('PokemonDetailView — Descrizione_Pokedex e Stato_Catturato', () => {
  it('quando il Pokémon è catturato richiede la Descrizione_Pokedex una sola volta e mostra la sezione descrizione (Req 5.1)', async () => {
    const { client, getSpecies } = createMockClientWithSpecies(() =>
      Promise.resolve({ ok: true, value: pikachuSpecies }),
    );

    const { container } = render(
      <CaptureProvider storage={seededStorage([25])}>
        <PokemonDetailView client={client} id={25} onBack={vi.fn()} />
      </CaptureProvider>,
    );

    // Attende il rendering dei dati (compare il nome del Pokémon).
    await screen.findByText(/pikachu/i);

    // Req 5.1: una sola richiesta della Descrizione_Pokedex, per lo stesso id.
    await waitFor(() => expect(getSpecies).toHaveBeenCalledTimes(1));
    expect(getSpecies).toHaveBeenLastCalledWith(25);

    // La sezione descrizione (classe stabile) è presente con il testo.
    await waitFor(() =>
      expect(
        container.querySelector('.pokemon-species-text'),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByText(/quando è arrabbiato, questo pokémon/i),
    ).toBeInTheDocument();
  });

  it('quando il Pokémon non è catturato non richiede la Descrizione_Pokedex e non mostra la sezione descrizione (Req 5.3)', async () => {
    const { client, getSpecies } = createMockClientWithSpecies(() =>
      Promise.resolve({ ok: true, value: pikachuSpecies }),
    );

    const { container } = render(
      <CaptureProvider storage={seededStorage([])}>
        <PokemonDetailView client={client} id={25} onBack={vi.fn()} />
      </CaptureProvider>,
    );

    // Attende il rendering dei dati del Pokémon.
    await screen.findByText(/pikachu/i);

    // Req 5.3: nessuna richiesta della Descrizione_Pokedex.
    expect(getSpecies).not.toHaveBeenCalled();

    // Nessuna sezione descrizione nel DOM.
    expect(
      container.querySelector('.pokemon-species-text'),
    ).not.toBeInTheDocument();
  });
});
