/**
 * Costruzione pura dell'URL dello sprite a partire dall'id del Pokémon.
 *
 * Gli sprite delle PokéAPI sono serviti a URL prevedibili, derivabili dal solo
 * id numerico. Questo permette di mostrare una miniatura nell'elenco senza un
 * fetch di dettaglio per ogni voce (l'elenco espone solo id, nome e url).
 * _Requirements: 8.1, 8.2_
 */

import type { ThemeName } from './theme';

/** Base degli sprite ufficiali PokéAPI (front_default). */
export const SPRITE_BASE_URL =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';

/**
 * Base degli sprite per-gioco (per-versione) delle PokéAPI. Sotto questo path
 * vivono gli sprite raggruppati per generazione e gruppo di versioni
 * (es. `generation-i/red-blue`, `generation-iv/diamond-pearl`).
 */
export const THEME_SPRITE_BASE_URL = `${SPRITE_BASE_URL}/versions`;

/**
 * Segmento di path per-gioco associato a ciascun tema. Ogni tema corrisponde a
 * un gioco e il suo sprite proviene dal set di quel gioco: Tema_Rosso ->
 * Rosso/Blu (Gen I), Tema_Diamante -> Diamante/Perla (Gen IV).
 *
 * Per Rosso/Blu si usa la variante `transparent`: gli sprite Gen I "piatti"
 * hanno un fondo bianco cotto nel PNG, mentre la variante trasparente offre uno
 * sfondo alfa reale che si integra con qualsiasi tema, senza trucchi CSS.
 */
const THEME_SPRITE_PATH: Readonly<Record<ThemeName, string>> = {
  rosso: 'generation-i/red-blue/transparent',
  diamante: 'generation-iv/diamond-pearl',
};

/** URL dello sprite front_default per l'id dato (es. 25 -> ".../25.png"). */
export function spriteUrlForId(id: number): string {
  return `${SPRITE_BASE_URL}/${id}.png`;
}

/**
 * URL dello sprite del gioco corrispondente al tema, per l'id dato
 * (es. id 25 + tema 'rosso' -> ".../versions/generation-i/red-blue/25.png").
 */
export function spriteUrlForTheme(id: number, theme: ThemeName): string {
  return `${THEME_SPRITE_BASE_URL}/${THEME_SPRITE_PATH[theme]}/${id}.png`;
}
