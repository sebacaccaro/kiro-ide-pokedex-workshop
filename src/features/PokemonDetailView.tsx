import type { ReactElement } from 'react';

import type { PokeApiClient } from '../api/pokeApiClient';
import { ErrorMessage } from '../components/ErrorMessage';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { PokemonDetail } from '../components/PokemonDetail';
import { PokemonSpeciesText } from '../components/PokemonSpeciesText';
import { useCaptures } from '../hooks/useCaptures';
import { usePokemonDetail } from '../hooks/usePokemonDetail';
import { usePokemonSpecies } from '../hooks/usePokemonSpecies';
import { useTheme } from '../hooks/useTheme';
import { spriteUrlForTheme } from '../lib/sprites';

// Vista_Dettaglio: collega `usePokemonDetail` al componente di presentazione
// `PokemonDetail` e sceglie cosa mostrare in base allo stato osservabile
// dell'hook: Stato_Caricamento, messaggio di inesistenza (not-found),
// Stato_Errore con retry oppure i dati del Pokémon. La logica di branching è la
// responsabilità principale di questa vista; il fetch resta nell'hook e la rete
// nel client (unico confine `api/`).
//
// Quando il Pokémon aperto è catturato (via `useCaptures`), la vista richiede la
// Descrizione_Pokedex con `usePokemonSpecies` (`enabled` solo se catturato) e la
// presenta con `PokemonSpeciesText` accanto ai dettagli, che restano sempre
// visibili. Se non è catturato non effettua alcuna richiesta e non mostra la
// sezione descrizione.
// _Requirements: 3.7, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

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

  // Stato_Catturato del Pokémon aperto: abilita la richiesta della
  // Descrizione_Pokedex solo quando catturato (Req 5.1, 5.3).
  const { isCaptured } = useCaptures();
  const captured = isCaptured(id);

  // Tema attivo: lo sprite del dettaglio proviene dal set del gioco corrispondente.
  const { theme } = useTheme();

  // Fetch della Descrizione_Pokedex con gating su `captured`: nessuna richiesta
  // quando non catturato (Req 5.1, 5.3). Gli hook sono chiamati incondizionatamente
  // per rispettare le regole degli hook; il branching sul rendering avviene dopo.
  const {
    species,
    isLoading: isSpeciesLoading,
    error: speciesError,
  } = usePokemonSpecies(client, id, captured);

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

  // Dati: il dettaglio con il comando di ritorno (Req 4.2, 3.7). Se il Pokémon è
  // catturato, la Descrizione_Pokedex è resa accanto ai dettagli, che restano
  // sempre visibili (Req 5.2, 5.4, 5.5, 5.6). Se non catturato, nessuna sezione
  // descrizione (Req 5.3).
  if (pokemon !== null) {
    // Sprite del gioco corrispondente al tema, derivato dall'id del Pokémon.
    const themedPokemon = {
      ...pokemon,
      spriteUrl: spriteUrlForTheme(pokemon.id, theme),
    };
    return (
      <>
        <PokemonDetail pokemon={themedPokemon} onBack={onBack} />
        {captured && (
          <PokemonSpeciesText
            isLoading={isSpeciesLoading}
            error={speciesError}
            text={species?.flavorText ?? ''}
          />
        )}
      </>
    );
  }

  // Stato non atteso (nessun dato, nessun errore): non renderizza nulla.
  return <LoadingIndicator />;
}
