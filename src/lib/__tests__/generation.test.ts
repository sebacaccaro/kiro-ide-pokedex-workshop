import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  FIRST_GEN_MAX_ID,
  FIRST_GEN_MIN_ID,
  extractIdFromUrl,
  isFirstGeneration,
  toFirstGenEntries,
} from '../generation';
import type { ResourceReference } from '../../types/pokemon';

// Unit test (esempi) per la logica pura di generazione.
// _Requirements: 1.2, 1.3_

describe('extractIdFromUrl', () => {
  it("estrae l'id numerico da un URL PokéAPI valido", () => {
    expect(extractIdFromUrl('https://pokeapi.co/api/v2/pokemon/25/')).toBe(25);
  });

  it("estrae l'id anche senza slash finale", () => {
    expect(extractIdFromUrl('https://pokeapi.co/api/v2/pokemon/151')).toBe(151);
  });

  it('restituisce null quando l URL non contiene un id numerico', () => {
    expect(extractIdFromUrl('https://pokeapi.co/api/v2/pokemon/')).toBeNull();
  });

  it('restituisce null quando l ultimo segmento non è numerico', () => {
    expect(
      extractIdFromUrl('https://pokeapi.co/api/v2/pokemon/pikachu/'),
    ).toBeNull();
  });
});

describe('isFirstGeneration', () => {
  it('espone i limiti inclusivi 1 e 151 della Prima_Generazione', () => {
    expect(FIRST_GEN_MIN_ID).toBe(1);
    expect(FIRST_GEN_MAX_ID).toBe(151);
  });

  it('è vero sul bordo inferiore (1)', () => {
    expect(isFirstGeneration(1)).toBe(true);
  });

  it('è vero sul bordo superiore (151)', () => {
    expect(isFirstGeneration(151)).toBe(true);
  });

  it('è falso appena sotto il bordo inferiore (0)', () => {
    expect(isFirstGeneration(0)).toBe(false);
  });

  it('è falso appena sopra il bordo superiore (152)', () => {
    expect(isFirstGeneration(152)).toBe(false);
  });
});

describe('toFirstGenEntries', () => {
  const ref = (name: string, id: number | string): ResourceReference => ({
    name,
    url: `https://pokeapi.co/api/v2/pokemon/${id}/`,
  });

  it('arricchisce i riferimenti validi con l id numerico', () => {
    const references: readonly ResourceReference[] = [
      ref('bulbasaur', 1),
      ref('pikachu', 25),
      ref('mew', 151),
    ];

    expect(toFirstGenEntries(references)).toEqual([
      { id: 1, name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon/1/' },
      { id: 25, name: 'pikachu', url: 'https://pokeapi.co/api/v2/pokemon/25/' },
      { id: 151, name: 'mew', url: 'https://pokeapi.co/api/v2/pokemon/151/' },
    ]);
  });

  it('scarta gli id fuori 1..151', () => {
    const references: readonly ResourceReference[] = [
      ref('bulbasaur', 1),
      ref('chikorita', 152),
      ref('mew', 151),
    ];

    expect(toFirstGenEntries(references)).toEqual([
      { id: 1, name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon/1/' },
      { id: 151, name: 'mew', url: 'https://pokeapi.co/api/v2/pokemon/151/' },
    ]);
  });

  it('scarta i riferimenti senza id numerico riconoscibile', () => {
    const references: readonly ResourceReference[] = [
      ref('pikachu', 25),
      ref('senza-id', 'pikachu'),
    ];

    expect(toFirstGenEntries(references)).toEqual([
      { id: 25, name: 'pikachu', url: 'https://pokeapi.co/api/v2/pokemon/25/' },
    ]);
  });

  it('preserva l ordine d ingresso dei riferimenti ammessi', () => {
    const references: readonly ResourceReference[] = [
      ref('mew', 151),
      ref('bulbasaur', 1),
      ref('pikachu', 25),
    ];

    expect(toFirstGenEntries(references).map((entry) => entry.id)).toEqual([
      151, 1, 25,
    ]);
  });
});
// Property-based test (fast-check).
// Feature: pokedex-themed-views, Property 1: Il filtro Prima_Generazione non produce mai id fuori 1..151
describe('toFirstGenEntries (property-based)', () => {
  // Genera un ResourceReference con URL che può contenere un id qualsiasi
  // (inclusi < 1 e > 151), oppure un ultimo segmento non numerico.
  const anyReference: fc.Arbitrary<ResourceReference> = fc
    .record({
      name: fc.string(),
      tail: fc.oneof(
        fc.integer({ min: -1000, max: 1000 }).map((id) => `${id}`),
        fc.constantFrom('pikachu', 'mew', '', 'abc123'),
      ),
    })
    .map(({ name, tail }) => ({
      name,
      url: `https://pokeapi.co/api/v2/pokemon/${tail}/`,
    }));

  it('restituisce solo voci con id in 1..151 preservando l ordine d ingresso ammesso', () => {
    fc.assert(
      fc.property(
        fc.array(anyReference, { maxLength: 50 }),
        (references) => {
          const entries = toFirstGenEntries(references);

          // Ogni voce prodotta ha un id nel range della Prima_Generazione.
          entries.forEach((entry) => {
            expect(entry.id).toBeGreaterThanOrEqual(FIRST_GEN_MIN_ID);
            expect(entry.id).toBeLessThanOrEqual(FIRST_GEN_MAX_ID);
          });

          // L'ordine e il contenuto coincidono con il sottoinsieme dei
          // riferimenti ammessi, calcolato indipendentemente.
          const expected = references
            .map((reference) => ({
              id: extractIdFromUrl(reference.url),
              reference,
            }))
            .filter(
              (candidate): candidate is { id: number; reference: ResourceReference } =>
                candidate.id !== null && isFirstGeneration(candidate.id),
            )
            .map(({ id, reference }) => ({
              id,
              name: reference.name,
              url: reference.url,
            }));

          expect(entries).toEqual(expected);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Property-based test (fast-check).
// Feature: pokedex-themed-views, Property 2: L'estrazione dell'id dall'URL è coerente con la ricostruzione dell'URL
describe('extractIdFromUrl (property-based)', () => {
  it('è un round trip su id -> url -> id per ogni id intero valido', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1_000_000 }), (id) => {
        const url = `https://pokeapi.co/api/v2/pokemon/${id}/`;
        expect(extractIdFromUrl(url)).toBe(id);
      }),
      { numRuns: 100 },
    );
  });
});
