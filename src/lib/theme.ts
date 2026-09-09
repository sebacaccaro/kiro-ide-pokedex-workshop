/**
 * Logica pura dei temi commutabili (Tema_Rosso / Tema_Diamante).
 *
 * La rappresentazione visiva dei temi vive in CSS come custom properties
 * selezionate da `data-theme`: la logica JS conosce solo il `ThemeName`.
 * _Requirements: 5.7_
 */

/** Nomi dei temi supportati dall'Applicazione. */
export type ThemeName = 'rosso' | 'diamante';

/** Nome del tema predefinito (Req 5.2, 5.7). */
export const DEFAULT_THEME: ThemeName = 'rosso';

/** Vero se il valore è un `ThemeName` riconosciuto. */
function isThemeName(value: unknown): value is ThemeName {
  return value === 'rosso' || value === 'diamante';
}

/**
 * Normalizza un valore persistito sconosciuto in un `ThemeName` valido.
 * Restituisce i temi validi invariati e ripiega su `DEFAULT_THEME` per
 * qualsiasi altro valore, incluse le non-stringhe (Req 5.7).
 */
export function normalizeThemeName(persisted: unknown): ThemeName {
  return isThemeName(persisted) ? persisted : DEFAULT_THEME;
}
