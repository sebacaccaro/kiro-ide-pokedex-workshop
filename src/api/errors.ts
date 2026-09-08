// src/api/errors.ts

/** Categorie ammesse per un PokeApiError (Requirement 4.5). */
export type PokeApiErrorCategory =
  | 'risorsa non trovata'
  | 'risposta HTTP non valida'
  | 'parametri non validi'
  | 'errore di rete';

/** Errore restituito dalle operazioni del client. */
export interface PokeApiError {
  readonly category: PokeApiErrorCategory; // Requirement 4.5
  readonly message: string; // italiano, 1..200 char (Req 4.6)
  /** Presente per 'risorsa non trovata' e 'risposta HTTP non valida' (Req 4.7). */
  readonly httpStatus?: number; // 100..599
  /** Presente per 'risorsa non trovata' (Req 1.4): identificatore richiesto. */
  readonly identifier?: string | number;
}

/** Result discriminato usato dalle operazioni pubbliche. */
export type Result<T, E = PokeApiError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

/** Sollevato SOLO dalla creazione del client con Base URL non valido (Req 3.4). */
export class PokeApiConfigError extends Error {}
