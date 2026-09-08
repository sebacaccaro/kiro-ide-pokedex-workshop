import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { buildQuery, buildUrl } from '../url';

// Unit test (esempi) per la composizione URL (funzioni pure).
// _Requirements: 3.3, 2.1_
describe('buildUrl', () => {
  it('unisce base URL e segmento con un singolo "/" quando nessuno ha slash', () => {
    expect(buildUrl('https://pokeapi.co/api/v2', 'pokemon')).toBe(
      'https://pokeapi.co/api/v2/pokemon',
    );
  });

  it('non duplica lo slash quando il base URL termina con "/"', () => {
    expect(buildUrl('https://pokeapi.co/api/v2/', 'pokemon')).toBe(
      'https://pokeapi.co/api/v2/pokemon',
    );
  });

  it('non duplica lo slash quando il segmento inizia con "/"', () => {
    expect(buildUrl('https://pokeapi.co/api/v2', '/pokemon')).toBe(
      'https://pokeapi.co/api/v2/pokemon',
    );
  });

  it('inserisce un solo "/" quando sia base URL che segmento hanno slash', () => {
    expect(buildUrl('https://pokeapi.co/api/v2/', '/pokemon')).toBe(
      'https://pokeapi.co/api/v2/pokemon',
    );
  });

  it('unisce più segmenti con un singolo separatore ciascuno', () => {
    expect(buildUrl('https://pokeapi.co/api/v2', 'pokemon', '25')).toBe(
      'https://pokeapi.co/api/v2/pokemon/25',
    );
  });

  it('normalizza gli slash tra più segmenti a prescindere da quelli iniziali/finali', () => {
    expect(buildUrl('https://pokeapi.co/api/v2/', '/pokemon/', '/25/')).toBe(
      'https://pokeapi.co/api/v2/pokemon/25',
    );
  });

  it('preserva il "//" dello schema del base URL', () => {
    expect(buildUrl('http://localhost/api/v2', 'pokemon')).toBe(
      'http://localhost/api/v2/pokemon',
    );
  });
});

describe('buildQuery', () => {
  it('serializza una coppia chiave/valore come "chiave=valore"', () => {
    expect(buildQuery({ limit: 20 })).toBe('limit=20');
  });

  it('serializza più parametri unendoli con "&"', () => {
    expect(buildQuery({ limit: 20, offset: 40 })).toBe('limit=20&offset=40');
  });

  it('ordina i parametri per chiave in modo deterministico', () => {
    expect(buildQuery({ offset: 40, limit: 20 })).toBe('limit=20&offset=40');
  });

  it('produce lo stesso risultato indipendentemente dall ordine di inserimento', () => {
    const a = buildQuery({ limit: 20, offset: 0 });
    const b = buildQuery({ offset: 0, limit: 20 });
    expect(a).toBe(b);
  });

  it('accetta valori stringa oltre a quelli numerici', () => {
    expect(buildQuery({ name: 'pikachu' })).toBe('name=pikachu');
  });

  it('restituisce una stringa vuota quando non ci sono parametri', () => {
    expect(buildQuery({})).toBe('');
  });
});

// Property-based test (fast-check).
// Feature: pokeapi-client, Property 1: Composizione URL con separatore singolo
// Validates: Requirements 3.3
describe('buildUrl (property-based)', () => {
  // Genera un base URL assoluto http(s) valido con host e path opzionale,
  // eventualmente con uno o piu "/" finali.
  const validBaseUrl: fc.Arbitrary<string> = fc
    .record({
      scheme: fc.constantFrom('http', 'https'),
      host: fc.constantFrom(
        'pokeapi.co',
        'localhost',
        'example.com',
        'api.example.org',
      ),
      path: fc.array(fc.constantFrom('api', 'v2', 'rest', 'data'), {
        maxLength: 3,
      }),
      trailingSlashes: fc.integer({ min: 0, max: 3 }),
    })
    .map(({ scheme, host, path, trailingSlashes }) => {
      const base =
        path.length > 0
          ? `${scheme}://${host}/${path.join('/')}`
          : `${scheme}://${host}`;
      return `${base}${'/'.repeat(trailingSlashes)}`;
    });

  // Un singolo segmento non vuoto, eventualmente circondato da "/" iniziali/finali.
  const segmentWithSlashes: fc.Arbitrary<string> = fc
    .record({
      core: fc.constantFrom('pokemon', 'ability', '25', 'pikachu', 'type'),
      leading: fc.integer({ min: 0, max: 3 }),
      trailing: fc.integer({ min: 0, max: 3 }),
    })
    .map(
      ({ core, leading, trailing }) =>
        `${'/'.repeat(leading)}${core}${'/'.repeat(trailing)}`,
    );

  it('unisce base URL e segmenti con esattamente un singolo "/" senza introdurre "//"', () => {
    fc.assert(
      fc.property(
        validBaseUrl,
        fc.array(segmentWithSlashes, { minLength: 1, maxLength: 4 }),
        (baseUrl, segments) => {
          const url = buildUrl(baseUrl, ...segments);

          // Isola la parte dopo lo schema per non contare il "//" dello schema.
          const schemeMatch = /^https?:\/\//.exec(url);
          expect(schemeMatch).not.toBeNull();
          const schemePrefix = schemeMatch === null ? '' : schemeMatch[0];
          const afterScheme = url.slice(schemePrefix.length);

          // Nessun "//" oltre a quello dello schema: nessun separatore doppio.
          expect(afterScheme).not.toContain('//');

          // Il separatore non viene omesso: base normalizzato + un "/" + segmenti
          // normalizzati uniti da "/".
          const expectedBase = baseUrl.replace(/\/+$/, '');
          const expectedSegments = segments.map((segment) =>
            segment.replace(/^\/+|\/+$/g, ''),
          );
          const expected = [expectedBase, ...expectedSegments].join('/');
          expect(url).toBe(expected);
        },
      ),
      { numRuns: 100 },
    );
  });
});
