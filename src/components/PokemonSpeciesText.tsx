import type { ReactElement } from 'react';

import type { PokeApiError } from '../api/errors';
import { ErrorMessage } from './ErrorMessage';
import { LoadingIndicator } from './LoadingIndicator';

// Componente di presentazione per la Descrizione_Pokedex. E "stupido": riceve
// isLoading, error e text via props e non contiene logica di fetch. Rende uno
// dei quattro branch (caricamento, errore, testo, testo vuoto) senza impedire
// la visualizzazione degli altri dettagli del Pokemon, che sono renderizzati
// dal componente ospitante.
// _Requirements: 5.2, 5.4, 5.5, 5.6_

export interface PokemonSpeciesTextProps {
  readonly isLoading: boolean;
  readonly error: PokeApiError | null;
  readonly text: string;
}

/** Testo mostrato quando la Descrizione_Pokedex non e disponibile (Req 5.6). */
const UNAVAILABLE_LABEL = 'Descrizione non disponibile';

export function PokemonSpeciesText({
  isLoading,
  error,
  text,
}: PokemonSpeciesTextProps): ReactElement {
  if (isLoading) {
    // Stato_Caricamento: mostra un indicatore accessibile (Req 5.4).
    return (
      <div className="pokemon-species-text">
        <LoadingIndicator label="Caricamento della descrizione" />
      </div>
    );
  }

  if (error !== null) {
    // Stato_Errore: mostra la categoria, nessun indicatore di caricamento (Req 5.5).
    return (
      <div className="pokemon-species-text">
        <ErrorMessage category={error.category} message={error.message} />
      </div>
    );
  }

  if (text.length === 0) {
    // Testo vuoto: indicazione di descrizione non disponibile (Req 5.6).
    return (
      <div className="pokemon-species-text">
        <p className="pokemon-species-text__unavailable">{UNAVAILABLE_LABEL}</p>
      </div>
    );
  }

  // Testo disponibile e non vuoto (Req 5.2).
  return (
    <div className="pokemon-species-text">
      <p className="pokemon-species-text__body">{text}</p>
    </div>
  );
}
