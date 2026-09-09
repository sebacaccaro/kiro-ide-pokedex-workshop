import { useEffect, useRef, type JSX } from 'react';

import type { PokemonListEntry } from '../lib/generation';
import { PokemonListItem } from './PokemonListItem';

export interface PokemonListProps {
  readonly entries: readonly PokemonListEntry[];
  /** Mostra l'indicatore di caricamento incrementale in coda (Req 2.2). */
  readonly isLoadingMore: boolean;
  readonly onSelect: (id: number) => void;
  /** Invocata quando la sentinella entra nel viewport (infinite scroll, Req 1.4). */
  readonly onReachEnd: () => void;
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
}: PokemonListProps): JSX.Element {
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
