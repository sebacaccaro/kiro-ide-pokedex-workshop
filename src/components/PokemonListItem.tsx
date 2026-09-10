import type { JSX } from 'react';

import type { PokemonListEntry } from '../lib/generation';
import { spriteUrlForId } from '../lib/sprites';
import { CaptureToggle } from './CaptureToggle';

export interface PokemonListItemProps {
  readonly entry: PokemonListEntry;
  /** Elemento selezionato: mostra il cursore a freccia nel Tema_Rosso (Req 6.6). */
  readonly isSelected: boolean;
  readonly onSelect: (id: number) => void;
  /**
   * Stato_Catturato della voce per il Toggle_Cattura (Req 1.1). Il Toggle è
   * reso solo quando i comandi di cattura sono forniti dalla Vista_Elenco.
   */
  readonly isCaptured?: boolean;
  /** Comando di cattura passato al Toggle_Cattura (Req 1.1, 1.6). */
  readonly onCapture?: (id: number) => void;
  /** Comando di annullamento cattura passato al Toggle_Cattura (Req 1.1, 3.1). */
  readonly onUncapture?: (id: number) => void;
}

/**
 * Una riga dell'elenco. Rende sempre miniatura, numero, nome e una regione
 * stabile per i tipi (Req 6.7, 7.4); la visibilità dei tipi è regolata dal tema
 * via CSS. La miniatura è derivata dall'id (nessun fetch aggiuntivo).
 * L'elemento selezionato espone `aria-current` per il cursore a freccia (Req 6.6).
 *
 * Quando la Vista_Elenco fornisce i comandi di cattura (`onCapture`/
 * `onUncapture`) e lo `isCaptured`, la voce ospita il Toggle_Cattura alla destra
 * dei metadati, dopo la regione dei tipi (Req 1.1). L'attivazione del Toggle non
 * propaga la selezione della riga (gestita internamente dal Toggle con
 * `stopPropagation`), così catturare non apre il dettaglio (Req 1.6).
 */
export function PokemonListItem({
  entry,
  isSelected,
  onSelect,
  isCaptured,
  onCapture,
  onUncapture,
}: PokemonListItemProps): JSX.Element {
  const hasCaptureCommands =
    onCapture !== undefined && onUncapture !== undefined;

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
      {hasCaptureCommands ? (
        <CaptureToggle
          pokemonId={entry.id}
          pokemonName={entry.name}
          isCaptured={isCaptured ?? false}
          onCapture={onCapture}
          onUncapture={onUncapture}
        />
      ) : null}
    </div>
  );
}
