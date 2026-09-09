import type { JSX } from 'react';

import type { PokemonListEntry } from '../lib/generation';
import { spriteUrlForId } from '../lib/sprites';

export interface PokemonListItemProps {
  readonly entry: PokemonListEntry;
  /** Elemento selezionato: mostra il cursore a freccia nel Tema_Rosso (Req 6.6). */
  readonly isSelected: boolean;
  readonly onSelect: (id: number) => void;
}

/**
 * Una riga dell'elenco. Rende sempre miniatura, numero, nome e una regione
 * stabile per i tipi (Req 6.7, 7.4); la visibilità dei tipi è regolata dal tema
 * via CSS. La miniatura è derivata dall'id (nessun fetch aggiuntivo).
 * L'elemento selezionato espone `aria-current` per il cursore a freccia (Req 6.6).
 */
export function PokemonListItem({
  entry,
  isSelected,
  onSelect,
}: PokemonListItemProps): JSX.Element {
  return (
    <div
      className="pokemon-list-item"
      role="button"
      tabIndex={0}
      aria-current={isSelected ? 'true' : undefined}
      onClick={() => onSelect(entry.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(entry.id);
        }
      }}
    >
      <img
        className="pokemon-list-item__sprite pokedex-sprite"
        src={spriteUrlForId(entry.id)}
        alt={entry.name}
        loading="lazy"
        width={64}
        height={64}
      />
      <span className="pokemon-number">{entry.id}</span>
      <span className="pokemon-name">{entry.name}</span>
      <span className="pokemon-types" data-testid="pokemon-types" />
    </div>
  );
}
