import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PokeApiConfigError } from '../errors';
import {
  createPokeApiClient,
  type FetchFn,
  type FetchResponse,
} from '../pokeApiClient';

// Unit test (esempi) per la creazione del client PokéAPI.
// Fase RED del TDD: descrivono il comportamento atteso di `createPokeApiClient`
// (Base_URL di default, Base_URL esplicito usato come prefisso, e `throw` di
// `PokeApiConfigError` per Base_URL non valido).
// _Requirements: 3.1, 3.2, 3.4, 6.1, 6.2_

// --- Helper mock di FetchFn (riutilizzabile dagli altri test del client) -----

/**
 * Un corpo `PokemonRaw` conforme, sufficiente perché `get` arrivi a comporre e
 * richiedere l'URL senza fallire nel parsing/mapping. I test qui verificano la
 * composizione dell'URL, non la forma del dominio restituito.
 */
const conformingPokemonBody = {
  id: 25,
  name: 'pikachu',
  height: 4,
  weight: 60,
  base_experience: 112,
  abilities: [{ ability: { name: 'static' }, is_hidden: false, slot: 1 }],
  types: [{ slot: 1, type: { name: 'electric' } }],
} as const;

/** Configurazione di una risposta simulata dal mock. */
interface MockResponseConfig {
  readonly ok?: boolean;
  readonly status?: number;
  readonly body?: unknown;
}

/** Un mock di FetchFn che registra gli URL richiesti e risponde in modo configurabile. */
interface MockFetch {
  /** La funzione da iniettare come `fetchFn` nel client. */
  readonly fetchFn: FetchFn;
  /** Gli URL richiesti, nell'ordine in cui sono stati invocati. */
  readonly calls: string[];
  /** L'ultimo URL richiesto, o `undefined` se il mock non è mai stato invocato. */
  readonly lastUrl: () => string | undefined;
}

/**
 * Crea un mock di `FetchFn` che registra ogni URL richiesto e restituisce una
 * `FetchResponse` configurabile. Nessuna rete reale (Requirement 6.1).
 */
function createMockFetch(config: MockResponseConfig = {}): MockFetch {
  const calls: string[] = [];
  const response: FetchResponse = {
    ok: config.ok ?? true,
    status: config.status ?? 200,
    json: () => Promise.resolve(config.body ?? conformingPokemonBody),
  };
  const fetchFn: FetchFn = (input) => {
    calls.push(input);
    return Promise.resolve(response);
  };
  return {
    fetchFn,
    calls,
    lastUrl: () => calls.at(-1),
  };
}

/**
 * Crea un mock di `FetchFn` che rigetta sempre, per simulare un errore di rete
 * o un abort per timeout. Registra comunque gli URL richiesti.
 */
function createRejectingFetch(
  reason: Error = new Error('errore di rete'),
): MockFetch {
  const calls: string[] = [];
  const fetchFn: FetchFn = (input) => {
    calls.push(input);
    return Promise.reject(reason);
  };
  return {
    fetchFn,
    calls,
    lastUrl: () => calls.at(-1),
  };
}

// --- Test ---------------------------------------------------------------------

