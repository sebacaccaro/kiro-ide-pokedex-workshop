import { describe, expect, it } from 'vitest';

import {
  isValidBaseUrl,
  validateIdentifier,
  validatePagination,
} from '../validation';

// Unit test (esempi) per la validazione dei parametri (funzioni pure).
// _Requirements: 1.1, 1.2, 1.5, 2.4, 2.5, 3.4_

describe('validateIdentifier', () => {
  it('accetta un id intero minimo (1) e lo restituisce come stringa', () => {
    const result = validateIdentifier(1);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe('1');
    }
  });

  it('accetta un id intero massimo (100000)', () => {
    const result = validateIdentifier(100000);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe('100000');
    }
  });

  it('accetta un id intero intermedio', () => {
    const result = validateIdentifier(25);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe('25');
    }
  });

  it('accetta un nome non vuoto e lo normalizza in minuscolo', () => {
    const result = validateIdentifier('Pikachu');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe('pikachu');
    }
  });

  it('accetta un nome gia in minuscolo lasciandolo invariato', () => {
    const result = validateIdentifier('bulbasaur');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe('bulbasaur');
    }
  });

  it('accetta una stringa lunga esattamente 100 caratteri', () => {
    const name = 'a'.repeat(100);
    const result = validateIdentifier(name);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(name);
    }
  });

  it('rifiuta un id intero pari a 0 come parametro non valido', () => {
    const result = validateIdentifier(0);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe('parametri non validi');
    }
  });

  it('rifiuta un id intero negativo', () => {
    const result = validateIdentifier(-5);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe('parametri non validi');
    }
  });

  it('rifiuta un id intero superiore a 100000', () => {
    const result = validateIdentifier(100001);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe('parametri non validi');
    }
  });

  it('rifiuta un numero non intero', () => {
    const result = validateIdentifier(1.5);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe('parametri non validi');
    }
  });

  it('rifiuta una stringa vuota', () => {
    const result = validateIdentifier('');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe('parametri non validi');
    }
  });

  it('rifiuta una stringa di soli spazi', () => {
    const result = validateIdentifier('   ');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe('parametri non validi');
    }
  });

  it('rifiuta una stringa piu lunga di 100 caratteri', () => {
    const result = validateIdentifier('a'.repeat(101));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe('parametri non validi');
    }
  });
});

describe('validatePagination', () => {
  it('usa i default limit=20 e offset=0 quando i parametri sono assenti', () => {
    const result = validatePagination();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ limit: 20, offset: 0 });
    }
  });

  it('usa i default quando viene passato un oggetto vuoto', () => {
    const result = validatePagination({});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ limit: 20, offset: 0 });
    }
  });

  it('applica il default solo su offset quando manca', () => {
    const result = validatePagination({ limit: 50 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ limit: 50, offset: 0 });
    }
  });

  it('applica il default solo su limit quando manca', () => {
    const result = validatePagination({ offset: 40 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ limit: 20, offset: 40 });
    }
  });

  it('accetta i valori limite validi (limit=1, offset=0)', () => {
    const result = validatePagination({ limit: 1, offset: 0 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ limit: 1, offset: 0 });
    }
  });

  it('accetta il limite massimo (limit=100)', () => {
    const result = validatePagination({ limit: 100, offset: 200 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ limit: 100, offset: 200 });
    }
  });

  it('rifiuta un limit minore di 1', () => {
    const result = validatePagination({ limit: 0 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe('parametri non validi');
    }
  });

  it('rifiuta un limit maggiore di 100', () => {
    const result = validatePagination({ limit: 101 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe('parametri non validi');
    }
  });

  it('rifiuta un offset negativo', () => {
    const result = validatePagination({ offset: -1 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe('parametri non validi');
    }
  });

  it('rifiuta un limit non intero', () => {
    const result = validatePagination({ limit: 10.5 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe('parametri non validi');
    }
  });

  it('rifiuta un offset non intero', () => {
    const result = validatePagination({ offset: 3.14 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe('parametri non validi');
    }
  });
});

describe('isValidBaseUrl', () => {
  it('accetta un URL https con host', () => {
    expect(isValidBaseUrl('https://pokeapi.co/api/v2/')).toBe(true);
  });

  it('accetta un URL http con host', () => {
    expect(isValidBaseUrl('http://localhost/api/v2/')).toBe(true);
  });

  it('accetta un URL http con host e porta', () => {
    expect(isValidBaseUrl('http://localhost:8080/api/v2')).toBe(true);
  });

  it('rifiuta una stringa vuota', () => {
    expect(isValidBaseUrl('')).toBe(false);
  });

  it('rifiuta una stringa di soli spazi', () => {
    expect(isValidBaseUrl('   ')).toBe(false);
  });

  it('rifiuta un URL senza schema', () => {
    expect(isValidBaseUrl('pokeapi.co/api/v2')).toBe(false);
  });

  it('rifiuta uno schema diverso da http/https', () => {
    expect(isValidBaseUrl('ftp://pokeapi.co/api/v2')).toBe(false);
  });

  it('rifiuta un URL con schema ma senza host', () => {
    expect(isValidBaseUrl('http://')).toBe(false);
  });
});
