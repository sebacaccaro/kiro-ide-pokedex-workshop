/**
 * Calcolo del rapporto di contrasto WCAG 2.x tra due colori esadecimali.
 *
 * La logica è pura e deterministica: converte ciascun colore in luminanza
 * relativa (sRGB -> lineare) e applica la formula del contrasto
 * `(L1 + 0.05) / (L2 + 0.05)`, dove `L1` è la luminanza maggiore. Il risultato
 * è sempre >= 1 ed è simmetrico rispetto all'ordine dei due colori.
 */

interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

const HEX_COLOR = /^#?([0-9a-fA-F]{6})$/;

/** Converte un colore esadecimale a 6 cifre nei suoi canali RGB (0..255). */
function parseHex(hex: string): Rgb {
  const match = HEX_COLOR.exec(hex.trim());

  if (!match) {
    throw new Error(`Colore esadecimale non valido: ${hex}`);
  }

  const value = Number.parseInt(match[1], 16);

  return {
    r: Math.floor(value / 0x10000) % 0x100,
    g: Math.floor(value / 0x100) % 0x100,
    b: value % 0x100,
  };
}

/** Linearizza un canale sRGB normalizzato (0..1) secondo la formula WCAG. */
function toLinear(channel: number): number {
  return channel <= 0.03928
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;
}

/** Luminanza relativa (0..1) di un colore secondo la formula WCAG. */
function relativeLuminance({ r, g, b }: Rgb): number {
  const rl = toLinear(r / 255);
  const gl = toLinear(g / 255);
  const bl = toLinear(b / 255);

  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

/**
 * Rapporto di contrasto tra due colori esadecimali a 6 cifre.
 *
 * @param hexA primo colore (con o senza `#`)
 * @param hexB secondo colore (con o senza `#`)
 * @returns un valore >= 1, simmetrico rispetto all'ordine degli argomenti
 */
export function contrastRatio(hexA: string, hexB: string): number {
  const luminanceA = relativeLuminance(parseHex(hexA));
  const luminanceB = relativeLuminance(parseHex(hexB));

  const lighter = Math.max(luminanceA, luminanceB);
  const darker = Math.min(luminanceA, luminanceB);

  return (lighter + 0.05) / (darker + 0.05);
}