describe('createPokeApiClient', () => {
  it('usa il Base_URL di default https://pokeapi.co/api/v2/ quando non specificato', async () => {
    const mock = createMockFetch();
    const client = createPokeApiClient({ fetchFn: mock.fetchFn });

    await client.get(25);

    expect(mock.lastUrl()).toBeDefined();
    expect(mock.lastUrl()).toContain('https://pokeapi.co/api/v2/');
    expect(mock.lastUrl()?.startsWith('https://pokeapi.co/api/v2/')).toBe(true);
  });

  it('usa il Base_URL esplicito come prefisso di ogni richiesta', async () => {
    const mock = createMockFetch();
    const client = createPokeApiClient({
      baseUrl: 'http://localhost/api/v2/',
      fetchFn: mock.fetchFn,
    });

    await client.get(25);

    expect(mock.lastUrl()?.startsWith('http://localhost/api/v2/')).toBe(true);
  });

  it('unisce Base_URL senza slash finale e percorso con un singolo separatore', async () => {
    const mock = createMockFetch();
    const client = createPokeApiClient({
      baseUrl: 'http://localhost/api/v2',
      fetchFn: mock.fetchFn,
    });

    await client.get(25);

    expect(mock.lastUrl()).toBe('http://localhost/api/v2/pokemon/25');
  });

  it('effettua le richieste tramite la fetchFn iniettata (nessuna rete reale)', async () => {
    const mock = createMockFetch();
    const client = createPokeApiClient({ fetchFn: mock.fetchFn });

    await client.get(1);

    expect(mock.calls).toHaveLength(1);
  });

  it('solleva PokeApiConfigError per un Base_URL vuoto', () => {
    expect(() => createPokeApiClient({ baseUrl: '' })).toThrow(
      PokeApiConfigError,
    );
  });

  it('solleva PokeApiConfigError per un Base_URL di soli spazi', () => {
    expect(() => createPokeApiClient({ baseUrl: '   ' })).toThrow(
      PokeApiConfigError,
    );
  });

  it('solleva PokeApiConfigError per un Base_URL senza schema', () => {
    expect(() => createPokeApiClient({ baseUrl: 'pokeapi.co/api/v2' })).toThrow(
      PokeApiConfigError,
    );
  });

  it('solleva PokeApiConfigError per un Base_URL con schema ma senza host', () => {
    expect(() => createPokeApiClient({ baseUrl: 'http://' })).toThrow(
      PokeApiConfigError,
    );
  });

  it('non solleva per un Base_URL valido', () => {
    expect(() =>
      createPokeApiClient({ baseUrl: 'https://pokeapi.co/api/v2/' }),
    ).not.toThrow();
  });

  it('espone un mock di fetch che può anche rigettare (helper riutilizzabile)', () => {
    const mock = createRejectingFetch();
    expect(mock.calls).toHaveLength(0);
    expect(typeof mock.fetchFn).toBe('function');
  });
});

// --- Test get/list: happy path ed errori --------------------------------------
// Fase RED del TDD per il task 10.3. Descrivono il comportamento osservabile di
// `get` e `list`: composizione URL, mappatura al dominio, e traduzione di ogni
// scenario di fallimento nella categoria di errore corretta. Riusano gli helper
// mock `createMockFetch`/`createRejectingFetch` definiti sopra.
// _Requirements: 1.1-1.7, 2.1-2.7, 4.1-4.4_

