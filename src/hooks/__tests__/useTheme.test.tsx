import { renderHook, act } from '@testing-library/react';
import type { JSX, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useTheme } from '../useTheme';
import { ThemeProvider, type ThemeStorage } from '../../features/ThemeProvider';
import { DEFAULT_THEME } from '../../lib/theme';

// Unit test (esempi) per l'hook `useTheme`.
// Fase RED del TDD: `src/hooks/useTheme.ts` e `src/features/ThemeProvider.tsx`
// non esistono ancora (implementazione nel task 8.2). Questi test descrivono
// il comportamento atteso di `useTheme` quando avvolto in `ThemeProvider`:
// default a storage vuoto, aggiornamento del tema con `setTheme` applicato
// alla radice, persistenza/ripristino dallo storage e ripiego sul Tema_Rosso
// per un tema persistito non valido.
// _Requirements: 5.2, 5.4, 5.5, 5.6, 5.7_

/** ThemeStorage in-memory mockato: nessuna dipendenza da localStorage reale. */
function createMemoryStorage(initial: string | null = null): ThemeStorage {
  let value: string | null = initial;
  return {
    read(): string | null {
      return value;
    },
    write(next: string): void {
      value = next;
    },
  };
}

/** Costruisce un wrapper `ThemeProvider` con lo storage mockato dato. */
function makeWrapper(storage: ThemeStorage) {
  return function Wrapper({
    children,
  }: {
    readonly children: ReactNode;
  }): JSX.Element {
    return <ThemeProvider storage={storage}>{children}</ThemeProvider>;
  };
}

/** Legge l'attributo `data-theme` applicato alla radice del documento. */
function rootTheme(): string | null {
  return document.documentElement.getAttribute('data-theme');
}

describe('useTheme', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    document.documentElement.removeAttribute('data-theme');
  });

  it('espone il Tema_Rosso predefinito con storage vuoto', () => {
    // Req 5.2
    const storage = createMemoryStorage(null);

    const { result } = renderHook(() => useTheme(), {
      wrapper: makeWrapper(storage),
    });

    expect(result.current.theme).toBe(DEFAULT_THEME);
  });

  it('aggiorna il tema con setTheme e lo applica alla radice', () => {
    // Req 5.4, 5.5
    const storage = createMemoryStorage(null);

    const { result } = renderHook(() => useTheme(), {
      wrapper: makeWrapper(storage),
    });

    act(() => {
      result.current.setTheme('diamante');
    });

    expect(result.current.theme).toBe('diamante');
    expect(rootTheme()).toBe('diamante');
  });

  it('persiste il tema scelto tramite setTheme', () => {
    // Req 5.6
    const storage = createMemoryStorage(null);

    const { result } = renderHook(() => useTheme(), {
      wrapper: makeWrapper(storage),
    });

    act(() => {
      result.current.setTheme('diamante');
    });

    expect(storage.read()).toBe('diamante');
  });

  it('ripristina il tema persistito dallo storage', () => {
    // Req 5.6
    const storage = createMemoryStorage('diamante');

    const { result } = renderHook(() => useTheme(), {
      wrapper: makeWrapper(storage),
    });

    expect(result.current.theme).toBe('diamante');
  });

  it('ripiega sul Tema_Rosso quando il tema persistito non è valido', () => {
    // Req 5.7
    const storage = createMemoryStorage('non-un-tema');

    const { result } = renderHook(() => useTheme(), {
      wrapper: makeWrapper(storage),
    });

    expect(result.current.theme).toBe(DEFAULT_THEME);
  });
});
