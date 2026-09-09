/**
 * Costruzione pura dell'URL dello sprite ufficiale a partire dall'id del Pokémon.
 *
 * Gli sprite front_default delle PokéAPI sono serviti a un URL prevedibile,
 * derivabile dal solo id numerico. Questo permette di mostrare una miniatura
 * nell'elenco senza un fetch di dettaglio per ogni voce (l'elenco espone solo
 * id, nome e url).
 * _Requirements: 8.1, 8.2_
 */

/** Base degli sprite ufficiali PokéAPI (front_default). */
export const SPRITE_BASE_URL =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';

/** URL dello sprite front_default per l'id dato (es. 25 -> ".../25.png"). */
export function spriteUrlForId(id: number): string {
  return `${SPRITE_BASE_URL}/${id}.png`;
}
