// Tipi di dominio (camelCase) condivisi dall'applicazione.
// Solo il livello `src/api/` conosce la forma grezza (snake_case) delle PokéAPI:
// il resto dell'app lavora esclusivamente con questi tipi.

export interface PokemonAbility {
  readonly name: string;
  readonly isHidden: boolean;
  readonly slot: number;
}

export interface PokemonType {
  readonly slot: number;
  readonly name: string;
}

export interface Pokemon {
  readonly id: number;
  readonly name: string;
  readonly height: number;
  readonly weight: number;
  readonly baseExperience: number; // <- da base_experience
  readonly abilities: readonly PokemonAbility[];
  readonly types: readonly PokemonType[];
  readonly spriteUrl: string | null; // <- NUOVO (Req 8.1): da sprites.front_default
}

export interface ResourceReference {
  readonly name: string;
  readonly url: string;
}

export interface PokemonListPage {
  readonly count: number;
  readonly next: string | null;
  readonly previous: string | null;
  readonly results: readonly ResourceReference[];
}

/** Descrizione_Pokedex come tipo di dominio (Req 5.7). */
export interface PokemonSpecies {
  readonly id: number;
  /**
   * Flavor text selezionato e normalizzato (spazi/a-capo compattati).
   * Stringa vuota se la specie non contiene testo → "non disponibile" (Req 5.6).
   */
  readonly flavorText: string;
}
