import type { ReactElement } from 'react';

import type { PokeApiClient } from '../api/pokeApiClient';
import { ErrorMessage } from '../components/ErrorMessage';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { PokemonList } from '../components/PokemonList';
import { useCaptures } from '../hooks/useCaptures';
import { usePokemonList } from '../hooks/usePokemonList';
import { useTheme } from '../hooks/useTheme';

// Vista_Elenco: collega `usePokemonList` al componente di presentazione
// `PokemonList` e sceglie cosa mostrare in base allo stato osservabile
// dell'hook: Stato_Caricamento iniziale, Stato_Errore con retry, Stato_Vuoto
// oppure l'elenco dei dati. La logica di branching (quale stato rendere) è la
// responsabilità principale di questa vista; il fetch resta nell'hook e la rete
// nel client (unico confine `api/`).
//
// La vista cabla inoltre il Gestore_Catture (`useCaptures`): passa a ogni voce
// lo Stato_Catturato (`isCaptured`) e i comandi `capture`/`uncapture`, così ogni
// Voce_Elenco rende il Toggle_Cattura con l'opacità coerente allo stato
// (Req 1.1, 2.3, 3.2). Deve quindi vivere dentro un `CaptureProvider`.
// _Requirements: 1.1, 1.6, 2.1, 2.3, 2.6, 3.2, 4.4, 4.5_

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

  // Gestore_Catture: Stato_Catturato e comandi per il Toggle_Cattura di ogni
  // voce (Req 1.1, 2.3, 3.2).
  const { isCaptured, capture, uncapture } = useCaptures();

  // Tema attivo: determina il set di sprite del gioco mostrato in ogni voce.
  const { theme } = useTheme();

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

  // Dati: elenco continuo con selezione, infinite scroll e Toggle_Cattura per
  // voce (Req 1.1, 1.6, 2.2, 2.3, 3.2).
  return (
    <PokemonList
      entries={entries}
      isLoadingMore={isLoadingMore}
      onSelect={onSelect}
      onReachEnd={loadMore}
      theme={theme}
      isCaptured={isCaptured}
      onCapture={capture}
      onUncapture={uncapture}
    />
  );
}