/** Un corpo `PokemonListPageRaw` conforme per i test della LIST. */
const conformingListBody = {
  count: 1302,
  next: 'https://pokeapi.co/api/v2/pokemon?offset=20&limit=20',
  previous: null,
  results: [
    { name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon/1/' },
    { name: 'ivysaur', url: 'https://pokeapi.co/api/v2/pokemon/2/' },
  ],
} as const;

describe('PokeApiClient.get', () => {
  it('compone l URL corretto per un identificatore numerico', async () => {
    const mock = createMockFetch({ body: conformingPokemonBody });
    const client = createPokeApiClient({
      baseUrl: 'http://localhost/api/v2/',
      fetchFn: mock.fetchFn,
    });

    await client.get(25);

    expect(mock.lastUrl()).toBe('http://localhost/api/v2/pokemon/25');
  });

  it('normalizza in minuscolo l identificatore testuale nell URL', async () => {
    const mock = createMockFetch({ body: conformingPokemonBody });
    const client = createPokeApiClient({
      baseUrl: 'http://localhost/api/v2/',
      fetchFn: mock.fetchFn,
    });

    await client.get('PIKACHU');

    expect(mock.lastUrl()).toBe('http://localhost/api/v2/pokemon/pikachu');
  });

  it('restituisce il Pokémon di dominio per una risposta 200 conforme', async () => {
    const mock = createMockFetch({
      ok: true,
      status: 200,
      body: conformingPokemonBody,
    });
    const client = createPokeApiClient({ fetchFn: mock.fetchFn });

    const result = await client.get(25);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({
        id: 25,
        name: 'pikachu',
        height: 4,
        weight: 60,
        baseExperience: 112,
        abilities: [{ name: 'static', isHidden: false, slot: 1 }],
        types: [{ slot: 1, name: 'electric' }],
      });
    }
  });

  it('restituisce "risorsa non trovata" con stato 404 e identificatore per un 404', async () => {
    const mock = createMockFetch({ ok: false, status: 404 });
    const client = createPokeApiClient({ fetchFn: mock.fetchFn });

    const result = await client.get(99999);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe('risorsa non trovata');
      expect(result.error.httpStatus).toBe(404);
      expect(result.error.identifier).toBe(99999);
    }
  });

  it('restituisce "risposta HTTP non valida" con lo stato per un non-2xx diverso da 404', async () => {
    const mock = createMockFetch({ ok: false, status: 500 });
    const client = createPokeApiClient({ fetchFn: mock.fetchFn });

    const result = await client.get(25);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe('risposta HTTP non valida');
      expect(result.error.httpStatus).toBe(500);
    }
  });

  it('restituisce "errore di rete" quando la fetch rigetta', async () => {
    const mock = createRejectingFetch();
    const client = createPokeApiClient({ fetchFn: mock.fetchFn });

    const result = await client.get(25);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe('errore di rete');
    }
  });

  it('restituisce "risposta HTTP non valida" per un corpo 2xx non conforme', async () => {
    const mock = createMockFetch({ ok: true, status: 200, body: { id: 25 } });
    const client = createPokeApiClient({ fetchFn: mock.fetchFn });

    const result = await client.get(25);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe('risposta HTTP non valida');
    }
  });

  it('rifiuta un identificatore non valido con "parametri non validi" senza invocare fetch', async () => {
    const mock = createMockFetch();
    const client = createPokeApiClient({ fetchFn: mock.fetchFn });

    const result = await client.get(0);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe('parametri non validi');
    }
    expect(mock.calls).toHaveLength(0);
  });
});

