// src/api/pokeApiClient.ts
//
// Client PokéAPI: unico confine di rete dell'applicazione. Espone due
// operazioni di sola lettura (`get` e `list`) e restituisce esclusivamente tipi
// di dominio (camelCase) o un `PokeApiError` incapsulato in un `Result`. La
// forma grezza (snake_case) delle PokéAPI non esce mai da questo livello.
//
// La `fetch` è iniettabile per rendere gli unit test deterministici, senza rete
// reale (Requirement 6.1). Il Base_URL è configurabile con default sull'API
// pubblica (Requirement 3.2) e viene validato alla creazione (Requirement 3.4).
//
// _Requirements: 1.x, 2.x, 3.1, 3.2, 3.4, 4.x, 6.1, 6.2_

import type {
  Pokemon,
  PokemonListPage,
  PokemonSpecies,
} from '../types/pokemon';
import { PokeApiConfigError, type PokeApiError, type Result } from './errors';
import { mapListPage, mapPokemon, mapPokemonSpecies } from './mappers';
import {
  parseListPageRaw,
  parsePokemonRaw,
  parsePokemonSpeciesRaw,
} from './parse';
import { buildQuery, buildUrl } from './url';
import {
  isValidBaseUrl,
  validateIdentifier,
  validatePagination,
} from './validation';

/** Firma della funzione fetch iniettabile (sottoinsieme di quella del DOM). */
export type FetchFn = (
  input: string,
  init?: { signal?: AbortSignal },
) => Promise<FetchResponse>;

/** Sottoinsieme di Response effettivamente consumato dal client. */
export interface FetchResponse {
  readonly ok: boolean;
  readonly status: number;
  json(): Promise<unknown>;
}

export interface PokeApiClientOptions {
  /** Default: 'https://pokeapi.co/api/v2/'. */
  readonly baseUrl?: string;
  /** Default: globalThis.fetch adattato. Iniettabile per i test. */
  readonly fetchFn?: FetchFn;
  /** Timeout in millisecondi. Default: 10_000. */
  readonly timeoutMs?: number;
}

export interface ListParams {
  /** Intero 1..100. Default: 20. */
  readonly limit?: number;
  /** Intero >= 0. Default: 0. */
  readonly offset?: number;
}

export interface PokeApiClient {
  get(identifier: string | number): Promise<Result<Pokemon>>;
  list(params?: ListParams): Promise<Result<PokemonListPage>>;
  getSpecies(id: number): Promise<Result<PokemonSpecies>>;
}

/** Base_URL predefinito: endpoint pubblico delle PokéAPI (Requirement 3.2). */
const DEFAULT_BASE_URL = 'https://pokeapi.co/api/v2/';

/** Timeout predefinito delle richieste in millisecondi (Requirement 1.7). */
const DEFAULT_TIMEOUT_MS = 10_000;

/** Stato HTTP che indica una risorsa non trovata (Requirement 1.4, 4.1). */
const HTTP_NOT_FOUND = 404;

/**
 * Adatta `globalThis.fetch` (che restituisce una `Response` del DOM) alla firma
 * minimale `FetchFn` usata dal client. Il tipo di ritorno è già compatibile con
 * `FetchResponse` (sottoinsieme di `Response`), quindi non serve alcun cast.
 */
function defaultFetchFn(
  input: string,
  init?: { signal?: AbortSignal },
): Promise<FetchResponse> {
  return globalThis.fetch(input, init);
}

/** Costruisce un errore di categoria "errore di rete" (Requirement 4.3). */
function networkError(): PokeApiError {
  return {
    category: 'errore di rete',
    message: 'Errore di rete o timeout durante la richiesta alle PokéAPI.',
  };
}

/** Costruisce un errore "risorsa non trovata" (Requirement 1.4, 4.1). */
function notFoundError(identifier: string | number): PokeApiError {
  return {
    category: 'risorsa non trovata',
    message: `Risorsa non trovata per l'identificatore ${identifier}.`,
    httpStatus: HTTP_NOT_FOUND,
    identifier,
  };
}

/** Costruisce un errore "risposta HTTP non valida" per uno stato (Req 1.6, 4.2). */
function httpStatusError(status: number): PokeApiError {
  return {
    category: 'risposta HTTP non valida',
    message: `Risposta HTTP non valida: stato ${status}.`,
    httpStatus: status,
  };
}

