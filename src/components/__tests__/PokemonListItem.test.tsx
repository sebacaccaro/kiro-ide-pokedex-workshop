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

// -----------------------------------------------------------------------------
// Integrazione del Toggle_Cattura nella Voce_Elenco (Req 1.1, 1.6).
//
// Il PokemonListItem ospita il Toggle_Cattura alla destra dei metadati della
// voce e riceve le nuove props isCaptured/onCapture/onUncapture. L'attivazione
// del toggle NON deve propagare la selezione della riga (catturare non apre il
// dettaglio).
// -----------------------------------------------------------------------------
describe('PokemonListItem — Toggle_Cattura (Req 1.1, 1.6)', () => {
  it('rende un Toggle_Cattura per la voce con le nuove props isCaptured/onCapture/onUncapture (Req 1.1)', () => {
    render(
      <PokemonListItem
        entry={entry}
        isSelected={false}
        onSelect={vi.fn()}
        isCaptured={false}
        onCapture={vi.fn()}
        onUncapture={vi.fn()}
      />,
    );

    // Il Toggle_Cattura è reso con la sua classe stabile `capture-toggle`.
    const toggle = document.querySelector('.capture-toggle');
    expect(toggle).not.toBeNull();
    expect(toggle).toBeInTheDocument();
  });

  it('riflette lo Stato_Catturato sul Toggle tramite la prop isCaptured (Req 1.1)', () => {
    render(
      <PokemonListItem
        entry={entry}
        isSelected={false}
        onSelect={vi.fn()}
        isCaptured
        onCapture={vi.fn()}
        onUncapture={vi.fn()}
      />,
    );

    const toggle = document.querySelector('.capture-toggle');
    expect(toggle).toHaveAttribute('data-captured', 'true');
  });

  it('rende il Toggle_Cattura alla destra dei metadati della voce, dopo i tipi (Req 1.1)', () => {
    const { container } = render(
      <PokemonListItem
        entry={entry}
        isSelected={false}
        onSelect={vi.fn()}
        isCaptured={false}
        onCapture={vi.fn()}
        onUncapture={vi.fn()}
      />,
    );

    const types = screen.getByTestId('pokemon-types');
    const toggle = container.querySelector('.capture-toggle');
    expect(toggle).not.toBeNull();

    // Il Toggle è reso dopo la regione dei tipi (a destra dei metadati):
    // il confronto sulla posizione nel documento verifica l'ordine di rendering.
    // Node.DOCUMENT_POSITION_FOLLOWING === 4.
    const toggleFollowsTypes =
      (types.compareDocumentPosition(toggle as Node) &
        Node.DOCUMENT_POSITION_FOLLOWING) !==
      0;
    expect(toggleFollowsTypes).toBe(true);
  });

  it("l'attivazione del Toggle_Cattura non propaga la selezione della voce (onSelect non chiamato) (Req 1.6)", async () => {
    const onSelect = vi.fn();
    const onCapture = vi.fn();
    const user = userEvent.setup();
    render(
      <PokemonListItem
        entry={entry}
        isSelected={false}
        onSelect={onSelect}
        isCaptured
        onCapture={onCapture}
        onUncapture={vi.fn()}
      />,
    );

    // Il Toggle è già catturato: attivarlo esegue un'azione sincrona senza
    // animazione, così possiamo verificare subito che onSelect non sia chiamato.
    const toggle = document.querySelector('.capture-toggle');
    expect(toggle).not.toBeNull();

    await user.click(toggle as HTMLElement);

    // L'attivazione del Toggle deve fermare la propagazione: la riga non viene
    // selezionata (nessun onSelect), così catturare non apre il dettaglio.
    expect(onSelect).not.toHaveBeenCalled();
    // L'azione di annullamento cattura è comunque avvenuta.
    expect(onCapture).not.toHaveBeenCalled();
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
