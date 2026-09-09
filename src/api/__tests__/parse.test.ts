import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { parseListPageRaw, parsePokemonRaw } from '../parse';
import type { PokemonListPageRaw, PokemonRaw } from '../raw';

// Unit test (esempi) per il narrowing difensivo da `unknown` verso i tipi Raw.
// Il narrowing parte da `unknown` (mai `any`): un corpo conforme viene
// restituito come Raw, un corpo corrotto (campo mancante o tipo errato)
// restituisce `null`, senza mai produrre un dominio parziale.
// _Requirements: 5.1, 5.5, 5.6_

// Corpo Pokémon grezzo conforme, usato come base per i casi corrotti.
const conformingPokemon = {
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

// Corpo pagina lista grezzo conforme, usato come base per i casi corrotti.
const conformingListPage = {
  count: 1302,
  next: 'https://pokeapi.co/api/v2/pokemon?offset=20&limit=20',
  previous: null,
  results: [
    { name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon/1/' },
    { name: 'ivysaur', url: 'https://pokeapi.co/api/v2/pokemon/2/' },
  ],
};

describe('parsePokemonRaw', () => {
  it('restituisce il Raw quando il corpo è conforme', () => {
    const body: unknown = conformingPokemon;

    const result = parsePokemonRaw(body);

    const expected: PokemonRaw = {
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
      // `sprites` assente nel corpo → normalizzato a { front_default: null }.
      sprites: { front_default: null },
    };
    expect(result).toEqual(expected);
  });

  it('restituisce null quando il corpo non è un oggetto', () => {
    expect(parsePokemonRaw(null)).toBeNull();
    expect(parsePokemonRaw(undefined)).toBeNull();
    expect(parsePokemonRaw('pikachu')).toBeNull();
    expect(parsePokemonRaw(25)).toBeNull();
  });

  it('restituisce null quando manca un campo obbligatorio', () => {
    const { name, ...withoutName } = conformingPokemon;
    const body: unknown = withoutName;

    expect(parsePokemonRaw(body)).toBeNull();
  });

  it('restituisce null quando un campo ha un tipo errato', () => {
    const body: unknown = { ...conformingPokemon, id: '25' };

    expect(parsePokemonRaw(body)).toBeNull();
  });

  it('restituisce null quando abilities non è un array', () => {
    const body: unknown = { ...conformingPokemon, abilities: {} };

    expect(parsePokemonRaw(body)).toBeNull();
  });

  it('restituisce null quando una voce di types è malformata', () => {
    const body: unknown = {
      ...conformingPokemon,
      types: [{ slot: 1, type: { name: 42 } }],
    };

    expect(parsePokemonRaw(body)).toBeNull();
  });

  it('restituisce null quando una voce di abilities è malformata', () => {
    const body: unknown = {
      ...conformingPokemon,
      abilities: [{ ability: { name: 'static' }, is_hidden: 'no', slot: 1 }],
    };

    expect(parsePokemonRaw(body)).toBeNull();
  });
});

// Unit test (esempi) per il narrowing difensivo dello Sprite_Pokemon
// (Requirement 8.1). Il confine non si fida della forma: `sprites.front_default`
// deve essere stringa oppure null; se `sprites` manca o `front_default` non è né
// stringa né null, `front_default` viene normalizzato a null (nessun dominio
// parziale, coerente con la filosofia di parse.ts).
// _Requirements: 8.1_
describe('parsePokemonRaw — sprite', () => {
  // Base conforme che include il campo `sprites`, usata per i casi sprite.
  const conformingWithSprite = {
    ...conformingPokemon,
    sprites: {
      front_default:
        'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
    },
  };

  it('conserva sprites.front_default quando è una stringa', () => {
    const body: unknown = conformingWithSprite;

    const result = parsePokemonRaw(body);

    expect(result?.sprites.front_default).toBe(
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
    );
  });

  it('conserva sprites.front_default quando è null', () => {
    const body: unknown = {
      ...conformingPokemon,
      sprites: { front_default: null },
    };

    const result = parsePokemonRaw(body);

    expect(result).not.toBeNull();
    expect(result?.sprites.front_default).toBeNull();
  });

  it('normalizza front_default a null quando il campo sprites manca del tutto', () => {
    const body: unknown = conformingPokemon;

    const result = parsePokemonRaw(body);

    expect(result).not.toBeNull();
    expect(result?.sprites.front_default).toBeNull();
  });

  it('normalizza front_default a null quando sprites è malformato (non è un oggetto)', () => {
    const body: unknown = { ...conformingPokemon, sprites: 'nope' };

    const result = parsePokemonRaw(body);

    expect(result).not.toBeNull();
    expect(result?.sprites.front_default).toBeNull();
  });

  it('normalizza front_default a null quando front_default ha un tipo non ammesso', () => {
    const body: unknown = {
      ...conformingPokemon,
      sprites: { front_default: 42 },
    };

    const result = parsePokemonRaw(body);

    expect(result).not.toBeNull();
    expect(result?.sprites.front_default).toBeNull();
  });
});

describe('parseListPageRaw', () => {
  it('restituisce il Raw quando il corpo è conforme', () => {
    const body: unknown = conformingListPage;

    const result = parseListPageRaw(body);

    const expected: PokemonListPageRaw = {
      count: 1302,
      next: 'https://pokeapi.co/api/v2/pokemon?offset=20&limit=20',
      previous: null,
      results: [
        { name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon/1/' },
        { name: 'ivysaur', url: 'https://pokeapi.co/api/v2/pokemon/2/' },
      ],
    };
    expect(result).toEqual(expected);
  });

  it('accetta next e previous valorizzati o null', () => {
    const body: unknown = {
      count: 0,
      next: null,
      previous: null,
      results: [],
    };

    const expected: PokemonListPageRaw = {
      count: 0,
      next: null,
      previous: null,
      results: [],
    };
    expect(parseListPageRaw(body)).toEqual(expected);
  });

  it('restituisce null quando il corpo non è un oggetto', () => {
    expect(parseListPageRaw(null)).toBeNull();
    expect(parseListPageRaw(undefined)).toBeNull();
    expect(parseListPageRaw('lista')).toBeNull();
  });

  it('restituisce null quando manca un campo obbligatorio', () => {
    const { results, ...withoutResults } = conformingListPage;
    const body: unknown = withoutResults;

    expect(parseListPageRaw(body)).toBeNull();
  });

  it('restituisce null quando count ha un tipo errato', () => {
    const body: unknown = { ...conformingListPage, count: '1302' };

    expect(parseListPageRaw(body)).toBeNull();
  });

  it('restituisce null quando results non è un array', () => {
    const body: unknown = { ...conformingListPage, results: 'nope' };

    expect(parseListPageRaw(body)).toBeNull();
  });

  it('restituisce null quando una voce di results è malformata', () => {
    const body: unknown = {
      ...conformingListPage,
      results: [{ name: 'bulbasaur' }],
    };

    expect(parseListPageRaw(body)).toBeNull();
  });

  it('restituisce null quando next ha un tipo non ammesso', () => {
    const body: unknown = { ...conformingListPage, next: 42 };

    expect(parseListPageRaw(body)).toBeNull();
  });
});

// Property-based test (fast-check).
// Feature: pokeapi-client, Property 8: Corpo 2xx non conforme produce "risposta HTTP non valida"
// Validates: Requirements 2.7, 4.4, 5.5
//
// A livello di parsing: per ogni corpo Raw "corrotto" (campo obbligatorio
// mancante oppure con tipo errato), `parse*Raw` restituisce sempre `null`, senza
// mai produrre un dominio parziale. La traduzione del `null` in errore di
// categoria "risposta HTTP non valida" e verificata a livello di client (task 10).
describe('parse*Raw (property-based)', () => {
  // Valori di tipo "sbagliato" da iniettare in un campo per corromperlo. Sono
  // scelti per non coincidere mai con il tipo atteso di alcun campo consumato.
  const wrongTypedValue: fc.Arbitrary<unknown> = fc.oneof(
    fc.constant(null),
    fc.constant(undefined),
    fc.boolean(),
    fc.string(),
    fc.integer(),
    fc.array(fc.string()),
    fc.record({ nested: fc.string() }),
  );

  // Genera un `PokemonRaw` conforme (i valori concreti non contano: conta la
  // forma). Serve come base sana da corrompere.
  const conformingPokemonRaw: fc.Arbitrary<Record<string, unknown>> = fc.record(
    {
      id: fc.integer({ min: 1, max: 100000 }),
      name: fc.string({ minLength: 1, maxLength: 20 }),
      height: fc.nat(),
      weight: fc.nat(),
      base_experience: fc.nat(),
      abilities: fc.array(
        fc.record({
          ability: fc.record({
            name: fc.string({ minLength: 1, maxLength: 20 }),
          }),
          is_hidden: fc.boolean(),
          slot: fc.nat(),
        }),
        { maxLength: 3 },
      ),
      types: fc.array(
        fc.record({
          slot: fc.nat(),
          type: fc.record({ name: fc.string({ minLength: 1, maxLength: 20 }) }),
        }),
        { minLength: 1, maxLength: 2 },
      ),
    },
  );

  // Genera un `PokemonListPageRaw` conforme.
  const conformingListPageRaw: fc.Arbitrary<Record<string, unknown>> =
    fc.record({
      count: fc.nat(),
      next: fc.oneof(fc.constant(null), fc.webUrl()),
      previous: fc.oneof(fc.constant(null), fc.webUrl()),
      results: fc.array(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 20 }),
          url: fc.webUrl(),
        }),
        { maxLength: 3 },
      ),
    });

  // I campi obbligatori di primo livello per ciascun tipo Raw.
  const pokemonRequiredFields = [
    'id',
    'name',
    'height',
    'weight',
    'base_experience',
    'abilities',
    'types',
  ] as const;
  const listPageRequiredFields = [
    'count',
    'next',
    'previous',
    'results',
  ] as const;

  // Rimuove una chiave da un oggetto restituendo una copia (senza mutare).
  const withoutKey = (
    source: Record<string, unknown>,
    key: string,
  ): Record<string, unknown> => {
    const copy = { ...source };
    delete copy[key];
    return copy;
  };

  it('parsePokemonRaw restituisce null quando manca un campo obbligatorio', () => {
    fc.assert(
      fc.property(
        conformingPokemonRaw,
        fc.constantFrom(...pokemonRequiredFields),
        (raw, missingField) => {
          const corrupted: unknown = withoutKey(raw, missingField);
          expect(parsePokemonRaw(corrupted)).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('parsePokemonRaw restituisce null quando un campo ha il tipo errato', () => {
    fc.assert(
      fc.property(
        conformingPokemonRaw,
        fc.constantFrom(...pokemonRequiredFields),
        wrongTypedValue,
        (raw, targetField, wrongValue) => {
          // Scarta i casi in cui il valore "sbagliato" combacia col tipo atteso.
          fc.pre(typeof wrongValue !== typeof raw[targetField]);
          const corrupted: unknown = { ...raw, [targetField]: wrongValue };
          expect(parsePokemonRaw(corrupted)).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('parseListPageRaw restituisce null quando manca un campo obbligatorio', () => {
    fc.assert(
      fc.property(
        conformingListPageRaw,
        fc.constantFrom(...listPageRequiredFields),
        (raw, missingField) => {
          const corrupted: unknown = withoutKey(raw, missingField);
          expect(parseListPageRaw(corrupted)).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('parseListPageRaw restituisce null quando un campo ha il tipo errato', () => {
    // `next`/`previous` ammettono `null`; il tipo errato va scelto tra i valori
    // non-stringa e non-null per garantire una vera corruzione.
    const wrongTypedForField = (field: string): fc.Arbitrary<unknown> => {
      if (field === 'next' || field === 'previous') {
        return fc.oneof(
          fc.boolean(),
          fc.integer(),
          fc.array(fc.string()),
          fc.record({}),
        );
      }
      if (field === 'count') {
        return fc.oneof(
          fc.constant(null),
          fc.boolean(),
          fc.string(),
          fc.array(fc.string()),
        );
      }
      // `results` deve essere un array: qualsiasi non-array lo corrompe.
      return fc.oneof(
        fc.constant(null),
        fc.boolean(),
        fc.string(),
        fc.integer(),
        fc.record({}),
      );
    };

    fc.assert(
      fc.property(
        conformingListPageRaw,
        fc.constantFrom(...listPageRequiredFields),
        (raw, targetField) => {
          const wrongValue = fc.sample(wrongTypedForField(targetField), 1)[0];
          const corrupted: unknown = { ...raw, [targetField]: wrongValue };
          expect(parseListPageRaw(corrupted)).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });
});
