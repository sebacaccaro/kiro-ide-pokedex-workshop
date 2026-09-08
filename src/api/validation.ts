// src/api/validation.ts
import type { PokeApiError, Result } from './errors';

/** Limiti per l'identificatore numerico (Requirement 1.1). */
const MIN_ID = 1;
const MAX_ID = 100000;

/** Lunghezza massima per l'identificatore testuale (Requirement 1.2). */
const MAX_NAME_LENGTH = 100;

/** Default e limiti della paginazione (Requirement 2.4, 2.5). */
const DEFAULT_LIMIT = 20;
const DEFAULT_OFFSET = 0;
const MIN_LIMIT = 1;
const MAX_LIMIT = 100;

interface PaginationParams {
  readonly limit?: number;
  readonly offset?: number;
}

/** Costruisce un errore di categoria "parametri non validi". */
function invalidParams(message: string): Result<never, PokeApiError> {
  return { ok: false, error: { category: 'parametri non validi', message } };
}

/**
 * Requirement 1.1, 1.2, 1.5. Valida l'identificatore e normalizza le stringhe
 * in minuscolo. Interi validi in 1..100000 diventano la loro rappresentazione
 * testuale; le stringhe non vuote di 1..100 caratteri vengono normalizzate.
 */
export function validateIdentifier(
  identifier: string | number,
): Result<string, PokeApiError> {
  if (typeof identifier === 'number') {
    if (!Number.isInteger(identifier)) {
      return invalidParams(
        `Identificatore non valido: ${identifier} non e un intero.`,
      );
    }
    if (identifier < MIN_ID || identifier > MAX_ID) {
      return invalidParams(
        `Identificatore fuori intervallo: deve essere tra ${MIN_ID} e ${MAX_ID}.`,
      );
    }
    return { ok: true, value: String(identifier) };
  }

  const trimmed = identifier.trim();
  if (trimmed.length === 0) {
    return invalidParams('Identificatore non valido: nome vuoto.');
  }
  if (trimmed.length > MAX_NAME_LENGTH) {
    return invalidParams(
      `Identificatore non valido: il nome supera ${MAX_NAME_LENGTH} caratteri.`,
    );
  }
  return { ok: true, value: trimmed.toLowerCase() };
}

/**
 * Requirement 2.4, 2.5. Applica i default (limit=20, offset=0) e valida i
 * range: limit intero in 1..100, offset intero >= 0.
 */
export function validatePagination(
  params?: PaginationParams,
): Result<{ limit: number; offset: number }, PokeApiError> {
  const limit = params?.limit ?? DEFAULT_LIMIT;
  const offset = params?.offset ?? DEFAULT_OFFSET;

  if (!Number.isInteger(limit)) {
    return invalidParams(
      `Paginazione non valida: limit ${limit} non e un intero.`,
    );
  }
  if (limit < MIN_LIMIT || limit > MAX_LIMIT) {
    return invalidParams(
      `Paginazione non valida: limit deve essere tra ${MIN_LIMIT} e ${MAX_LIMIT}.`,
    );
  }
  if (!Number.isInteger(offset)) {
    return invalidParams(
      `Paginazione non valida: offset ${offset} non e un intero.`,
    );
  }
  if (offset < 0) {
    return invalidParams(
      'Paginazione non valida: offset non puo essere negativo.',
    );
  }

  return { ok: true, value: { limit, offset } };
}

/**
 * Requirement 3.4. Restituisce true solo se baseUrl e un URL assoluto http(s)
 * con host.
 */
export function isValidBaseUrl(baseUrl: string): boolean {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    return false;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return false;
  }
  return url.hostname.length > 0;
}
