import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fc from 'fast-check';
import { describe, expect, it, vi } from 'vitest';

import { FIRST_GEN_MAX_ID, FIRST_GEN_MIN_ID } from '../../lib/generation';
import type { PokemonListEntry } from '../../lib/generation';
import { PokemonListItem } from '../PokemonListItem';

const entry: PokemonListEntry = {
  id: 25,
  name: 'pikachu',
  url: 'https://pokeapi.co/api/v2/pokemon/25/',
};

describe('PokemonListItem', () => {
  it('mostra il numero identificativo e il nome nel markup (Req 6.7, 7.4)', () => {
    render(
      <PokemonListItem entry={entry} isSelected={false} onSelect={vi.fn()} />,
    );

    expect(screen.getByText(/25/)).toBeInTheDocument();
    expect(screen.getByText(/pikachu/i)).toBeInTheDocument();
  });

  it("mostra una miniatura dello sprite con alt uguale al nome, derivata dall'id", () => {
    render(
      <PokemonListItem entry={entry} isSelected={false} onSelect={vi.fn()} />,
    );

    const image = screen.getByRole('img', { name: 'pikachu' });
    expect(image).toHaveAttribute('src', expect.stringContaining('/25.png'));
  });

  it('rende sempre una regione dei tipi nel markup, indipendentemente dal tema (Req 6.7, 7.4)', () => {
    // Il markup contiene sempre i tipi (la visibilità è regolata dal tema via CSS):
    // il componente espone una regione stabile per i tipi.
    render(
      <PokemonListItem entry={entry} isSelected={false} onSelect={vi.fn()} />,
    );

    expect(screen.getByTestId('pokemon-types')).toBeInTheDocument();
  });

  it('invoca onSelect con l\u0027id alla selezione (Req 1.6)', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <PokemonListItem entry={entry} isSelected={false} onSelect={onSelect} />,
    );

    await user.click(screen.getByRole('button'));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(25);
  });

  it('marca l\u0027elemento quando selezionato per il cursore a freccia (Req 6.6)', () => {
    const { rerender } = render(
      <PokemonListItem entry={entry} isSelected onSelect={vi.fn()} />,
    );

    expect(screen.getByRole('button')).toHaveAttribute('aria-current', 'true');

    rerender(
      <PokemonListItem entry={entry} isSelected={false} onSelect={vi.fn()} />,
    );

    expect(screen.getByRole('button')).not.toHaveAttribute(
      'aria-current',
      'true',
    );
  });
});

// Property-based test (fast-check).
// Feature: pokedex-themed-views, Property 9: Ogni riga dell'elenco contiene numero, nome e tipi
describe('PokemonListItem (property-based)', () => {
  // Voce d'elenco della Prima_Generazione: id in 1..151 e nome non vuoto,
  // composto di sole lettere (per un match testuale non ambiguo).
  const listEntry: fc.Arbitrary<PokemonListEntry> = fc
    .record({
      id: fc.integer({ min: FIRST_GEN_MIN_ID, max: FIRST_GEN_MAX_ID }),
      name: fc.string({
        unit: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'),
        minLength: 1,
        maxLength: 20,
      }),
    })
    .map(({ id, name }) => ({
      id,
      name,
      url: `https://pokeapi.co/api/v2/pokemon/${id}/`,
    }));

  it('rende sempre numero, nome e la regione dei tipi per ogni voce', () => {
    fc.assert(
      fc.property(listEntry, (entry) => {
        render(
          <PokemonListItem
            entry={entry}
            isSelected={false}
            onSelect={vi.fn()}
          />,
        );

        try {
          // Il numero identificativo è presente nel markup.
          expect(
            screen.getByText(new RegExp(`\\b${entry.id}\\b`)),
          ).toBeInTheDocument();
          // Il nome è presente nel markup.
          expect(screen.getByText(entry.name)).toBeInTheDocument();
          // La regione stabile dei tipi è sempre presente (visibilità via tema/CSS).
          expect(screen.getByTestId('pokemon-types')).toBeInTheDocument();
        } finally {
          cleanup();
        }
      }),
      { numRuns: 100 },
    );
  });
});
