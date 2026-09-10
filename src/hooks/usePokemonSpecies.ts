// src/hooks/usePokemonSpecies.ts
//
// Hook con stato per la Descrizione_Pokedex (species) di un Pokémon: richiede la
// risorsa con `client.getSpecies(id)` SOLO quando `enabled` è vero (tipicamente
// quando il Pokémon è catturato). Espone lo stato osservabile della richiesta
// (caricamento, dati, errore).
//
// La chiamata di rete passa esclusivamente dal client PokéAPI (unico confine di
// rete). Al cambio di `id`/`enabled` o allo smontaggio, i risultati di richieste
// ormai obsolete vengono scartati per non aggiornare uno stato non più pertinente.
//
// _Requirements: 5.1, 5.3, 5.4, 5.5_

import { useEffect, useRef, useState } from 'react';

import type { PokeApiError } from '../api/errors';
import type { PokeApiClient } from '../api/pokeApiClient';
import type { PokemonSpecies } from '../types/pokemon';

export interface UsePokemonSpeciesResult {
  readonly species: PokemonSpecies | null;
  readonly isLoading: boolean; // Req 5.4
  readonly error: PokeApiError | null; // Req 5.5
}

/** Stato interno della richiesta di species. */
interface SpeciesState {
  readonly species: PokemonSpecies | null;
  readonly error: PokeApiError | null;
  readonly isLoading: boolean;
}

/**
 * Stato quando la richiesta è attiva (`enabled` vero): caricamento in corso,
 * nessun dato e nessun errore (Req 5.4).
 */
const LOADING_STATE: SpeciesState = {
  species: null,
  error: null,
  isLoading: true,
};

/**
 * Stato quando la richiesta è disabilitata (`enabled` falso): nessuna richiesta,
 * nessun caricamento, nessun dato, nessun errore (Req 5.3).
 */
const IDLE_STATE: SpeciesState = {
  species: null,
  error: null,
  isLoading: false,
};

/**
 * Richiede la Descrizione_Pokedex SOLO quando `enabled` è vero (Pokémon
 * catturato): un unico fetch per id (Req 5.1, 5.3). Se `enabled` è falso non
 * effettua alcuna richiesta e non espone caricamento (Req 5.3).
 */
export function usePokemonSpecies(
  client: PokeApiClient,
  id: number,
  enabled: boolean,
): UsePokemonSpeciesResult {
  const [state, setState] = useState<SpeciesState>(
    enabled ? LOADING_STATE : IDLE_STATE,
  );

  // Riporta lo stato in caricamento/idle in fase di render quando cambia l'`id`
  // o `enabled`, così il primo render dopo il cambio è già coerente senza dati
  // parziali della richiesta precedente (Req 5.3, 5.4). È il pattern React di
  // "adjusting state during render".
  const [tracked, setTracked] = useState<{ id: number; enabled: boolean }>({
    id,
    enabled,
  });
  if (tracked.id !== id || tracked.enabled !== enabled) {
    setTracked({ id, enabled });
    setState(enabled ? LOADING_STATE : IDLE_STATE);
  }

  // Contatore monotòno delle richieste: solo la più recente può aggiornare lo
  // stato. Le richieste avviate da un `id`/`enabled` precedente (o prima dello
  // smontaggio) diventano obsolete e i loro risultati vengono ignorati.
  const requestId = useRef<number>(0);

  useEffect(() => {
    // Con `enabled` falso non si effettua alcuna richiesta (Req 5.3).
    if (!enabled) {
      return undefined;
    }

    requestId.current += 1;
    const currentRequest = requestId.current;

    client
      .getSpecies(id)
      .then((result) => {
        // Scarta i risultati di una richiesta non più corrente (id/enabled
        // cambiati o componente smontato): guardia sugli aggiornamenti obsoleti.
        if (currentRequest !== requestId.current) {
          return;
        }
        setState(
          result.ok
            ? { species: result.value, error: null, isLoading: false }
            : { species: null, error: result.error, isLoading: false },
        );
      })
      .catch(() => {
        // Il client incapsula gli errori in un Result e non rigetta mai; questo
        // ramo è una salvaguardia difensiva e non deve toccare stato obsoleto.
      });

    return () => {
      // Invalida la richiesta in corso allo smontaggio o al cambio di dipendenze.
      requestId.current += 1;
    };
  }, [client, id, enabled]);

  return {
    species: state.species,
    isLoading: state.isLoading,
    error: state.error,
  };
}
