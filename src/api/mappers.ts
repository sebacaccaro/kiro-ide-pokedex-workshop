// Mapping puro dai tipi Raw (snake_case) delle PokéAPI verso i tipi di dominio
// (camelCase) dell'applicazione.
//
// Confine di rete: qui avviene la traduzione dei nomi dei campi (es.
// `base_experience` -> `baseExperience`) così che il resto dell'app non veda mai
// la forma grezza. Sono funzioni pure e immutabili: non toccano la rete e non
// mutano l'input.
//
// _Requirements: 1.3, 5.4, 2.2, 2.3_

import type {
  Pokemon,
  PokemonAbility,
  PokemonListPage,
  PokemonType,
  ResourceReference,
} from '../types/pokemon';
import type {
  AbilityEntryRaw,
  PokemonListPageRaw,
  PokemonRaw,
  ResourceReferenceRaw,
  TypeEntryRaw,
} from './raw';

function mapAbility(raw: AbilityEntryRaw): PokemonAbility {
  return {
    name: raw.ability.name,
    isHidden: raw.is_hidden,
    slot: raw.slot,
  };
}

function mapType(raw: TypeEntryRaw): PokemonType {
  return {
    slot: raw.slot,
    name: raw.type.name,
  };
}

function mapReference(raw: ResourceReferenceRaw): ResourceReference {
  return {
    name: raw.name,
    url: raw.url,
  };
}

/** Traduce un `PokemonRaw` (snake_case) nel tipo di dominio `Pokemon`. */
export function mapPokemon(raw: PokemonRaw): Pokemon {
  return {
    id: raw.id,
    name: raw.name,
    height: raw.height,
    weight: raw.weight,
    baseExperience: raw.base_experience,
    abilities: raw.abilities.map(mapAbility),
    types: raw.types.map(mapType),
    spriteUrl: raw.sprites.front_default,
  };
}

/** Traduce una `PokemonListPageRaw` nel tipo di dominio `PokemonListPage`. */
export function mapListPage(raw: PokemonListPageRaw): PokemonListPage {
  return {
    count: raw.count,
    next: raw.next,
    previous: raw.previous,
    results: raw.results.map(mapReference),
  };
}
