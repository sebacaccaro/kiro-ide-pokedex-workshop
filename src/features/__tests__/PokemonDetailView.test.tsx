import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PokeApiError, Result } from '../../api/errors';
import type { PokeApiClient } from '../../api/pokeApiClient';
import type { Pokemon, PokemonListPage } from '../../types/pokemon';
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
  return { client: { get, list }, get };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PokemonDetailView', () => {
  it('mostra lo Stato_Caricamento mentre get(id) è in corso e i dati al successo (Req 4.1, 4.2)', async () => {
    const { client } = createMockClient(() => Promise.resolve(ok(pikachu)));

    render(<PokemonDetailView client={client} id={25} onBack={vi.fn()} />);

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

    render(<PokemonDetailView client={client} id={9999} onBack={vi.fn()} />);

    // Il messaggio indica che il Pokémon non esiste.
    await screen.findByText(/non esiste/i);
    // Nessun dato parziale: l'indicatore di caricamento è rimosso.
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('mostra lo Stato_Errore con la categoria e un comando di retry, e ripete la richiesta sullo stesso id (Req 4.4, 4.5)', async () => {
    const { client, get } = createMockClient(() =>
      Promise.resolve(fail(networkError)),
    );

    render(<PokemonDetailView client={client} id={25} onBack={vi.fn()} />);

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

    render(<PokemonDetailView client={client} id={25} onBack={onBack} />);

    // Attende il rendering dei dati (compare il comando "Indietro").
    const back = await screen.findByRole('button', { name: 'Indietro' });
    const user = userEvent.setup();
    await user.click(back);

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
