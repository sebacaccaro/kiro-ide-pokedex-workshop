import { useEffect, useRef, type JSX } from 'react';

import type { PokemonListEntry } from '../lib/generation';
import type { ThemeName } from '../lib/theme';
import { PokemonListItem } from './PokemonListItem';

export interface PokemonListProps {
  readonly entries: readonly PokemonListEntry[];
  /** Mostra l'indicatore di caricamento incrementale in coda (Req 2.2). */
  readonly isLoadingMore: boolean;
  readonly onSelect: (id: number) => void;
  /** Invocata quando la sentinella entra nel viewport (infinite scroll, Req 1.4). */
  readonly onReachEnd: () => void;
  /** Tema attivo: propagato a ogni voce per lo sprite del gioco corrispondente. */
  readonly theme?: ThemeName;
  /**
   * Predicato dello Stato_Catturato per voce, dalla Vista_Elenco (Req 1.1).
   * Quando fornito insieme ai comandi, ogni voce rende il Toggle_Cattura.
   */
  readonly isCaptured?: (id: number) => boolean;
  /** Comando di cattura per voce, dalla Vista_Elenco/`useCaptures` (Req 1.1). */
  readonly onCapture?: (id: number) => void;
  /** Comando di annullamento cattura per voce (Req 1.1, 3.1). */
  readonly onUncapture?: (id: number) => void;
}

/**
 * Elenco continuo con una sentinella in coda osservata via IntersectionObserver
 * per l'infinite scroll (Req 1.4). Mostra un indicatore incrementale solo mentre
 * `isLoadingMore` è vero (Req 2.2).
 */
export function PokemonList({
  entries,
  isLoadingMore,
  onSelect,
  onReachEnd,
  theme,
  isCaptured,
  onCapture,
  onUncapture,
}: PokemonListProps): JSX.Element {
  const hasCaptureCommands =
    onCapture !== undefined && onUncapture !== undefined;
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (sentinel === null) {
      return undefined;
    }

    const observer = new IntersectionObserver((observed) => {
      if (observed.some((entry) => entry.isIntersecting)) {
        onReachEnd();
      }
    });

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [onReachEnd]);

  return (
    <div className="pokemon-list">
      {entries.map((entry) => (
        <PokemonListItem
          key={entry.id}
          entry={entry}
          isSelected={false}
          onSelect={onSelect}
          theme={theme}
          isCaptured={
            hasCaptureCommands ? (isCaptured?.(entry.id) ?? false) : undefined
          }
          onCapture={hasCaptureCommands ? onCapture : undefined}
          onUncapture={hasCaptureCommands ? onUncapture : undefined}
        />
      ))}
      {isLoadingMore ? (
        <div role="status" className="pokemon-list__loading-more">
          Caricamento in corso…
        </div>
      ) : null}
      <div
        ref={sentinelRef}
        className="pokemon-list__sentinel"
        aria-hidden="true"
      />
    </div>
  );
}