describe('PokeApiClient.list', () => {
  it('compone l URL con i parametri limit e offset espliciti', async () => {
    const mock = createMockFetch({ body: conformingListBody });
    const client = createPokeApiClient({
      baseUrl: 'http://localhost/api/v2/',
      fetchFn: mock.fetchFn,
    });

    await client.list({ limit: 50, offset: 100 });

    expect(mock.lastUrl()).toBe(
      'http://localhost/api/v2/pokemon?limit=50&offset=100',
    );
  });

  it('usa i default limit=20 e offset=0 quando i parametri non sono forniti', async () => {
    const mock = createMockFetch({ body: conformingListBody });
    const client = createPokeApiClient({
      baseUrl: 'http://localhost/api/v2/',
      fetchFn: mock.fetchFn,
    });

    await client.list();

    expect(mock.lastUrl()).toBe(
      'http://localhost/api/v2/pokemon?limit=20&offset=0',
    );
  });

  it('restituisce la Pagina_LIST di dominio per una risposta conforme', async () => {
    const mock = createMockFetch({
      ok: true,
      status: 200,
      body: conformingListBody,
    });
    const client = createPokeApiClient({ fetchFn: mock.fetchFn });

    const result = await client.list({ limit: 20, offset: 0 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({
        count: 1302,
        next: 'https://pokeapi.co/api/v2/pokemon?offset=20&limit=20',
        previous: null,
        results: [
          { name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon/1/' },
          { name: 'ivysaur', url: 'https://pokeapi.co/api/v2/pokemon/2/' },
        ],
      });
    }
  });

  it('restituisce "risposta HTTP non valida" con lo stato per un non-2xx', async () => {
    const mock = createMockFetch({ ok: false, status: 503 });
    const client = createPokeApiClient({ fetchFn: mock.fetchFn });

    const result = await client.list({ limit: 20, offset: 0 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe('risposta HTTP non valida');
      expect(result.error.httpStatus).toBe(503);
    }
  });

  it('restituisce "errore di rete" quando la fetch rigetta', async () => {
    const mock = createRejectingFetch();
    const client = createPokeApiClient({ fetchFn: mock.fetchFn });

    const result = await client.list();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe('errore di rete');
    }
  });

  it('restituisce "risposta HTTP non valida" per un corpo 2xx non conforme', async () => {
    const mock = createMockFetch({
      ok: true,
      status: 200,
      body: { count: 'non un numero' },
    });
    const client = createPokeApiClient({ fetchFn: mock.fetchFn });

    const result = await client.list();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe('risposta HTTP non valida');
    }
  });

  it('rifiuta una paginazione non valida con "parametri non validi" senza invocare fetch', async () => {
    const mock = createMockFetch();
    const client = createPokeApiClient({ fetchFn: mock.fetchFn });

    const result = await client.list({ limit: 0, offset: 0 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe('parametri non validi');
    }
    expect(mock.calls).toHaveLength(0);
  });

  it('rifiuta un offset negativo con "parametri non validi" senza invocare fetch', async () => {
    const mock = createMockFetch();
    const client = createPokeApiClient({ fetchFn: mock.fetchFn });

    const result = await client.list({ limit: 20, offset: -1 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe('parametri non validi');
    }
    expect(mock.calls).toHaveLength(0);
  });
});

// --- Test timeout: AbortController + cancellazione del timer ------------------
// Verifica il comportamento del timeout con timer fake (design "Testing
// Strategy"): allo scadere del timeout l'abort provoca il rigetto della fetch
// tradotto in "errore di rete", e il timer viene sempre cancellato al
// completamento (nessun timer pendente su risposta rapida).
// _Requirements: 1.7, 4.3_

/**
 * Crea un mock di `FetchFn` la cui promise resta pendente finché l'`AbortSignal`
 * iniettato non viene abortito, momento in cui rigetta (come farebbe `fetch`
 * reale su abort). Serve a simulare una richiesta che supera il timeout.
 */
function createAbortableFetch(): MockFetch {
  const calls: string[] = [];
  const fetchFn: FetchFn = (input, init) =>
    new Promise<FetchResponse>((_resolve, reject) => {
      calls.push(input);
      const signal = init?.signal;
      if (signal === undefined) {
        return;
      }
      signal.addEventListener('abort', () => {
        reject(new DOMException('The operation was aborted.', 'AbortError'));
      });
    });
  return {
    fetchFn,
    calls,
    lastUrl: () => calls.at(-1),
  };
}

describe('PokeApiClient — timeout e gestione del timer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('restituisce "errore di rete" quando la richiesta supera il timeout (abort)', async () => {
    const mock = createAbortableFetch();
    const client = createPokeApiClient({
      fetchFn: mock.fetchFn,
      timeoutMs: 10_000,
    });

    const resultPromise = client.get(25);
    // Prima dello scadere del timeout la fetch è ancora pendente.
    await vi.advanceTimersByTimeAsync(10_000);
    const result = await resultPromise;

    expect(mock.calls).toHaveLength(1);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe('errore di rete');
    }
  });

  it('non lascia timer pendenti dopo una risposta rapida (clearTimeout)', async () => {
    const mock = createMockFetch({ body: conformingPokemonBody });
    const client = createPokeApiClient({
      fetchFn: mock.fetchFn,
      timeoutMs: 10_000,
    });

    const result = await client.get(25);

    expect(result.ok).toBe(true);
    // Se il timer fosse stato cancellato correttamente non resta nulla in coda.
    expect(vi.getTimerCount()).toBe(0);
  });

  it('non lascia timer pendenti anche quando la fetch rigetta (clearTimeout nel finally)', async () => {
    const mock = createRejectingFetch();
    const client = createPokeApiClient({
      fetchFn: mock.fetchFn,
      timeoutMs: 10_000,
    });

    const result = await client.get(25);

    expect(result.ok).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
});
