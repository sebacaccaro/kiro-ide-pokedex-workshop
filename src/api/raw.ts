// Tipi Raw (snake_case) delle PokéAPI.
//
// Confine di rete: questi tipi descrivono la forma grezza restituita dalle
// PokéAPI e sono usati SOLO all'interno di `src/api/` (parse.ts, mappers.ts).
// Non devono essere re-esportati verso il resto dell'applicazione: il dominio
// lavora con i tipi camelCase di `src/types/pokemon.ts` (Requirement 5.3).
//
// Vengono tipizzati soltanto i campi effettivamente consumati (Requirement 5.1).

export interface PokemonSpritesRaw {
  readonly front_default: string | null;
}

export interface PokemonRaw {
  readonly id: number;
  readonly name: string;
  readonly height: number;
  readonly weight: number;
  readonly base_experience: number;
  readonly abilities: readonly AbilityEntryRaw[];
  readonly types: readonly TypeEntryRaw[];
  readonly sprites: PokemonSpritesRaw; // <- NUOVO (Req 8): da sprites.front_default
}

export interface AbilityEntryRaw {
  readonly ability: { readonly name: string };
  readonly is_hidden: boolean;
  readonly slot: number;
}

export interface TypeEntryRaw {
  readonly slot: number;
  readonly type: { readonly name: string };
}

export interface ResourceReferenceRaw {
  readonly name: string;
  readonly url: string;
}

export interface PokemonListPageRaw {
  readonly count: number;
  readonly next: string | null;
  readonly previous: string | null;
  readonly results: readonly ResourceReferenceRaw[];
}
