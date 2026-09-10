import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CaptureToggle } from '../CaptureToggle';

// Unit test (esempi/edge) del Toggle_Cattura.
// L'Animazione_Cattura è testata con FAKE TIMERS di Vitest: nessuna attesa
// reale. `user-event` è configurato per far avanzare i timer finti.
// _Requirements: 1.5, 1.6, 2.1, 2.2, 2.4, 2.5, 3.1_

// Durata dell'animazione usata nei test: entro il range 300–2000 ms.
const ANIMATION_MS = 700;

/**
 * Crea un utente `user-event` compatibile con i fake timers: le utility di
 * user-event usano un clock interno che va istruito ad avanzare i timer finti.
 */
function setupUser() {
  return userEvent.setup({
    advanceTimers: (ms) => vi.advanceTimersByTime(ms),
  });
}

describe('CaptureToggle', () => {
  beforeEach(() => {
    // `shouldAdvanceTime` fa avanzare da solo (lentamente, in ms reali) il
    // clock finto: così i micro-delay interni di user-event si risolvono,
    // mentre l'Animazione_Cattura resta pilotata in modo deterministico da
    // `vi.advanceTimersByTime(...)`.
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    cleanup();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('è un vero <button> con classe stabile e attivabile da tastiera (Req 1.5)', () => {
    render(
      <CaptureToggle
        pokemonId={1}
        pokemonName="bulbasaur"
        isCaptured={false}
        onCapture={vi.fn()}
        onUncapture={vi.fn()}
        animationMs={ANIMATION_MS}
      />,
    );

    const button = screen.getByRole('button');
    expect(button).toHaveClass('capture-toggle');
    // Deve essere un pulsante non-submit per non inviare eventuali form.
    expect(button).toHaveAttribute('type', 'button');
  });

  it("avvia l'Animazione_Cattura da non catturato entro 100 ms senza catturare subito (Req 2.1)", async () => {
    const onCapture = vi.fn<(id: number) => void>();
    const user = setupUser();
    render(
      <CaptureToggle
        pokemonId={4}
        pokemonName="charmander"
        isCaptured={false}
        onCapture={onCapture}
        onUncapture={vi.fn()}
        animationMs={ANIMATION_MS}
      />,
    );

    const button = screen.getByRole('button');
    await user.click(button);

    // Entro 100 ms l'animazione è iniziata: data-animating="true" e aria-busy.
    vi.advanceTimersByTime(100);
    expect(button).toHaveAttribute('data-animating', 'true');
    expect(button).toHaveAttribute('aria-busy', 'true');
    // La cattura NON è ancora avvenuta prima del termine dell'animazione (Req 2.2).
    expect(onCapture).not.toHaveBeenCalled();
  });

  it("cattura al termine dell'animazione e azzera lo stato busy (Req 2.2)", async () => {
    const onCapture = vi.fn<(id: number) => void>();
    const user = setupUser();
    render(
      <CaptureToggle
        pokemonId={7}
        pokemonName="squirtle"
        isCaptured={false}
        onCapture={onCapture}
        onUncapture={vi.fn()}
        animationMs={ANIMATION_MS}
      />,
    );

    const button = screen.getByRole('button');
    await user.click(button);

    // Portiamo il clock oltre la durata dell'animazione. L'avanzamento del
    // timer finto fa scattare il callback che aggiorna lo stato React: lo
    // avvolgiamo in `act` così il re-render (data-animating/aria-busy azzerati)
    // è applicato prima delle assert.
    act(() => {
      vi.advanceTimersByTime(ANIMATION_MS);
    });

    expect(onCapture).toHaveBeenCalledTimes(1);
    expect(onCapture).toHaveBeenCalledWith(7);
    // Al termine l'animazione è finita e lo stato busy è azzerato.
    expect(button).not.toHaveAttribute('data-animating', 'true');
    expect(button).not.toHaveAttribute('aria-busy', 'true');
  });

  it("espone aria-busy=true durante l'animazione (Req 2.4)", async () => {
    const user = setupUser();
    render(
      <CaptureToggle
        pokemonId={25}
        pokemonName="pikachu"
        isCaptured={false}
        onCapture={vi.fn()}
        onUncapture={vi.fn()}
        animationMs={ANIMATION_MS}
      />,
    );

    const button = screen.getByRole('button');
    await user.click(button);

    // A metà animazione è ancora busy.
    vi.advanceTimersByTime(ANIMATION_MS / 2);
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it("ignora le attivazioni durante l'animazione senza avviarne una nuova (Req 2.4)", async () => {
    const onCapture = vi.fn<(id: number) => void>();
    const user = setupUser();
    render(
      <CaptureToggle
        pokemonId={4}
        pokemonName="charmander"
        isCaptured={false}
        onCapture={onCapture}
        onUncapture={vi.fn()}
        animationMs={ANIMATION_MS}
      />,
    );

    const button = screen.getByRole('button');
    await user.click(button);

    // Ulteriori attivazioni mentre l'animazione è in corso: devono essere ignorate.
    act(() => {
      vi.advanceTimersByTime(ANIMATION_MS / 4);
    });
    await user.click(button);
    await user.click(button);

    // Portiamo il clock oltre la durata dell'animazione iniziale. L'avanzamento
    // fa scattare il callback che aggiorna lo stato React: lo avvolgiamo in
    // `act` per applicare il re-render prima delle assert.
    act(() => {
      vi.advanceTimersByTime(ANIMATION_MS);
    });

    // Una sola cattura complessiva: le attivazioni durante busy non ne avviano altre.
    expect(onCapture).toHaveBeenCalledTimes(1);
    expect(onCapture).toHaveBeenCalledWith(4);
  });

  it('su un Pokémon già catturato chiama subito onUncapture senza animazione (Req 3.1, 2.5)', async () => {
    const onUncapture = vi.fn<(id: number) => void>();
    const onCapture = vi.fn<(id: number) => void>();
    const user = setupUser();
    render(
      <CaptureToggle
        pokemonId={150}
        pokemonName="mewtwo"
        isCaptured
        onCapture={onCapture}
        onUncapture={onUncapture}
        animationMs={ANIMATION_MS}
      />,
    );

    const button = screen.getByRole('button');
    await user.click(button);

    // Annullamento immediato, nessuna animazione avviata.
    expect(onUncapture).toHaveBeenCalledTimes(1);
    expect(onUncapture).toHaveBeenCalledWith(150);
    expect(onCapture).not.toHaveBeenCalled();
    expect(button).not.toHaveAttribute('data-animating', 'true');
    expect(button).not.toHaveAttribute('aria-busy', 'true');
  });

  it('attiva la stessa azione con click, Enter e Spazio — parità tastiera/mouse (Req 1.5, 1.6)', async () => {
    const onUncapture = vi.fn<(id: number) => void>();
    const user = setupUser();
    // Usiamo un Pokémon già catturato così l'attivazione è sincrona (nessuna
    // animazione), rendendo il confronto tra click/Enter/Spazio diretto.
    render(
      <CaptureToggle
        pokemonId={39}
        pokemonName="jigglypuff"
        isCaptured
        onCapture={vi.fn()}
        onUncapture={onUncapture}
        animationMs={ANIMATION_MS}
      />,
    );

    const button = screen.getByRole('button');

    await user.click(button);
    expect(onUncapture).toHaveBeenCalledTimes(1);

    button.focus();
    await user.keyboard('{Enter}');
    expect(onUncapture).toHaveBeenCalledTimes(2);

    button.focus();
    await user.keyboard(' ');
    expect(onUncapture).toHaveBeenCalledTimes(3);

    // Ogni attivazione, indipendentemente dalla modalità, usa lo stesso id.
    expect(onUncapture).toHaveBeenNthCalledWith(1, 39);
    expect(onUncapture).toHaveBeenNthCalledWith(2, 39);
    expect(onUncapture).toHaveBeenNthCalledWith(3, 39);
  });
});

// -----------------------------------------------------------------------------
// Property test (proprietà universali) del rendering del Toggle_Cattura.
//
// Questi test rendono il componente per stati/nomi generati e verificano
// invarianti di presentazione (data-captured e nome accessibile). Non serve
// alcuna animazione temporizzata: le assert sono sullo stato reso a partire
// dalle props. Per questo usiamo un blocco separato con timer reali e cleanup
// esplicito dopo ogni iterazione di fast-check.
// -----------------------------------------------------------------------------

// I property test (proprietà universali) del rendering del Toggle_Cattura usano
// fast-check (>= 100 iterazioni), coerente con i property test esistenti in
// src/api/__tests__/. L'import di fast-check è in cima al file con gli altri.

/**
 * Nomi di Pokémon plausibili: stringhe non vuote (1..30 caratteri) senza spazi
 * ai bordi, così il confronto sul nome accessibile è deterministico.
 */
const pokemonNameArb: fc.Arbitrary<string> = fc
  .string({ minLength: 1, maxLength: 30 })
  .map((s) => s.trim())
  .filter((s) => s.length >= 1);

/** Id validi: interi positivi >= 1. */
const pokemonIdArb: fc.Arbitrary<number> = fc.integer({ min: 1, max: 100000 });

describe('CaptureToggle — Property 9: riflette lo Stato_Catturato (data-captured)', () => {
  afterEach(() => {
    cleanup();
  });

  // Feature: pokemon-capture-toggle, Property 9: Il Toggle_Cattura riflette lo
  // Stato_Catturato (data-captured). Per ogni id/nome valido e per ogni valore
  // booleano di isCaptured, il Toggle reso espone data-captured uguale a quel
  // valore (che il CSS mappa a opacità 1,0 se catturato e 0,4 altrimenti).
  // Validates: Requirements 1.2, 1.3, 2.3, 3.2
  it('espone data-captured uguale al valore della prop isCaptured', () => {
    fc.assert(
      fc.property(
        pokemonIdArb,
        pokemonNameArb,
        fc.boolean(),
        (pokemonId, pokemonName, isCaptured) => {
          render(
            <CaptureToggle
              pokemonId={pokemonId}
              pokemonName={pokemonName}
              isCaptured={isCaptured}
              onCapture={vi.fn()}
              onUncapture={vi.fn()}
            />,
          );

          const button = screen.getByRole('button');
          expect(button).toHaveAttribute(
            'data-captured',
            isCaptured ? 'true' : 'false',
          );

          cleanup();
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('CaptureToggle — Property 10: il nome accessibile riflette nome e stato', () => {
  afterEach(() => {
    cleanup();
  });

  // Feature: pokemon-capture-toggle, Property 10: Il nome accessibile riflette
  // nome e stato. Per ogni nome di Pokémon e per ogni valore di isCaptured, il
  // nome accessibile del Toggle contiene il nome del Pokémon e indica l'azione
  // disponibile coerente con lo stato (catturare quando non catturato,
  // annullare quando catturato).
  // Validates: Requirements 1.4
  it('il nome accessibile contiene il nome del Pokémon e indica l azione coerente con lo stato', () => {
    fc.assert(
      fc.property(
        pokemonIdArb,
        pokemonNameArb,
        fc.boolean(),
        (pokemonId, pokemonName, isCaptured) => {
          render(
            <CaptureToggle
              pokemonId={pokemonId}
              pokemonName={pokemonName}
              isCaptured={isCaptured}
              onCapture={vi.fn()}
              onUncapture={vi.fn()}
            />,
          );

          // Il pulsante è recuperabile tramite il suo nome accessibile.
          const button = screen.getByRole('button');
          const accessibleName = (
            button.getAttribute('aria-label') ??
            button.textContent ??
            ''
          ).toLowerCase();

          // Contiene il nome del Pokémon.
          expect(accessibleName).toContain(pokemonName.toLowerCase());

          // Indica l'azione coerente con lo stato: quando è catturato l'azione
          // disponibile è l'annullamento; quando non è catturato è la cattura.
          if (isCaptured) {
            expect(accessibleName).toContain('annulla');
          } else {
            expect(accessibleName).toContain('cattura');
          }

          cleanup();
        },
      ),
      { numRuns: 100 },
    );
  });
});
