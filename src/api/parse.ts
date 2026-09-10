// Narrowing difensivo da `unknown` verso i tipi Raw delle PokéAPI.
//
// Il confine di rete non si fida della forma dei dati: ogni corpo arriva come
// `unknown` (mai `any`) e va verificato campo per campo prima di essere trattato
// come Raw. Se anche un solo campo consumato manca o ha il tipo sbagliato, si
// restituisce `null`: non si producono mai domini parziali (Requirement 5.5).
//
// _Requirements: 5.1, 5.5, 5.6_

import type {
  AbilityEntryRaw,
  FlavorTextEntryRaw,
  PokemonListPageRaw,
  PokemonRaw,
  PokemonSpeciesRaw,
  PokemonSpritesRaw,
  ResourceReferenceRaw,
  TypeEntryRaw,
} from './raw';

/** Vero se `value` è un oggetto non nullo indicizzabile per chiave stringa. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number';
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/** Verifica che `value` sia un oggetto con un campo `name` di tipo stringa. */
function isNamedReference(value: unknown): value is { name: string } {
  return isRecord(value) && isString(value.name);
}

function parseAbilityEntry(value: unknown): AbilityEntryRaw | null {
  if (!isRecord(value)) {
    return null;
  }
  if (!isNamedReference(value.ability)) {
    return null;
  }
  if (!isBoolean(value.is_hidden)) {
    return null;
  }
  if (!isNumber(value.slot)) {
    return null;
  }
  return {
    ability: { name: value.ability.name },
    is_hidden: value.is_hidden,
    slot: value.slot,
  };
}

function parseTypeEntry(value: unknown): TypeEntryRaw | null {
  if (!isRecord(value)) {
    return null;
  }
  if (!isNumber(value.slot)) {
    return null;
  }
  if (!isNamedReference(value.type)) {
    return null;
  }
  return {
    slot: value.slot,
    type: { name: value.type.name },
  };
}

/**
 * Narrowing difensivo dello sprite (Requirement 8.1). A differenza degli altri
 * campi consumati, uno `sprites` mancante o malformato non invalida l'intero
 * Pokémon: si normalizza `front_default` a `null`. `front_default` è ammesso
 * solo come stringa oppure `null`; qualunque altro tipo diventa `null`.
 */
function parseSprites(value: unknown): PokemonSpritesRaw {
  if (isRecord(value) && isString(value.front_default)) {
    return { front_default: value.front_default };
  }
  return { front_default: null };
}

function parseResourceReference(value: unknown): ResourceReferenceRaw | null {
  if (!isRecord(value)) {
    return null;
  }
  if (!isString(value.name) || !isString(value.url)) {
    return null;
  }
  return { name: value.name, url: value.url };
}

/**
 * Applica `parseItem` a ogni voce di `value`: restituisce l'array narrowed se
 * `value` è un array e ogni voce è conforme, altrimenti `null`.
 */
function parseArray<T>(
  value: unknown,
  parseItem: (item: unknown) => T | null,
): T[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const parsed: T[] = [];
  for (const item of value) {
    const entry = parseItem(item);
    if (entry === null) {
      return null;
    }
    parsed.push(entry);
  }
  return parsed;
}

/** Restituisce il Raw se il corpo è conforme, altrimenti null. Niente any. */
export function parsePokemonRaw(body: unknown): PokemonRaw | null {
  if (!isRecord(body)) {
    return null;
  }
  if (
    !isNumber(body.id) ||
    !isString(body.name) ||
    !isNumber(body.height) ||
    !isNumber(body.weight) ||
    !isNumber(body.base_experience)
  ) {
    return null;
  }

  const abilities = parseArray(body.abilities, parseAbilityEntry);
  if (abilities === null) {
    return null;
  }

  const types = parseArray(body.types, parseTypeEntry);
  if (types === null) {
    return null;
  }

  return {
    id: body.id,
    name: body.name,
    height: body.height,
    weight: body.weight,
    base_experience: body.base_experience,
    abilities,
    types,
    sprites: parseSprites(body.sprites),
  };
}

function parseFlavorTextEntry(value: unknown): FlavorTextEntryRaw | null {
  if (!isRecord(value)) {
    return null;
  }
  if (!isString(value.flavor_text)) {
    return null;
  }
  if (!isNamedReference(value.language)) {
    return null;
  }
  return {
    flavor_text: value.flavor_text,
    language: { name: value.language.name },
  };
}

/** Restituisce il Raw se il corpo è conforme, altrimenti null. Niente any. */
export function parsePokemonSpeciesRaw(
  body: unknown,
): PokemonSpeciesRaw | null {
  if (!isRecord(body)) {
    return null;
  }
  if (!isNumber(body.id)) {
    return null;
  }

  const flavorTextEntries = parseArray(
    body.flavor_text_entries,
    parseFlavorTextEntry,
  );
  if (flavorTextEntries === null) {
    return null;
  }

  return {
    id: body.id,
    flavor_text_entries: flavorTextEntries,
  };
}

/** Restituisce il Raw se il corpo è conforme, altrimenti null. Niente any. */
export function parseListPageRaw(body: unknown): PokemonListPageRaw | null {
  if (!isRecord(body)) {
    return null;
  }
  if (!isNumber(body.count)) {
    return null;
  }
  if (body.next !== null && !isString(body.next)) {
    return null;
  }
  if (body.previous !== null && !isString(body.previous)) {
    return null;
  }

  const results = parseArray(body.results, parseResourceReference);
  if (results === null) {
    return null;
  }

  return {
    count: body.count,
    next: body.next,
    previous: body.previous,
    results,
  };
}