/** Costruisce un errore "risposta HTTP non valida" per un corpo non conforme (Req 4.4). */
function invalidBodyError(): PokeApiError {
  return {
    category: 'risposta HTTP non valida',
    message: 'Il corpo della risposta non è conforme alla struttura attesa.',
  };
}

/**
 * Esegue una `fetch` verso `url` con un timeout via `AbortController`. In caso
 * di rigetto (rete o abort) restituisce un errore "errore di rete"; altrimenti
 * restituisce la `FetchResponse` ricevuta. Il timer viene sempre cancellato.
 */
async function fetchWithTimeout(
  fetchFn: FetchFn,
  timeoutMs: number,
  url: string,
): Promise<Result<FetchResponse>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchFn(url, { signal: controller.signal });
    return { ok: true, value: response };
  } catch {
    return { ok: false, error: networkError() };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Crea un client PokéAPI. Solleva `PokeApiConfigError` se `baseUrl` non è un URL
 * assoluto http(s) valido (Requirement 3.4).
 */
export function createPokeApiClient(
  options?: PokeApiClientOptions,
): PokeApiClient {
  const baseUrl = options?.baseUrl ?? DEFAULT_BASE_URL;
  if (!isValidBaseUrl(baseUrl)) {
    throw new PokeApiConfigError(
      `Base_URL non valido: "${baseUrl}". Deve essere un URL assoluto http(s) con host.`,
    );
  }

  const fetchFn = options?.fetchFn ?? defaultFetchFn;
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  async function get(identifier: string | number): Promise<Result<Pokemon>> {
    const validated = validateIdentifier(identifier);
    if (!validated.ok) {
      return validated;
    }

    const url = buildUrl(baseUrl, 'pokemon', validated.value);
    const fetched = await fetchWithTimeout(fetchFn, timeoutMs, url);
    if (!fetched.ok) {
      return fetched;
    }

    const response = fetched.value;
    if (response.status === HTTP_NOT_FOUND) {
      return { ok: false, error: notFoundError(identifier) };
    }
    if (!response.ok) {
      return { ok: false, error: httpStatusError(response.status) };
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return { ok: false, error: invalidBodyError() };
    }

    const raw = parsePokemonRaw(body);
    if (raw === null) {
      return { ok: false, error: invalidBodyError() };
    }

    return { ok: true, value: mapPokemon(raw) };
  }

  async function list(params?: ListParams): Promise<Result<PokemonListPage>> {
    const validated = validatePagination(params);
    if (!validated.ok) {
      return validated;
    }

    const { limit, offset } = validated.value;
    const query = buildQuery({ limit, offset });
    const url = `${buildUrl(baseUrl, 'pokemon')}?${query}`;
    const fetched = await fetchWithTimeout(fetchFn, timeoutMs, url);
    if (!fetched.ok) {
      return fetched;
    }

    const response = fetched.value;
    if (!response.ok) {
      return { ok: false, error: httpStatusError(response.status) };
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return { ok: false, error: invalidBodyError() };
    }

    const raw = parseListPageRaw(body);
    if (raw === null) {
      return { ok: false, error: invalidBodyError() };
    }

    return { ok: true, value: mapListPage(raw) };
  }

  async function getSpecies(id: number): Promise<Result<PokemonSpecies>> {
    const validated = validateIdentifier(id);
    if (!validated.ok) {
      return validated;
    }

    const url = buildUrl(baseUrl, 'pokemon-species', validated.value);
    const fetched = await fetchWithTimeout(fetchFn, timeoutMs, url);
    if (!fetched.ok) {
      return fetched;
    }

    const response = fetched.value;
    if (response.status === HTTP_NOT_FOUND) {
      return { ok: false, error: notFoundError(id) };
    }
    if (!response.ok) {
      return { ok: false, error: httpStatusError(response.status) };
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return { ok: false, error: invalidBodyError() };
    }

    const raw = parsePokemonSpeciesRaw(body);
    if (raw === null) {
      return { ok: false, error: invalidBodyError() };
    }

    return { ok: true, value: mapPokemonSpecies(raw) };
  }

  return { get, list, getSpecies };
}
