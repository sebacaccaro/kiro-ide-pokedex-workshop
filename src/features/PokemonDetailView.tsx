import type { ReactElement } from 'react';

import type { PokeApiClient } from '../api/pokeApiClient';
import { ErrorMessage } from '../components/ErrorMessage';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { PokemonDetail } from '../components/PokemonDetail';
import { usePokemonDetail } from '../hooks/usePokemonDetail';

// Vista_Dettaglio: collega `usePokemonDetail` al componente di presentazione
// `PokemonDetail` e sceglie cosa mostrare in base allo stato osservabile
// dell'hook: Stato_Caricamento, messaggio di inesistenza (not-found),
// Stato_Errore con retry oppure i dati del Pokémon. La logica di branching è la
// responsabilità principale di questa vista; il fetch resta nell'hook e la rete
// nel client (unico confine `api/`).
// _Requirements: 3.7, 4.1, 4.2, 4.3, 4.4, 4.5_

export interface PokemonDetailViewProps {
  readonly client: PokeApiClient;
  readonly id: number;
  readonly onBack: () => void; // Req 3.7
}

/** Messaggio mostrato quando la risorsa non esiste (Req 4.3). */
const NOT_FOUND_MESSAGE = 'Il Pokémon richiesto non esiste.';

export function PokemonDetailView({
  client,
  id,
  onBack,
}: PokemonDetailViewProps): ReactElement {
  const { pokemon, isLoading, error, isNotFound, retry } = usePokemonDetail(
    client,
    id,
  );

  // Stato_Caricamento: richiesta in corso, nessun dato parziale (Req 4.1).
  if (isLoading) {
    return <LoadingIndicator />;
  }

  // Not-found: la risorsa non esiste, senza dati parziali (Req 4.3).
  if (isNotFound) {
    return <p className="not-found">{NOT_FOUND_MESSAGE}</p>;
  }

  // Stato_Errore (categoria diversa da "risorsa non trovata"): categoria e
  // comando di retry (Req 4.4, 4.5).
  if (error !== null) {
    return (
      <ErrorMessage
        category={error.category}
        message={error.message}
        onRetry={retry}
      />
    );
  }

  // Dati: il dettaglio con il comando di ritorno (Req 4.2, 3.7).
  if (pokemon !== null) {
    return <PokemonDetail pokemon={pokemon} onBack={onBack} />;
  }

  // Stato non atteso (nessun dato, nessun errore): non renderizza nulla.
  return <LoadingIndicator />;
}
