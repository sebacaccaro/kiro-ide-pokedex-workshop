import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import type { Pokemon, PokemonListPage } from '../../types/pokemon';
import { mapListPage, mapPokemon } from '../mappers';
import type {
  AbilityEntryRaw,
  PokemonListPageRaw,
  PokemonRaw,
  TypeEntryRaw,
} from '../raw';

// Unit test (esempi) per le funzioni pure di mapping Raw (snake_case) verso i
// tipi di dominio (camelCase). Verificano la traduzione dei nomi dei campi e la
// preservazione dei valori, senza toccare la rete.
// _Requirements: 1.3, 5.4, 2.2, 2.3_

describe('mapPokemon', () => {
  it('traduce base_experience nel campo di dominio baseExperience', () => {
    const raw: PokemonRaw = {
      id: 25,
      name: 'pikachu',
      height: 4,
      weight: 60,
      base_experience: 112,
      abilities: [{ ability: { name: 'static' }, is_hidden: false, slot: 1 }],
      types: [{ slot: 1, type: { name: 'electric' } }],
    };

    const result = mapPokemon(raw);

    expect(result.baseExperience).toBe(112);
  });

  it('preserva i campi scalari id, name, height e weight', () => {
    const raw: PokemonRaw = {
      id: 6,
      name: 'charizard',
      height: 17,
      weight: 905,
      base_experience: 267,
      abilities: [{ ability: { name: 'blaze' }, is_hidden: false, slot: 1 }],
      types: [{ slot: 1, type: { name: 'fire' } }],
    };

    const result = mapPokemon(raw);

    expect(result.id).toBe(6);
    expect(result.name).toBe('charizard');
    expect(result.height).toBe(17);
    expect(result.weight).toBe(905);
  });

  it('mappa ogni abilità traducendo ability.name in name e is_hidden in isHidden, preservando slot', () => {
    const raw: PokemonRaw = {
      id: 25,
      name: 'pikachu',
      height: 4,
      weight: 60,
      base_experience: 112,
      abilities: [
        { ability: { name: 'static' }, is_hidden: false, slot: 1 },
        { ability: { name: 'lightning-rod' }, is_hidden: true, slot: 3 },
      ],
      types: [{ slot: 1, type: { name: 'electric' } }],
    };

    const result = mapPokemon(raw);

    expect(result.abilities).toEqual([
      { name: 'static', isHidden: false, slot: 1 },
      { name: 'lightning-rod', isHidden: true, slot: 3 },
    ]);
  });

  it('mappa ogni tipo traducendo type.name in name e preservando slot', () => {
    const raw: PokemonRaw = {
      id: 1,
      name: 'bulbasaur',
      height: 7,
      weight: 69,
      base_experience: 64,
      abilities: [{ ability: { name: 'overgrow' }, is_hidden: false, slot: 1 }],
      types: [
        { slot: 1, type: { name: 'grass' } },
        { slot: 2, type: { name: 'poison' } },
      ],
    };

    const result = mapPokemon(raw);

    expect(result.types).toEqual([
      { slot: 1, name: 'grass' },
      { slot: 2, name: 'poison' },
    ]);
  });

  it('produce un Pokemon di dominio completo dalla forma grezza', () => {
    const raw: PokemonRaw = {
      id: 25,
      name: 'pikachu',
      height: 4,
      weight: 60,
      base_experience: 112,
      abilities: [
        { ability: { name: 'static' }, is_hidden: false, slot: 1 },
        { ability: { name: 'lightning-rod' }, is_hidden: true, slot: 3 },
      ],
      types: [{ slot: 1, type: { name: 'electric' } }],
    };

    const result = mapPokemon(raw);

    const expected: Pokemon = {
      id: 25,
      name: 'pikachu',
      height: 4,
      weight: 60,
      baseExperience: 112,
      abilities: [
        { name: 'static', isHidden: false, slot: 1 },
        { name: 'lightning-rod', isHidden: true, slot: 3 },
      ],
      types: [{ slot: 1, name: 'electric' }],
    };
    expect(result).toEqual(expected);
  });
});

