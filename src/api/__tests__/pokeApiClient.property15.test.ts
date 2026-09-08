import fc from 'fast-check';

import { describe, expect, it } from 'vitest';

import { PokeApiConfigError } from '../errors';
import { createPokeApiClient } from '../pokeApiClient';

// Property-based test (fast-check).
// Feature: pokeapi-client, Property 15: Creazione rifiutata per Base_URL non valido
// Validates: Requirements 3.4
//
// Per ogni stringa Base_URL non valida (vuota, composta solo da spazi, priva di
// schema http/https o priva di host), `createPokeApiClient` solleva un
// `PokeApiConfigError` e non produce un'istanza utilizzabile.

// Stringhe vuote o composte solo da spazi bianchi.
const emptyOrWhitespace: fc.Arbitrary<string> = fc.oneof(
  fc.constant(''),
  fc
    .array(fc.constantFrom(' ', '\t', '\n', '\r', '\f'), {
      minLength: 1,
      maxLength: 10,
    })
    .map((chars) => chars.join('')),
);

// Stringhe prive di schema http/https: un host plausibile ma senza "http://".
// Include stringhe senza alcuno schema e schemi diversi da http(s).
const missingScheme: fc.Arbitrary<string> = fc.oneof(
  fc.domain().map((host) => host), // es. "example.com" senza schema
  fc.domain().map((host) => `//${host}`),
  fc.domain().map((host) => `www.${host}`),
  fc.domain().map((host) => `ftp://${host}`),
  fc.domain().map((host) => `file://${host}`),
);

// URL con schema http(s) ma privi di host: solo lo schema, eventualmente
// seguito da query o frammento ma senza autorità. Il parser URL rigetta questi
// casi perché manca del tutto l'host.
const missingHost: fc.Arbitrary<string> = fc.oneof(
  fc.constantFrom('http://', 'https://'),
  fc.constantFrom('http://?q=1', 'https://?q=1'),
  fc.constantFrom('http://#frag', 'https://#frag'),
);

// Generatore complessivo di Base_URL non validi.
const invalidBaseUrl: fc.Arbitrary<string> = fc.oneof(
  emptyOrWhitespace,
  missingScheme,
  missingHost,
);

describe('createPokeApiClient — Base_URL non valido (property-based)', () => {
  it('solleva PokeApiConfigError per ogni Base_URL non valido, senza creare un istanza', () => {
    fc.assert(
      fc.property(invalidBaseUrl, (baseUrl) => {
        expect(() => createPokeApiClient({ baseUrl })).toThrow(
          PokeApiConfigError,
        );
      }),
      { numRuns: 100 },
    );
  });
});
