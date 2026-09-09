// src/hooks/usePokemonList.ts
//
// Hook di logica con stato per la Vista_Elenco: gestisce il caricamento
// incrementale (infinite scroll) dei Pokémon dalla PokéAPI tramite il
// `PokeApiClient`, filtrando alla Prima_Generazione (id 1..151) con
// `lib/generation`. Non conosce la forma grezza delle PokéAPI: consuma solo
// tipi di dominio e delega la rete al client (confine `api/`).
//
// Comportamento (Requirements 1.1, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6,
// 9.3, 9.6):
// - all'avvio richiede il primo blocco con `{ limit: 20, offset: 0 }`;
// - ogni `loadMore` richiede il blocco successivo con offset aumentato di 20;
// - le voci filtrate vengono concatenate in coda (l'elenco cresce per prefisso);
// - l'elenco diventa `isComplete` una volta coperto l'id 151 o esaurita la
//   sorgente (`next === null`), e non vengono più richiesti blocchi;
// - gli errori del client sono esposti come stato osservabile (nessuna
//   eccezione sfugge); `retry` ripete l'ultimo blocco fallito con lo stesso
//   offset;
// - i risultati obsoleti (componente smontato o richiesta superata) sono
//   ignorati grazie a una guardia con token incrementale.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PokeApiError } from '../api/errors';
import type { PokeApiClient } from '../api/pokeApiClient';
import {
  FIRST_GEN_MAX_ID,
  toFirstGenEntries,
  type PokemonListEntry,
} from '../lib/generation';

/** Dimensione fissa di un Blocco_Elenco (Req 1.1, 1.4). */
const PAGE_SIZE = 20;

export interface UsePokemonListResult {
  /** Voci già caricate, filtrate alla Prima_Generazione, in ordine di id crescente. */
  readonly entries: readonly PokemonListEntry[];
  /** True mentre il PRIMO blocco carica e nessuna voce è ancora mostrata (Req 2.1). */
  readonly isInitialLoading: boolean;
  /** True mentre un blocco successivo carica (Req 2.2). */
  readonly isLoadingMore: boolean;
  /** Errore dell'ultimo blocco fallito, altrimenti null (Req 2.3). */
  readonly error: PokeApiError | null;
  /** True quando sono stati coperti tutti i 151 e non si richiede altro (Req 1.5). */
  readonly isComplete: boolean;
  /** True quando il primo blocco è ok ma non produce voci di Prima_Generazione (Req 2.6). */
  readonly isEmpty: boolean;
  /** Chiede il blocco successivo; invocato dalla sentinella (Req 1.4). */
  readonly loadMore: () => void;
  /** Ritenta l'ultimo blocco fallito (Req 2.4, 2.5). */
  readonly retry: () => void;
}

/**
 * Richiesta di blocco in corso: identificata da un `token` incrementale (guardia
 * sui risultati obsoleti) e dall'`offset` da chiedere al client. `null` quando
 * non c'è alcuna richiesta pendente.
 */
interface PendingRequest {
  readonly token: number;
  readonly offset: number;
}

/**
 * Gestisce il caricamento incrementale dell'elenco. Usa il client per `list`
 * con limit=20 e offset crescente di 20, filtra alla Prima_Generazione tramite
 * lib/generation e si ferma una volta coperto l'id 151 (Req 1.5).
 */
export function usePokemonList(client: PokeApiClient): UsePokemonListResult {
  const [entries, setEntries] = useState<readonly PokemonListEntry[]>([]);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<PokeApiError | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [isEmpty, setIsEmpty] = useState(false);
  // La richiesta pendente guida il caricamento: impostarla è l'unico modo per
  // avviare una `list`. Lo stato di "in caricamento" è derivato dalla sua
  // presenza, così l'effetto esegue solo lavoro asincrono (nessun setState
  // sincrono nel corpo dell'effetto).
  const [pending, setPending] = useState<PendingRequest | null>({
    token: 0,
    offset: 0,
  });

  // Contatore dei token: ogni nuova richiesta ne genera uno maggiore, così una
  // risposta obsoleta (superata da una più recente) viene ignorata (Req 9.6).
  const tokenRef = useRef(0);

  const request = useCallback((targetOffset: number) => {
    tokenRef.current += 1;
    setError(null);
    setPending({ token: tokenRef.current, offset: targetOffset });
  }, []);

  useEffect(() => {
    if (pending === null) {
      return undefined;
    }

    let active = true;
    client.list({ limit: PAGE_SIZE, offset: pending.offset }).then((result) => {
      // Guardia sui risultati obsoleti: ignora se l'effetto è stato ripulito
      // (unmount o nuova richiesta) o se il token non è più quello corrente.
      if (!active || pending.token !== tokenRef.current) {
        return;
      }
      setPending(null);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      const newEntries = toFirstGenEntries(result.value.results);
      setOffset(pending.offset + PAGE_SIZE);
      setEntries((previous) => {
        const combined =
          pending.offset === 0 ? newEntries : [...previous, ...newEntries];

        const reached151 = combined.some(
          (entry) => entry.id === FIRST_GEN_MAX_ID,
        );
        if (reached151 || result.value.next === null) {
          setIsComplete(true);
        }
        if (pending.offset === 0 && combined.length === 0) {
          setIsEmpty(true);
        }
        return combined;
      });
    });

    return () => {
      active = false;
    };
  }, [client, pending]);

  const isLoading = pending !== null;

  const loadMore = useCallback(() => {
    if (isLoading || isComplete || error !== null) {
      return;
    }
    request(offset);
  }, [error, isComplete, isLoading, offset, request]);

  const retry = useCallback(() => {
    if (error === null) {
      return;
    }
    request(offset);
  }, [error, offset, request]);

  const isInitialLoading = isLoading && entries.length === 0 && error === null;
  const isLoadingMore = isLoading && entries.length > 0;

  return {
    entries,
    isInitialLoading,
    isLoadingMore,
    error,
    isComplete,
    isEmpty,
    loadMore,
    retry,
  };
}
