import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fc from 'fast-check';
import { describe, expect, it, vi } from 'vitest';

import type { Pokemon, PokemonAbility, PokemonType } from '../../types/pokemon';
import { PokemonDetail } from '../PokemonDetail';

// Unit test (esempi) per il componente di presentazione PokemonDetail.
// Il componente e "stupido": riceve un Pokemon di dominio e la callback onBack
// via props e non contiene logica di fetch. Verifichiamo il rendering dei campi,
// l'ordinamento dei tipi per slot, l'elenco delle abilita, la robustezza sulle
// collezioni vuote, il comando di ritorno e la gestione dello sprite.
// _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 8.2, 8.3, 8.4_

/** Costruisce un Pokemon di dominio valido, con override opzionali. */
function makePokemon(overrides: Partial<Pokemon> = {}): Pokemon {
  return {
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
    spriteUrl: 'https://example.test/pikachu.png',
    ...overrides,
  };
}

describe('PokemonDetail', () => {
  it('mostra numero identificativo e nome del Pokemon (Req 3.2)', () => {
    render(<PokemonDetail pokemon={makePokemon()} onBack={vi.fn()} />);

    expect(screen.getByText(/pikachu/i)).toBeInTheDocument();
    expect(screen.getByText(/25/)).toBeInTheDocument();
  });

  it('mostra altezza, peso ed esperienza base (Req 3.3)', () => {
    render(
      <PokemonDetail
        pokemon={makePokemon({ height: 7, weight: 69, baseExperience: 118 })}
        onBack={vi.fn()}
      />,
    );

    expect(screen.getByText(/7/)).toBeInTheDocument();
    expect(screen.getByText(/69/)).toBeInTheDocument();
    expect(screen.getByText(/118/)).toBeInTheDocument();
  });

  it('mostra i tipi nell ordine dato dal campo slot crescente (Req 3.4)', () => {
    // Tipi forniti in ordine di slot decrescente: devono essere resi 1, 2.
    const pokemon = makePokemon({
      types: [
        { slot: 2, name: 'flying' },
        { slot: 1, name: 'grass' },
      ],
    });

    render(<PokemonDetail pokemon={pokemon} onBack={vi.fn()} />);

    const grass = screen.getByText(/grass/i);
    const flying = screen.getByText(/flying/i);
    // grass (slot 1) deve precedere flying (slot 2) nell'ordine del documento.
    expect(grass.compareDocumentPosition(flying)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('elenca tutte le abilita del Pokemon (Req 3.5)', () => {
    render(<PokemonDetail pokemon={makePokemon()} onBack={vi.fn()} />);

    expect(screen.getByText(/static/i)).toBeInTheDocument();
    expect(screen.getByText(/lightning-rod/i)).toBeInTheDocument();
  });

  it('rende il resto del dettaglio senza crash con tipi e abilita vuoti (Req 3.6)', () => {
    const pokemon = makePokemon({ types: [], abilities: [] });

    expect(() =>
      render(<PokemonDetail pokemon={pokemon} onBack={vi.fn()} />),
    ).not.toThrow();

    // I campi scalari restano visibili anche con collezioni vuote.
    expect(screen.getByText(/pikachu/i)).toBeInTheDocument();
    expect(screen.getByText(/25/)).toBeInTheDocument();
  });

  it('invoca onBack quando l Utente attiva il comando di ritorno (Req 3.7)', async () => {
    const onBack = vi.fn();
    const user = userEvent.setup();

    render(<PokemonDetail pokemon={makePokemon()} onBack={onBack} />);

    await user.click(screen.getByRole('button', { name: /indietro|ritorna|torna/i }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('mostra un img con src pari a spriteUrl e alt pari al nome quando lo sprite e valorizzato (Req 8.2)', () => {
    const pokemon = makePokemon({
      name: 'bulbasaur',
      spriteUrl: 'https://example.test/bulbasaur.png',
    });

    render(<PokemonDetail pokemon={pokemon} onBack={vi.fn()} />);

    const img = screen.getByRole('img', { name: 'bulbasaur' });
    expect(img).toHaveAttribute('src', 'https://example.test/bulbasaur.png');
    expect(img).toHaveAttribute('alt', 'bulbasaur');
    expect(img).toHaveClass('pokedex-sprite');
  });

  it('mostra un segnaposto con classe pokedex-sprite quando spriteUrl e null (Req 8.3)', () => {
    const pokemon = makePokemon({ spriteUrl: null });

    const { container } = render(
      <PokemonDetail pokemon={pokemon} onBack={vi.fn()} />,
    );

    // Nessuna immagine renderizzata.
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    // Il segnaposto occupa lo spazio con la classe stabile .pokedex-sprite.
    expect(container.querySelector('.pokedex-sprite')).toBeInTheDocument();
  });

  it('sostituisce l immagine col segnaposto quando il caricamento fallisce (onError) (Req 8.4)', () => {
    const pokemon = makePokemon({
      name: 'charmander',
      spriteUrl: 'https://example.test/broken.png',
    });

    const { container } = render(
      <PokemonDetail pokemon={pokemon} onBack={vi.fn()} />,
    );

    const img = screen.getByRole('img', { name: 'charmander' });
    // Simula il fallimento del caricamento dell'immagine.
    img.dispatchEvent(new Event('error'));

    // L'immagine interrotta non deve piu essere mostrata; resta il segnaposto.
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(container.querySelector('.pokedex-sprite')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Property-based test (fast-check) per il componente di presentazione.
// Il componente e "stupido": renderizza in modo deterministico un Pokemon di
// dominio. Le proprieta seguenti verificano invarianti di rendering su molti
// input generati. Nessuna rete: si renderizza solo il componente.
// Si usa cleanup() tra un run e l'altro per evitare collisioni di elementi
// duplicati nel DOM tra le iterazioni di fast-check.
// ---------------------------------------------------------------------------

/**
 * Nomi/etichette a sole lettere (minuscole): evitano collisioni con il testo
 * dei campi numerici (id, altezza, peso, esperienza) rendendo le asserzioni
 * non ambigue.
 */
const letterName: fc.Arbitrary<string> = fc
  .stringMatching(/^[a-z]+$/)
  .filter((value) => value.length >= 1 && value.length <= 12);

/** Un intero non negativo plausibile per i campi scalari numerici. */
const nonNegativeInt: fc.Arbitrary<number> = fc.integer({ min: 0, max: 100000 });

/**
 * Genera una collezione di tipi con slot distinti e nomi univoci, forniti in
 * ordine arbitrario (fast-check puo produrre qualsiasi permutazione degli slot).
 * Nomi univoci: cosi ogni tipo e identificabile senza ambiguita nel DOM.
 */
const distinctSlotTypes: fc.Arbitrary<readonly PokemonType[]> = fc
  .uniqueArray(fc.integer({ min: 1, max: 50 }), { minLength: 1, maxLength: 6 })
  .chain((slots) =>
    fc
      .uniqueArray(letterName, {
        minLength: slots.length,
        maxLength: slots.length,
      })
      .map((names) => slots.map((slot, index) => ({ slot, name: names[index] }))),
  );

/** Genera abilita con slot distinti e nomi univoci. */
const distinctSlotAbilities: fc.Arbitrary<readonly PokemonAbility[]> = fc
  .uniqueArray(fc.integer({ min: 1, max: 50 }), { minLength: 0, maxLength: 6 })
  .chain((slots) =>
    fc
      .uniqueArray(letterName, {
        minLength: slots.length,
        maxLength: slots.length,
      })
      .chain((names) =>
        fc
          .array(fc.boolean(), { minLength: slots.length, maxLength: slots.length })
          .map((hidden) =>
            slots.map((slot, index) => ({
              name: names[index],
              isHidden: hidden[index],
              slot,
            })),
          ),
      ),
  );

/** Un `Pokemon` valido completo, con nomi a sole lettere e sprite valorizzato. */
const pokemonArb: fc.Arbitrary<Pokemon> = fc.record({
  id: nonNegativeInt,
  name: letterName,
  height: nonNegativeInt,
  weight: nonNegativeInt,
  baseExperience: nonNegativeInt,
  abilities: distinctSlotAbilities,
  types: fc.oneof(
    distinctSlotTypes,
    fc.constant([] as readonly PokemonType[]),
  ),
  spriteUrl: fc.webUrl(),
});

describe('PokemonDetail (property-based)', () => {
  // Feature: pokedex-themed-views, Property 6: Il dettaglio mostra tutti i campi scalari del Pokémon
  // Validates: Requirements 3.2, 3.3
  it('Property 6: il markup contiene id, nome, altezza, peso ed esperienza base', () => {
    fc.assert(
      fc.property(pokemonArb, (pokemon) => {
        const { container } = render(
          <PokemonDetail pokemon={pokemon} onBack={vi.fn()} />,
        );

        try {
          // Il nome (sole lettere) compare nel titolo.
          expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
            pokemon.name,
          );

          // I campi scalari numerici sono resi nei <dd> della lista di descrizione.
          const values = Array.from(container.querySelectorAll('dd')).map(
            (dd) => dd.textContent,
          );
          expect(values).toContain(String(pokemon.id));
          expect(values).toContain(String(pokemon.height));
          expect(values).toContain(String(pokemon.weight));
          expect(values).toContain(String(pokemon.baseExperience));
        } finally {
          cleanup();
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: pokedex-themed-views, Property 7: I tipi sono resi in ordine di slot crescente
  // Validates: Requirements 3.4
  it('Property 7: i tipi forniti in ordine arbitrario sono resi per slot crescente', () => {
    fc.assert(
      fc.property(
        pokemonArb.chain((base) =>
          distinctSlotTypes.map((types) => ({ ...base, types })),
        ),
        (pokemon) => {
          const { container } = render(
            <PokemonDetail pokemon={pokemon} onBack={vi.fn()} />,
          );

          try {
            // Ordine atteso: nomi dei tipi ordinati per slot crescente.
            const expectedOrder = [...pokemon.types]
              .sort((a, b) => a.slot - b.slot)
              .map((type) => type.name);

            // Ordine reso: i <li> della sezione "Tipi" nell'ordine del documento.
            const typesSection = screen.getByRole('region', { name: 'Tipi' });
            const renderedOrder = Array.from(
              typesSection.querySelectorAll('li'),
            ).map((li) => li.textContent);

            expect(renderedOrder).toEqual(expectedOrder);
            // Sanity: usa `container` per garantire un render isolato per run.
            expect(container).toContainElement(typesSection);
          } finally {
            cleanup();
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: pokedex-themed-views, Property 8: Tutte le abilità del Pokémon compaiono nel dettaglio
  // Validates: Requirements 3.5
  it('Property 8: ogni abilita del Pokemon compare nel markup', () => {
    fc.assert(
      fc.property(
        pokemonArb.chain((base) =>
          distinctSlotAbilities.map((abilities) => ({ ...base, abilities })),
        ),
        (pokemon) => {
          const { container } = render(
            <PokemonDetail pokemon={pokemon} onBack={vi.fn()} />,
          );

          try {
            const abilitiesSection = screen.getByRole('region', {
              name: 'Abilita',
            });
            const renderedNames = Array.from(
              abilitiesSection.querySelectorAll('li'),
            ).map((li) => li.textContent);

            pokemon.abilities.forEach((ability) => {
              expect(renderedNames).toContain(ability.name);
            });
            expect(container).toContainElement(abilitiesSection);
          } finally {
            cleanup();
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: pokedex-themed-views, Property 11: Con sprite valorizzato il dettaglio rende un'immagine con alt uguale al nome
  // Validates: Requirements 8.2
  it("Property 11: con spriteUrl non nullo rende un'immagine con src=spriteUrl e alt=nome", () => {
    fc.assert(
      fc.property(
        fc.record({
          id: nonNegativeInt,
          name: letterName,
          height: nonNegativeInt,
          weight: nonNegativeInt,
          baseExperience: nonNegativeInt,
          abilities: distinctSlotAbilities,
          types: distinctSlotTypes,
          spriteUrl: fc.webUrl(),
        }),
        (pokemon) => {
          render(<PokemonDetail pokemon={pokemon} onBack={vi.fn()} />);

          try {
            const img = screen.getByRole('img', { name: pokemon.name });
            expect(img).toHaveAttribute('src', pokemon.spriteUrl);
            expect(img).toHaveAttribute('alt', pokemon.name);
          } finally {
            cleanup();
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
