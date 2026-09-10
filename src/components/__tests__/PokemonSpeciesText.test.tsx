import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { PokeApiError } from '../../api/errors';
import { PokemonSpeciesText } from '../PokemonSpeciesText';

// Unit test (esempi) per il componente di presentazione della Descrizione_Pokedex.
// Il componente e "stupido": riceve isLoading, error (PokeApiError | null) e
// text via props e non contiene logica di fetch. Verifichiamo i quattro branch
// di rendering (caricamento, testo, testo vuoto, errore) e che, in stato di
// errore, non venga mostrato l'indicatore di caricamento. I restanti dettagli
// del Pokemon sono renderizzati dal componente ospitante (PokemonDetail) e
// restano quindi sempre visibili: qui verifichiamo che questo componente non
// impedisca la loro visualizzazione (non lancia, non e esclusivo).
// _Requirements: 5.2, 5.4, 5.5, 5.6_

/** Costruisce un PokeApiError di dominio con override opzionali. */
function makeError(overrides: Partial<PokeApiError> = {}): PokeApiError {
  return {
    category: 'errore di rete',
    message: 'Impossibile contattare il server',
    ...overrides,
  };
}

describe('PokemonSpeciesText', () => {
  it('mostra un indicatore di caricamento mentre la Descrizione_Pokedex e in corso (Req 5.4)', () => {
    render(<PokemonSpeciesText isLoading error={null} text="" />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('mostra il testo della Descrizione_Pokedex quando disponibile e non vuoto (Req 5.2)', () => {
    render(
      <PokemonSpeciesText
        isLoading={false}
        error={null}
        text="Bulbasaur puo essere visto mentre fa un pisolino alla luce del sole."
      />,
    );

    expect(
      screen.getByText(/bulbasaur puo essere visto mentre fa un pisolino/i),
    ).toBeInTheDocument();
    // In stato di successo non c'e alcun indicatore di caricamento.
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('mostra un\u0027indicazione di descrizione non disponibile quando il testo e vuoto (Req 5.6)', () => {
    render(<PokemonSpeciesText isLoading={false} error={null} text="" />);

    expect(screen.getByText(/descrizione non disponibile/i)).toBeInTheDocument();
    // Nessun indicatore di caricamento in stato di successo con testo vuoto.
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('mostra la categoria dell\u0027errore senza indicatore di caricamento (Req 5.5)', () => {
    render(
      <PokemonSpeciesText
        isLoading={false}
        error={makeError({ category: 'errore di rete' })}
        text=""
      />,
    );

    // La categoria dell'errore e visibile.
    expect(screen.getByText(/errore di rete/i)).toBeInTheDocument();
    // L'indicatore di caricamento e stato rimosso (Req 5.5).
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('mostra la categoria dell\u0027errore per una risposta HTTP non valida (Req 5.5)', () => {
    render(
      <PokemonSpeciesText
        isLoading={false}
        error={makeError({
          category: 'risposta HTTP non valida',
          message: 'Risposta non valida',
        })}
        text=""
      />,
    );

    expect(screen.getByText(/risposta HTTP non valida/i)).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
