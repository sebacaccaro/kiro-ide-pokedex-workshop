import type { ReactElement } from 'react';
import { useCallback, useState } from 'react';
import { flushSync } from 'react-dom';

import type { Pokemon } from '../types/pokemon';

// Componente di presentazione "stupido" per la Vista_Dettaglio.
// Riceve un Pokemon di dominio e la callback onBack via props: non contiene
// logica di fetch ne di stato applicativo. L'unico stato locale gestisce il
// fallimento di caricamento dello sprite (onError -> segnaposto).
// _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 8.2, 8.3, 8.4_

export interface PokemonDetailProps {
  readonly pokemon: Pokemon;
  readonly onBack: () => void; // Req 3.7
}

/** Classe CSS stabile su cui i due temi agiscono per lo sprite (Req 8.5, 8.6). */
const SPRITE_CLASS = 'pokedex-sprite';

export function PokemonDetail({ pokemon, onBack }: PokemonDetailProps): ReactElement {
  const [hasImageError, setHasImageError] = useState(false);

  // Callback ref: registra un listener nativo per l'evento `error` sull'img.
  // Un listener nativo (invece del solo onError sintetico) intercetta in modo
  // affidabile anche gli errori di caricamento reali del browser (Req 8.4).
  const imageRef = useCallback((node: HTMLImageElement | null) => {
    if (node !== null) {
      node.addEventListener('error', () => {
        // flushSync applica subito l'aggiornamento cosi il segnaposto sostituisce
        // l'immagine interrotta in modo sincrono, senza flash dell'img rotta.
        flushSync(() => setHasImageError(true));
      });
    }
  }, []);

  // Copia difensiva prima dell'ordinamento: `types` e readonly (Req 3.4).
  const sortedTypes = [...pokemon.types].sort((a, b) => a.slot - b.slot);

  // Mostra l'immagine solo se lo sprite e valorizzato e il caricamento non e
  // fallito; altrimenti un segnaposto che occupa lo stesso spazio (Req 8.3, 8.4).
  const showImage = pokemon.spriteUrl !== null && !hasImageError;

  return (
    <article>
      <button type="button" onClick={onBack}>
        Indietro
      </button>

      {showImage ? (
        <img
          ref={imageRef}
          className={SPRITE_CLASS}
          src={pokemon.spriteUrl ?? undefined}
          alt={pokemon.name}
          onError={() => setHasImageError(true)}
        />
      ) : (
        <div className={SPRITE_CLASS} role="presentation" aria-hidden="true" />
      )}

      <h1>{pokemon.name}</h1>

      <dl>
        <dt>Numero</dt>
        <dd>{pokemon.id}</dd>

        <dt>Altezza</dt>
        <dd>{pokemon.height}</dd>

        <dt>Peso</dt>
        <dd>{pokemon.weight}</dd>

        <dt>Esperienza base</dt>
        <dd>{pokemon.baseExperience}</dd>
      </dl>

      <section aria-label="Tipi">
        <h2>Tipi</h2>
        <ul>
          {sortedTypes.map((type) => (
            <li key={type.slot}>{type.name}</li>
          ))}
        </ul>
      </section>

      <section aria-label="Abilita">
        <h2>Abilita</h2>
        <ul>
          {pokemon.abilities.map((ability) => (
            <li key={ability.slot}>{ability.name}</li>
          ))}
        </ul>
      </section>
    </article>
  );
}
