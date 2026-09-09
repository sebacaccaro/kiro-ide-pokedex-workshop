import type { ReactElement } from 'react';

import type { PokeApiClient } from '../api/pokeApiClient';
import { ErrorMessage } from '../components/ErrorMessage';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { PokemonList } from '../components/PokemonList';
import { usePokemonList } from '../hooks/usePokemonList';

// Vista_Elenco: collega `usePokemonList` al componente di presentazione
// `PokemonList` e sceglie cosa mostrare in base allo stato osservabile
// dell'hook: Stato_Caricamento iniziale, Stato_Errore con retry, Stato_Vuoto
// oppure l'elenco dei dati. La logica di branching (quale stato rendere) è la
// responsabilità principale di questa vista; il fetch resta nell'hook e la rete
// nel client (unico confine `api/`).
// _Requirements: 1.6, 2.1, 2.3, 2.6, 4.4, 4.5_

export interface PokemonListViewProps {
  readonly client: PokeApiClient;
  readonly onSelect: (id: number) => void; // Req 1.6
}

/** Messaggio dello Stato_Vuoto: nessuna voce di Prima_Generazione (Req 2.6). */
const EMPTY_MESSAGE = 'Nessun Pokémon trovato';

export function PokemonListView({
  client,
  onSelect,
}: PokemonListViewProps): ReactElement {
  const {
    entries,
    isInitialLoading,
    isLoadingMore,
    error,
    isEmpty,
    loadMore,
    retry,
  } = usePokemonList(client);

  // Stato_Caricamento iniziale: primo blocco in corso, nessuna voce (Req 2.1).
  if (isInitialLoading) {
    return <LoadingIndicator />;
  }

  // Stato_Errore: mostra categoria e comando di retry (Req 2.3, 2.4).
  if (error !== null) {
    return (
      <ErrorMessage
        category={error.category}
        message={error.message}
        onRetry={retry}
      />
    );
  }

  // Stato_Vuoto: nessuna voce di Prima_Generazione nel primo blocco (Req 2.6).
  if (isEmpty) {
    return <p className="empty-state">{EMPTY_MESSAGE}</p>;
  }

  // Dati: elenco continuo con selezione e infinite scroll (Req 1.6, 2.2).
  return (
    <PokemonList
      entries={entries}
      isLoadingMore={isLoadingMore}
      onSelect={onSelect}
      onReachEnd={loadMore}
    />
  );
}
