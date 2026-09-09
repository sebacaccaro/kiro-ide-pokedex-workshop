import { render, screen, act, cleanup } from '@testing-library/react';
import fc from 'fast-check';
import type { JSX } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ThemeProvider, type ThemeStorage } from '../ThemeProvider';
import { useTheme } from '../../hooks/useTheme';
import { DEFAULT_THEME, type ThemeName } from '../../lib/theme';

/** Numero minimo di iterazioni richiesto dal design per le proprietà. */
const NUM_RUNS = 100;

// Unit test (esempi) per il Gestore_Temi lato ThemeProvider.
// Fase RED del TDD: `src/features/ThemeProvider.tsx` non esiste ancora
// (implementazione nel task 8.2). Questi test descrivono il comportamento
// atteso del provider: default a storage vuoto, applicazione di `data-theme`
// alla radice al cambio, persistenza/ripristino dal ThemeStorage e ripiego
// sul Tema_Rosso per un tema persistito non valido.
// _Requirements: 5.2, 5.4, 5.5, 5.6, 5.7_

/** ThemeStorage in-memory mockato: nessuna dipendenza da localStorage reale. */
function createMemoryStorage(initial: string | null = null): ThemeStorage & {
  readonly entries: readonly string[];
} {
  let value: string | null = initial;
  const writes: string[] = [];
  return {
    read(): string | null {
      return value;
    },
    write(next: string): void {
      value = next;
      writes.push(next);
    },
    get entries(): readonly string[] {
      return writes;
    },
  };
}

/**
 * Sonda che espone il tema attivo e un pulsante per cambiarlo, così i test
 * possono osservare `useTheme` e innescare `setTheme` senza altri componenti.
 */
function ThemeProbe({ next }: { readonly next: ThemeName }): JSX.Element {
  const { theme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="current-theme">{theme}</span>
      <button type="button" onClick={() => setTheme(next)}>
        cambia
      </button>
    </div>
  );
}

/** Legge l'attributo `data-theme` applicato alla radice del documento. */
function rootTheme(): string | null {
  return document.documentElement.getAttribute('data-theme');
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    document.documentElement.removeAttribute('data-theme');
  });

  it('usa il Tema_Rosso predefinito quando lo storage è vuoto', () => {
    // Req 5.2: nessun tema persistito -> default rosso.
    const storage = createMemoryStorage(null);

    render(
      <ThemeProvider storage={storage}>
        <ThemeProbe next="diamante" />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('current-theme')).toHaveTextContent(
      DEFAULT_THEME,
    );
    expect(rootTheme()).toBe(DEFAULT_THEME);
  });

  it('applica il nuovo tema come data-theme sulla radice al cambio', async () => {
    // Req 5.4, 5.5: il cambio tema (senza reload) applica il tema alla radice,
    // così vale per entrambe le viste avvolte dal provider.
    const storage = createMemoryStorage(null);

    render(
      <ThemeProvider storage={storage}>
        <ThemeProbe next="diamante" />
      </ThemeProvider>,
    );

    expect(rootTheme()).toBe('rosso');

    await act(async () => {
      screen.getByRole('button', { name: 'cambia' }).click();
    });

    expect(screen.getByTestId('current-theme')).toHaveTextContent('diamante');
    expect(rootTheme()).toBe('diamante');
  });

  it('persiste il tema scelto nel ThemeStorage al cambio', async () => {
    // Req 5.6: la scelta viene scritta nello storage per il ripristino futuro.
    const storage = createMemoryStorage(null);

    render(
      <ThemeProvider storage={storage}>
        <ThemeProbe next="diamante" />
      </ThemeProvider>,
    );

    await act(async () => {
      screen.getByRole('button', { name: 'cambia' }).click();
    });

    expect(storage.read()).toBe('diamante');
  });

  it('ripristina il tema persistito dallo storage all avvio', () => {
    // Req 5.6: reinizializzando dal medesimo storage si ripristina la scelta.
    const storage = createMemoryStorage('diamante');

    render(
      <ThemeProvider storage={storage}>
        <ThemeProbe next="rosso" />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('current-theme')).toHaveTextContent('diamante');
    expect(rootTheme()).toBe('diamante');
  });

  it('ripiega sul Tema_Rosso quando il tema persistito non è valido', () => {
    // Req 5.7: un valore persistito non riconosciuto -> default rosso.
    const storage = createMemoryStorage('celeste');

    render(
      <ThemeProvider storage={storage}>
        <ThemeProbe next="diamante" />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('current-theme')).toHaveTextContent(
      DEFAULT_THEME,
    );
    expect(rootTheme()).toBe(DEFAULT_THEME);
  });
});

// Property-based test (fast-check).
// Feature: pokedex-themed-views, Property 13: La persistenza del tema è un round trip
//
// Validates: Requirements 5.6
//
// Per ogni ThemeName scelto e persistito tramite il ThemeStorage,
// reinizializzando il Gestore_Temi dallo stesso storage il tema attivo
// ripristinato è esattamente quello scelto.

describe('ThemeProvider — Property 13: persistenza del tema come round trip', () => {
  it('per ogni tema scelto, reinizializzando dallo stesso storage ripristina esattamente quel tema', () => {
    fc.assert(
      fc.property(fc.constantFrom<ThemeName>('rosso', 'diamante'), (chosen) => {
        // Storage in-memory condiviso tra le due inizializzazioni del provider.
        const storage = createMemoryStorage(null);

        // Prima inizializzazione: scegliamo e persistiamo il tema.
        render(
          <ThemeProvider storage={storage}>
            <ThemeProbe next={chosen} />
          </ThemeProvider>,
        );

        act(() => {
          screen.getByRole('button', { name: 'cambia' }).click();
        });

        // Smontiamo e ripuliamo lo stato applicato alla radice, così il
        // ripristino dipende esclusivamente dallo storage.
        cleanup();
        document.documentElement.removeAttribute('data-theme');

        // Seconda inizializzazione: nuovo provider sullo stesso storage.
        render(
          <ThemeProvider storage={storage}>
            <ThemeProbe next={chosen} />
          </ThemeProvider>,
        );

        // Round trip: il tema ripristinato coincide con quello scelto.
        expect(screen.getByTestId('current-theme')).toHaveTextContent(chosen);

        // Ripuliamo tra un'iterazione fast-check e l'altra.
        cleanup();
        document.documentElement.removeAttribute('data-theme');
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
