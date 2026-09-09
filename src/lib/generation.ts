import type { ResourceReference } from '../types/pokemon';

/** Limiti inclusivi della Prima_Generazione (Kanto). */
export const FIRST_GEN_MIN_ID = 1;
export const FIRST_GEN_MAX_ID = 151;

/**
 * Estrae l'id numerico dall'URL di un ResourceReference PokéAPI
 * (es. ".../pokemon/25/" -> 25). Restituisce null se l'URL non contiene
 * un id numerico riconoscibile.
 */
export function extractIdFromUrl(url: string): number | null {
  const match = url.match(/\/(\d+)\/?$/);
  if (match === null) {
    return null;
  }
  return Number(match[1]);
}

/** Vero se l'id appartiene alla Prima_Generazione (1..151 inclusi). */
export function isFirstGeneration(id: number): boolean {
  return id >= FIRST_GEN_MIN_ID && id <= FIRST_GEN_MAX_ID;
}

/** Voce di elenco già arricchita con l'id numerico ricavato dall'URL. */
export interface PokemonListEntry {
  readonly id: number;
  readonly name: string;
  readonly url: string;
}

/**
 * Filtra i ResourceReference tenendo solo quelli della Prima_Generazione,
 * arricchendoli con l'id numerico. Scarta i riferimenti senza id valido o
 * fuori 1..151. Preserva l'ordine d'ingresso.
 */
export function toFirstGenEntries(
  references: readonly ResourceReference[],
): readonly PokemonListEntry[] {
  return references.reduce<PokemonListEntry[]>((entries, reference) => {
    const id = extractIdFromUrl(reference.url);
    if (id !== null && isFirstGeneration(id)) {
      entries.push({ id, name: reference.name, url: reference.url });
    }
    return entries;
  }, []);
}
