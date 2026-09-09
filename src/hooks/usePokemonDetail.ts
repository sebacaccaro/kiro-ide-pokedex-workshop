// src/hooks/usePokemonDetail.ts
//
// Hook con stato per il dettaglio di un Pokémon: richiede la risorsa con
// `client.get(id)` ed espone lo stato osservabile della richiesta (caricamento,
// dati, errore, "risorsa non trovata") più un `retry` che ripete la richiesta.
//
// La chiamata di rete passa esclusivamente dal client PokéAPI (unico confine di
// rete). Al cambio di `id` o allo smontaggio, i risultati di richieste ormai
// obsolete vengono scartati per non aggiornare uno stato non più pertinente.
//
// _Requirements: 3.1, 4.1, 4.2, 4.3, 4.4, 4.5, 9.6_

import { useCallback, useEffect, useRef, useState } from 'react';

import type { PokeApiError } from '../api/errors';
import type { PokeApiClient } from '../api/pokeApiClient';
import type { Pokemon } from '../types/pokemon';

export interface UsePokemonDetailResult {
  readonly pokemon: Pokemon | null;
  readonly isLoading: boolean; // Req 4.1, 4.2
  readonly error: PokeApiError | null; // Req 4.3, 4.4
  /** True quando l'errore è di categoria "risorsa non trovata" (Req 4.3). */
  readonly isNotFound: boolean;
  readonly retry: () => void; // Req 4.5
}

/** Categoria d'errore che corrisponde a una risorsa inesistente (Req 4.3). */
const NOT_FOUND_CATEGORY = 'risorsa non trovata';

/** Stato interno della richiesta di dettaglio. */
interface DetailState {
  readonly pokemon: Pokemon | null;
  readonly error: PokeApiError | null;
  readonly isLoading: boolean;
}

/** Stato iniziale: caricamento in corso, nessun dato e nessun errore (Req 4.1). */
const INITIAL_STATE: DetailState = {
  pokemon: null,
  error: null,
  isLoading: true,
};

/** Richiede il Pokémon con `get(id)` e ne espone stato/errore (Req 3.1, 4.x). */
export function usePokemonDetail(
  client: PokeApiClient,
  id: number,
): UsePokemonDetailResult {
  const [state, setState] = useState<DetailState>(INITIAL_STATE);

  // `attempt` cambia a ogni tentativo (cambio di `id` o `retry`): è la dipendenza
  // che fa ripartire l'effetto di fetch e ripristina lo Stato_Caricamento.
  const [attempt, setAttempt] = useState<number>(0);

  // Riporta lo stato in caricamento in fase di render quando cambia l'`id`,
  // così il primo render dopo il cambio mostra già lo Stato_Caricamento senza
  // dati parziali del Pokémon precedente (Req 4.1). È il pattern React di
  // "adjusting state during render" e non richiede una setState sincrona
  // nell'effetto.
  const [trackedId, setTrackedId] = useState<number>(id);
  if (trackedId !== id) {
    setTrackedId(id);
    setState(INITIAL_STATE);
  }

  // Contatore monotòno delle richieste: solo la più recente può aggiornare lo
  // stato. Le richieste avviate da un `id`/tentativo precedente (o prima dello
  // smontaggio) diventano obsolete e i loro risultati vengono ignorati (Req 9.6).
  const requestId = useRef<number>(0);

  useEffect(() => {
    requestId.current += 1;
    const currentRequest = requestId.current;

    client
      .get(id)
      .then((result) => {
        // Scarta i risultati di una richiesta non più corrente (id cambiato,
        // nuovo tentativo o componente smontato): guardia sugli aggiornamenti
        // obsoleti.
        if (currentRequest !== requestId.current) {
          return;
        }
        setState(
          result.ok
            ? { pokemon: result.value, error: null, isLoading: false }
            : { pokemon: null, error: result.error, isLoading: false },
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
  }, [client, id, attempt]);

  const retry = useCallback(() => {
    setState(INITIAL_STATE);
    setAttempt((value) => value + 1);
  }, []);

  const isNotFound = state.error?.category === NOT_FOUND_CATEGORY;

  return {
    pokemon: state.pokemon,
    isLoading: state.isLoading,
    error: state.error,
    isNotFound,
    retry,
  };
}
