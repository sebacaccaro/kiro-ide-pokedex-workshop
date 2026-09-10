import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import type { Pokemon, PokemonListPage } from '../../types/pokemon';
import { mapListPage, mapPokemon, mapPokemonSpecies } from '../mappers';
import type {
  AbilityEntryRaw,
  FlavorTextEntryRaw,
  PokemonListPageRaw,
  PokemonRaw,
  PokemonSpeciesRaw,
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
      sprites: { front_default: null },
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
      sprites: { front_default: null },
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
      sprites: { front_default: null },
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
      sprites: { front_default: null },
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
      sprites: { front_default: null },
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
      spriteUrl: null,
    };
    expect(result).toEqual(expected);
  });
});

// Unit test (esempi) per il mapping dello Sprite_Pokemon (Requirement 8.1).
// `mapPokemon` deve tradurre `sprites.front_default` (stringa o null) nel campo
// di dominio `spriteUrl`, senza mai produrre un dominio parziale.
// _Requirements: 8.1_
describe('mapPokemon — sprite', () => {
  it('traduce sprites.front_default (stringa) nel campo di dominio spriteUrl', () => {
    const raw: PokemonRaw = {
      id: 25,
      name: 'pikachu',
      height: 4,
      weight: 60,
      base_experience: 112,
      abilities: [{ ability: { name: 'static' }, is_hidden: false, slot: 1 }],
      types: [{ slot: 1, type: { name: 'electric' } }],
      sprites: {
        front_default:
          'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
      },
    };

    const result = mapPokemon(raw);

    expect(result.spriteUrl).toBe(
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
    );
  });

  it('mappa spriteUrl a null quando sprites.front_default è null', () => {
    const raw: PokemonRaw = {
      id: 201,
      name: 'unown',
      height: 5,
      weight: 50,
      base_experience: 118,
      abilities: [{ ability: { name: 'levitate' }, is_hidden: false, slot: 1 }],
      types: [{ slot: 1, type: { name: 'psychic' } }],
      sprites: {
        front_default: null,
      },
    };

    const result = mapPokemon(raw);

    expect(result.spriteUrl).toBeNull();
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
    sprites: fc.record({
      front_default: fc.option(fc.webUrl(), { nil: null }),
    }),
  });

  // Feature: pokedex-themed-views, Property 10: spriteUrl riflette fedelmente sprites.front_default
  // Validates: Requirements 8.1
  it('per ogni PokemonRaw, spriteUrl è uguale a sprites.front_default (stringa o null)', () => {
    // sprites.front_default: stringa (URL non vuoto) oppure null, come dalle PokéAPI.
    const spriteFrontDefault: fc.Arbitrary<string | null> = fc.option(
      fc.webUrl(),
      { nil: null },
    );

    const pokemonRawWithSprite: fc.Arbitrary<PokemonRaw> = fc.record({
      id: fc.integer({ min: 1, max: 100000 }),
      name: resourceName,
      height: fc.integer({ min: 0, max: 1000 }),
      weight: fc.integer({ min: 0, max: 100000 }),
      base_experience: fc.integer({ min: 0, max: 1000 }),
      abilities: fc.array(abilityEntryRaw, { maxLength: 5 }),
      types: fc.array(typeEntryRaw, { minLength: 1, maxLength: 2 }),
      sprites: fc.record({ front_default: spriteFrontDefault }),
    });

    fc.assert(
      fc.property(pokemonRawWithSprite, (raw) => {
        const result = mapPokemon(raw);

        // spriteUrl riflette fedelmente sprites.front_default, senza dominio parziale.
        expect(result.spriteUrl).toBe(raw.sprites.front_default);
      }),
      { numRuns: 100 },
    );
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
// Property-based test (fast-check) per il mapping della Descrizione_Pokedex.
// La forma grezza `pokemon-species` contiene molte voci di flavor text (per
// lingua/versione), con spazi e a-capo "grezzi" (es. \n, \f, spazi multipli).
// `mapPokemonSpecies` seleziona in modo deterministico il testo (preferendo la
// lingua inglese), lo normalizza (compattando spazi/a-capo) e ripiega su stringa
// vuota quando non c'è testo utile.
describe('mapPokemonSpecies (property-based)', () => {
  // Testo di flavor "grezzo" plausibile: parole separate da spazi, a-capo,
  // form-feed e tabulazioni, come nei corpi reali delle PokéAPI.
  const word: fc.Arbitrary<string> = fc
    .string({ minLength: 1, maxLength: 8 })
    .map((s) => s.replace(/[^a-zA-Z0-9]/g, 'a'))
    .filter((s) => s.length > 0);

  const rawWhitespace: fc.Arbitrary<string> = fc.constantFrom(
    ' ',
    '\n',
    '\f',
    '\t',
    '  ',
    ' \n',
    '\n\f',
  );

  // Un testo di flavor non vuoto: almeno una parola, con separatori grezzi.
  const nonEmptyFlavorText: fc.Arbitrary<string> = fc
    .array(word, { minLength: 1, maxLength: 6 })
    .chain((words) =>
      fc
        .array(rawWhitespace, { minLength: words.length, maxLength: words.length })
        .map((seps) => words.map((w, i) => `${seps[i]}${w}`).join('')),
    );

  // Lingua non inglese arbitraria (diversa da 'en').
  const nonEnLanguage: fc.Arbitrary<string> = fc.constantFrom(
    'ja',
    'fr',
    'de',
    'it',
    'es',
    'ko',
  );

  // Voce con lingua inglese e testo non vuoto (grezzo).
  const enEntry: fc.Arbitrary<FlavorTextEntryRaw> = nonEmptyFlavorText.map(
    (text) => ({ flavor_text: text, language: { name: 'en' } }),
  );

  // Voce con lingua non inglese e testo qualsiasi (anche vuoto).
  const nonEnEntry: fc.Arbitrary<FlavorTextEntryRaw> = fc.record({
    flavor_text: fc.string({ maxLength: 30 }),
    language: fc.record({ name: nonEnLanguage }),
  });

  // Feature: pokemon-capture-toggle, Property 8: Selezione e normalizzazione del flavor text
  // Validates: Requirements 5.2, 5.6, 5.7
  it('seleziona un testo inglese non vuoto, normalizzato, derivato dalla sorgente; stringa vuota se nessun testo utile', () => {
    // Caso A: esiste almeno una voce inglese con testo non vuoto.
    const speciesWithEn: fc.Arbitrary<PokemonSpeciesRaw> = fc
      .tuple(
        fc.integer({ min: 1, max: 100000 }),
        fc.array(nonEnEntry, { maxLength: 4 }),
        enEntry,
        fc.array(fc.oneof(nonEnEntry, enEntry), { maxLength: 4 }),
      )
      .map(([id, before, guaranteedEn, after]) => ({
        id,
        flavor_text_entries: [...before, guaranteedEn, ...after],
      }));

    // Testo normalizzato di riferimento: spazi/a-capo grezzi compattati in
    // singoli spazi, senza spazi ai bordi.
    const normalize = (text: string): string =>
      text.replace(/\s+/g, ' ').trim();

    fc.assert(
      fc.property(speciesWithEn, (raw) => {
        const result = mapPokemonSpecies(raw);

        // Il flavorText è non vuoto (esiste testo inglese utile).
        expect(result.flavorText.length).toBeGreaterThan(0);

        // È privo di sequenze grezze di spazi/a-capo: nessun doppio spazio,
        // nessun a-capo/tab/form-feed, nessuno spazio ai bordi.
        expect(result.flavorText).toBe(result.flavorText.trim());
        expect(/\s{2,}/.test(result.flavorText)).toBe(false);
        expect(/[\n\f\t\r]/.test(result.flavorText)).toBe(false);

        // Deriva da una voce presente nell'input: la sua forma normalizzata
        // coincide con la normalizzazione di uno dei flavor_text di origine.
        const normalizedSources = raw.flavor_text_entries.map((entry) =>
          normalize(entry.flavor_text),
        );
        expect(normalizedSources).toContain(result.flavorText);

        // L'id di dominio preserva l'id grezzo.
        expect(result.id).toBe(raw.id);
      }),
      { numRuns: 100 },
    );

    // Caso B: nessun testo utile (nessuna voce oppure tutte con testo vuoto/whitespace).
    const speciesWithoutText: fc.Arbitrary<PokemonSpeciesRaw> = fc.record({
      id: fc.integer({ min: 1, max: 100000 }),
      flavor_text_entries: fc.array(
        fc.record({
          flavor_text: fc.constantFrom('', ' ', '\n', '\t', '  \n '),
          language: fc.record({ name: fc.constantFrom('en', 'ja', 'fr') }),
        }),
        { maxLength: 5 },
      ),
    });

    fc.assert(
      fc.property(speciesWithoutText, (raw) => {
        const result = mapPokemonSpecies(raw);

        // Nessun testo utile → stringa vuota (Req 5.6).
        expect(result.flavorText).toBe('');
        expect(result.id).toBe(raw.id);
      }),
      { numRuns: 100 },
    );
  });
});

// Unit test (esempi) per il mapping della Descrizione_Pokedex.
// `mapPokemonSpecies` traduce la forma grezza `pokemon-species` nel tipo di
// dominio `PokemonSpecies`. La selezione del flavor text è deterministica:
// preferisce la prima voce in lingua inglese, normalizza spazi/a-capo, ripiega
// sulla prima voce disponibile se non c'è testo inglese e restituisce stringa
// vuota quando non c'è alcun testo utile. Nessun accesso alla rete.
// _Requirements: 5.2, 5.6, 5.7_
describe('mapPokemonSpecies', () => {
  it('preserva l’id di dominio dalla forma grezza', () => {
    const raw: PokemonSpeciesRaw = {
      id: 25,
      flavor_text_entries: [
        { flavor_text: 'Loves to eat apples.', language: { name: 'en' } },
      ],
    };

    const result = mapPokemonSpecies(raw);

    expect(result.id).toBe(25);
  });

  it('preferisce la prima voce in lingua inglese anche se non è la prima in assoluto', () => {
    const raw: PokemonSpeciesRaw = {
      id: 25,
      flavor_text_entries: [
        { flavor_text: 'ピカチュウの説明。', language: { name: 'ja' } },
        { flavor_text: 'Description française.', language: { name: 'fr' } },
        { flavor_text: 'The correct english text.', language: { name: 'en' } },
        { flavor_text: 'A later english entry.', language: { name: 'en' } },
      ],
    };

    const result = mapPokemonSpecies(raw);

    expect(result.flavorText).toBe('The correct english text.');
  });

  it('normalizza spazi multipli, a-capo, form-feed e tab in singoli spazi e rimuove i bordi', () => {
    const raw: PokemonSpeciesRaw = {
      id: 6,
      flavor_text_entries: [
        {
          flavor_text: '  Spits\nfire that\fis hot\tenough   to melt   boulders.  ',
          language: { name: 'en' },
        },
      ],
    };

    const result = mapPokemonSpecies(raw);

    expect(result.flavorText).toBe(
      'Spits fire that is hot enough to melt boulders.',
    );
  });

  it('ripiega sulla prima voce disponibile quando non esiste testo in inglese', () => {
    const raw: PokemonSpeciesRaw = {
      id: 1,
      flavor_text_entries: [
        { flavor_text: 'Prima\nvoce  non inglese.', language: { name: 'ja' } },
        { flavor_text: 'Seconde entrée.', language: { name: 'fr' } },
      ],
    };

    const result = mapPokemonSpecies(raw);

    expect(result.flavorText).toBe('Prima voce non inglese.');
  });

  it('restituisce stringa vuota quando non ci sono voci di flavor text', () => {
    const raw: PokemonSpeciesRaw = {
      id: 132,
      flavor_text_entries: [],
    };

    const result = mapPokemonSpecies(raw);

    expect(result.flavorText).toBe('');
  });

  it('restituisce stringa vuota quando tutte le voci contengono solo spazi/a-capo', () => {
    const raw: PokemonSpeciesRaw = {
      id: 133,
      flavor_text_entries: [
        { flavor_text: '   ', language: { name: 'en' } },
        { flavor_text: '\n\t\f', language: { name: 'ja' } },
      ],
    };

    const result = mapPokemonSpecies(raw);

    expect(result.flavorText).toBe('');
  });
});
