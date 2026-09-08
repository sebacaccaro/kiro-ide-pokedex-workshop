import { describe, expect, it } from 'vitest';

import {
  PokeApiConfigError,
  type PokeApiError,
  type PokeApiErrorCategory,
  type Result,
} from '../errors';

describe('Result discriminato', () => {
  it('rappresenta il successo con ok=true e un valore', () => {
    const success: Result<number> = { ok: true, value: 42 };

    expect(success.ok).toBe(true);
    if (success.ok) {
      expect(success.value).toBe(42);
    }
  });

  it('rappresenta il fallimento con ok=false e un errore', () => {
    const error: PokeApiError = {
      category: 'errore di rete',
      message: 'connessione non riuscita',
    };
    const failure: Result<number> = { ok: false, error };

    expect(failure.ok).toBe(false);
    if (!failure.ok) {
      expect(failure.error).toBe(error);
    }
  });

  it('discrimina i due rami sul campo ok', () => {
    const results: readonly Result<string>[] = [
      { ok: true, value: 'bulbasaur' },
      {
        ok: false,
        error: {
          category: 'risorsa non trovata',
          message: 'non trovato',
          httpStatus: 404,
        },
      },
    ];

    const values = results.map((result) =>
      result.ok ? result.value : result.error.category,
    );

    expect(values).toEqual(['bulbasaur', 'risorsa non trovata']);
  });
});

describe('PokeApiErrorCategory', () => {
  it('ammette esattamente le quattro categorie previste', () => {
    const categories: readonly PokeApiErrorCategory[] = [
      'risorsa non trovata',
      'risposta HTTP non valida',
      'parametri non validi',
      'errore di rete',
    ];

    expect(new Set(categories).size).toBe(4);
  });

  it('espone la categoria e il messaggio su un PokeApiError', () => {
    const error: PokeApiError = {
      category: 'parametri non validi',
      message: 'identificatore non valido',
    };

    expect(error.category).toBe('parametri non validi');
    expect(error.message).toBe('identificatore non valido');
  });

  it('espone httpStatus e identifier come campi opzionali', () => {
    const error: PokeApiError = {
      category: 'risorsa non trovata',
      message: 'risorsa non trovata',
      httpStatus: 404,
      identifier: 'mewtwo',
    };

    expect(error.httpStatus).toBe(404);
    expect(error.identifier).toBe('mewtwo');
  });
});

describe('PokeApiConfigError', () => {
  it('è una sottoclasse di Error', () => {
    const error = new PokeApiConfigError('Base URL non valido');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(PokeApiConfigError);
  });

  it('conserva il messaggio passato al costruttore', () => {
    const error = new PokeApiConfigError('Base URL non valido');

    expect(error.message).toBe('Base URL non valido');
  });
});