describe('mapListPage', () => {
  it('preserva count, next e previous dalla forma grezza', () => {
    const raw: PokemonListPageRaw = {
      count: 1302,
      next: 'https://pokeapi.co/api/v2/pokemon?offset=20&limit=20',
      previous: null,
      results: [],
    };

    const result = mapListPage(raw);

    expect(result.count).toBe(1302);
    expect(result.next).toBe(
      'https://pokeapi.co/api/v2/pokemon?offset=20&limit=20',
    );
    expect(result.previous).toBeNull();
  });

  it('preserva ogni riferimento con name e url', () => {
    const raw: PokemonListPageRaw = {
      count: 1302,
      next: null,
      previous: null,
      results: [
        { name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon/1/' },
        { name: 'ivysaur', url: 'https://pokeapi.co/api/v2/pokemon/2/' },
      ],
    };

    const result = mapListPage(raw);

    expect(result.results).toEqual([
      { name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon/1/' },
      { name: 'ivysaur', url: 'https://pokeapi.co/api/v2/pokemon/2/' },
    ]);
  });

  it('produce una PokemonListPage di dominio completa dalla forma grezza', () => {
    const raw: PokemonListPageRaw = {
      count: 2,
      next: 'https://pokeapi.co/api/v2/pokemon?offset=2&limit=2',
      previous: 'https://pokeapi.co/api/v2/pokemon?offset=0&limit=2',
      results: [
        { name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon/1/' },
        { name: 'ivysaur', url: 'https://pokeapi.co/api/v2/pokemon/2/' },
      ],
    };

    const result = mapListPage(raw);

    const expected: PokemonListPage = {
      count: 2,
      next: 'https://pokeapi.co/api/v2/pokemon?offset=2&limit=2',
      previous: 'https://pokeapi.co/api/v2/pokemon?offset=0&limit=2',
      results: [
        { name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon/1/' },
        { name: 'ivysaur', url: 'https://pokeapi.co/api/v2/pokemon/2/' },
      ],
    };
    expect(result).toEqual(expected);
  });
});

// Property-based test (fast-check).
// Feature: pokeapi-client, Property 3: Mapping GET Raw → dominio
// Validates: Requirements 1.3, 5.4
describe('mapPokemon (property-based)', () => {
  // Nome di risorsa non vuoto (stile PokéAPI: minuscolo con eventuali trattini).
  const resourceName: fc.Arbitrary<string> = fc
    .string({ minLength: 1, maxLength: 20 })
    .map((s) => s.replace(/[^a-z0-9-]/gi, 'a').toLowerCase())
    .filter((s) => s.length > 0);

  // Genera un AbilityEntryRaw conforme.
  const abilityEntryRaw: fc.Arbitrary<AbilityEntryRaw> = fc.record({
    ability: fc.record({ name: resourceName }),
    is_hidden: fc.boolean(),
    slot: fc.integer({ min: 1, max: 10 }),
  });

  // Genera un TypeEntryRaw conforme.
  const typeEntryRaw: fc.Arbitrary<TypeEntryRaw> = fc.record({
    slot: fc.integer({ min: 1, max: 10 }),
    type: fc.record({ name: resourceName }),
  });

  // Genera un PokemonRaw valido (strutture conformi al confine di rete).
  const pokemonRaw: fc.Arbitrary<PokemonRaw> = fc.record({
    id: fc.integer({ min: 1, max: 100000 }),
    name: resourceName,
    height: fc.integer({ min: 0, max: 1000 }),
    weight: fc.integer({ min: 0, max: 100000 }),
    base_experience: fc.integer({ min: 0, max: 1000 }),
    abilities: fc.array(abilityEntryRaw, { maxLength: 5 }),
    types: fc.array(typeEntryRaw, { minLength: 1, maxLength: 2 }),
  });

  it('preserva id/name/height/weight, mappa base_experience e abilità/tipi per ogni PokemonRaw valido', () => {
    fc.assert(
      fc.property(pokemonRaw, (raw) => {
        const result = mapPokemon(raw);

        // Campi scalari preservati dalla sorgente.
        expect(result.id).toBe(raw.id);
        expect(result.name).toBe(raw.name);
        expect(result.height).toBe(raw.height);
        expect(result.weight).toBe(raw.weight);

        // base_experience (snake_case) -> baseExperience (camelCase).
        expect(result.baseExperience).toBe(raw.base_experience);

        // Le abilità preservano name, slot e isHidden dai campi grezzi.
        expect(result.abilities).toEqual(
          raw.abilities.map((entry) => ({
            name: entry.ability.name,
            isHidden: entry.is_hidden,
            slot: entry.slot,
          })),
        );

        // I tipi preservano name e slot dai campi grezzi.
        expect(result.types).toEqual(
          raw.types.map((entry) => ({
            slot: entry.slot,
            name: entry.type.name,
          })),
        );
      }),
      { numRuns: 100 },
    );
  });
});

// Generatore di una LIST Raw conforme, parametrizzata su `limit`: produce una
// pagina il cui numero di `results` è al più `limit`, con `name`/`url` non
// vuoti in ogni riferimento. Ritorna la coppia (limit, pagina) così che la
// proprietà possa verificare l'invariante "results.length <= limit".
const listPageRaw: fc.Arbitrary<{
  limit: number;
  raw: PokemonListPageRaw;
}> = fc.integer({ min: 1, max: 100 }).chain((limit) =>
  fc
    .record({
      count: fc.integer({ min: 0 }),
      next: fc.option(fc.webUrl(), { nil: null }),
      previous: fc.option(fc.webUrl(), { nil: null }),
      results: fc.array(
        fc.record({
          name: fc.string({ minLength: 1 }),
          url: fc.string({ minLength: 1 }),
        }),
        { maxLength: limit },
      ),
    })
    .map((raw) => ({ limit, raw })),
);

describe('mapListPage — proprietà', () => {
  // Feature: pokeapi-client, Property 10: Invarianti della Pagina_LIST e preservazione dei riferimenti
  // Validates: Requirements 2.2, 2.3
  it('preserva gli invarianti della pagina e i riferimenti dalla sorgente', () => {
    fc.assert(
      fc.property(listPageRaw, ({ limit, raw }) => {
        const page = mapListPage(raw);

        // count intero >= 0
        expect(Number.isInteger(page.count)).toBe(true);
        expect(page.count).toBeGreaterThanOrEqual(0);

        // next e previous: ciascuno stringa o null
        expect(page.next === null || typeof page.next === 'string').toBe(true);
        expect(
          page.previous === null || typeof page.previous === 'string',
        ).toBe(true);

        // results con al più `limit` elementi
        expect(page.results.length).toBeLessThanOrEqual(limit);

        // ogni riferimento preserva name e url (entrambi non vuoti) dalla sorgente
        expect(page.results.length).toBe(raw.results.length);
        page.results.forEach((ref, index) => {
          const source = raw.results[index];
          expect(ref.name).toBe(source.name);
          expect(ref.url).toBe(source.url);
          expect(ref.name.length).toBeGreaterThan(0);
          expect(ref.url.length).toBeGreaterThan(0);
        });
      }),
      { numRuns: 100 },
    );
  });
});
