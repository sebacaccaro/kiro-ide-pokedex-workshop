import { render, screen, act } from '@testing-library/react';
import type { JSX } from 'react';
import { describe, expect, it } from 'vitest';

import { CaptureProvider, type CaptureStorage } from '../CaptureProvider';
import { useCaptures } from '../../hooks/useCaptures';

// Unit test (esempi) per il Gestore_Catture lato CaptureProvider + useCaptures.
// Fase RED del TDD: `src/features/CaptureProvider.tsx` e
// `src/hooks/useCaptures.ts` non esistono ancora (implementazione nei task
// 5.2 e 5.3). Questi test descrivono il comportamento atteso: lettura e
// normalizzazione difensiva all'avvio, aggiornamento di stato + scrittura
// tramite lo Store_Catture iniettabile con la Chiave_Persistenza, gestione
// del fallimento di scrittura (`hasPersistError`) e uso dell'hook fuori dal
// provider.
// _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.8, 7.1, 7.2, 7.3_

/** Chiave attesa per la persistenza delle catture in localStorage. */
const STORAGE_KEY = 'pokedex-captures';

/**
 * CaptureStorage in-memory mockato: nessuna dipendenza da localStorage reale.
 * Registra le chiamate a `write` per verificare cosa (e quante volte) viene
 * scritto nello Store_Catture (Req 4.8: storage iniettabile e deterministico).
 */
function createMemoryStorage(initial: string | null = null): CaptureStorage & {
  readonly writes: readonly string[];
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
    get writes(): readonly string[] {
      return writes;
    },
  };
}

/** CaptureStorage la cui `read()` solleva sempre (Req 4.5). */
function createThrowingReadStorage(): CaptureStorage {
  return {
    read(): string | null {
      throw new Error('read non disponibile');
    },
    write(): void {
      // no-op
    },
  };
}

/** CaptureStorage con `read` funzionante ma `write` che solleva (Req 4.6). */
function createThrowingWriteStorage(
  initial: string | null = null,
): CaptureStorage {
  return {
    read(): string | null {
      return initial;
    },
    write(): void {
      throw new Error('write non disponibile');
    },
  };
}

/**
 * Sonda che espone lo stato delle catture e pulsanti per invocare i comandi,
 * così i test possono osservare `useCaptures` senza altri componenti.
 */
function CaptureProbe({ id }: { readonly id: number }): JSX.Element {
  const { isCaptured, capture, uncapture, hasPersistError } = useCaptures();
  return (
    <div>
      <span data-testid="captured">{isCaptured(id) ? 'yes' : 'no'}</span>
      <span data-testid="persist-error">
        {hasPersistError ? 'yes' : 'no'}
      </span>
      <button type="button" onClick={() => capture(id)}>
        cattura
      </button>
      <button type="button" onClick={() => uncapture(id)}>
        annulla
      </button>
    </div>
  );
}

function clickButton(name: string): void {
  act(() => {
    screen.getByRole('button', { name }).click();
  });
}

describe('CaptureProvider', () => {
  it('inizializza a insieme vuoto quando lo storage è assente (Req 4.3)', () => {
    const storage = createMemoryStorage(null);

    render(
      <CaptureProvider storage={storage}>
        <CaptureProbe id={1} />
      </CaptureProvider>,
    );

    expect(screen.getByTestId('captured')).toHaveTextContent('no');
  });

  it('inizializza a insieme vuoto quando lo storage contiene JSON non valido (Req 4.4)', () => {
    const storage = createMemoryStorage('non-json');

    render(
      <CaptureProvider storage={storage}>
        <CaptureProbe id={1} />
      </CaptureProvider>,
    );

    expect(screen.getByTestId('captured')).toHaveTextContent('no');
  });

  it('inizializza a insieme vuoto quando lo storage contiene un array non conforme (Req 4.4)', () => {
    // Array con elementi non interi positivi -> normalizzazione a insieme vuoto.
    const storage = createMemoryStorage('[1, "due", -3]');

    render(
      <CaptureProvider storage={storage}>
        <CaptureProbe id={1} />
      </CaptureProvider>,
    );

    expect(screen.getByTestId('captured')).toHaveTextContent('no');
  });

  it('ripristina le catture persistite da un array conforme (Req 4.3)', () => {
    const storage = createMemoryStorage('[1, 4, 7]');

    render(
      <CaptureProvider storage={storage}>
        <CaptureProbe id={4} />
      </CaptureProvider>,
    );

    expect(screen.getByTestId('captured')).toHaveTextContent('yes');
  });

  it('inizializza a insieme vuoto quando read() solleva un errore (Req 4.5)', () => {
    const storage = createThrowingReadStorage();

    render(
      <CaptureProvider storage={storage}>
        <CaptureProbe id={1} />
      </CaptureProvider>,
    );

    expect(screen.getByTestId('captured')).toHaveTextContent('no');
  });

  it('capture aggiorna lo stato e scrive nello Store con la Chiave_Persistenza (Req 4.1, 7.1)', () => {
    const storage = createMemoryStorage(null);

    render(
      <CaptureProvider storage={storage}>
        <CaptureProbe id={1} />
      </CaptureProvider>,
    );

    clickButton('cattura');

    expect(screen.getByTestId('captured')).toHaveTextContent('yes');
    // L'ultima scrittura contiene l'id catturato, serializzato come JSON array.
    const lastWrite = storage.writes[storage.writes.length - 1];
    expect(JSON.parse(lastWrite)).toEqual([1]);
    expect(storage.read()).toBe(lastWrite);
  });

  it('uncapture aggiorna lo stato e scrive nello Store con la Chiave_Persistenza (Req 4.2, 7.2)', () => {
    const storage = createMemoryStorage('[1]');

    render(
      <CaptureProvider storage={storage}>
        <CaptureProbe id={1} />
      </CaptureProvider>,
    );

    expect(screen.getByTestId('captured')).toHaveTextContent('yes');

    clickButton('annulla');

    expect(screen.getByTestId('captured')).toHaveTextContent('no');
    const lastWrite = storage.writes[storage.writes.length - 1];
    expect(JSON.parse(lastWrite)).toEqual([]);
  });

  it('usa window.localStorage con la chiave pokedex-captures come Store predefinito (Req 4.7)', () => {
    // Nessuno storage iniettato: si usa l'adapter di default su localStorage.
    window.localStorage.clear();

    render(
      <CaptureProvider>
        <CaptureProbe id={2} />
      </CaptureProvider>,
    );

    clickButton('cattura');

    const persisted = window.localStorage.getItem(STORAGE_KEY);
    expect(persisted).not.toBeNull();
    expect(JSON.parse(persisted as string)).toEqual([2]);

    window.localStorage.clear();
  });

  it('legge le catture dal localStorage predefinito all avvio (Req 4.3, 4.7)', () => {
    window.localStorage.clear();
    window.localStorage.setItem(STORAGE_KEY, '[5]');

    render(
      <CaptureProvider>
        <CaptureProbe id={5} />
      </CaptureProvider>,
    );

    expect(screen.getByTestId('captured')).toHaveTextContent('yes');

    window.localStorage.clear();
  });

  it('quando write() solleva mantiene lo stato in memoria e segnala hasPersistError (Req 4.6)', () => {
    const storage = createThrowingWriteStorage(null);

    render(
      <CaptureProvider storage={storage}>
        <CaptureProbe id={1} />
      </CaptureProvider>,
    );

    expect(screen.getByTestId('persist-error')).toHaveTextContent('no');

    clickButton('cattura');

    // Lo stato in memoria resta aggiornato nonostante il fallimento di scrittura.
    expect(screen.getByTestId('captured')).toHaveTextContent('yes');
    // Il fallimento di persistenza viene segnalato.
    expect(screen.getByTestId('persist-error')).toHaveTextContent('yes');
  });
});

describe('useCaptures', () => {
  it('lancia un errore se usato fuori da un CaptureProvider (Req 7.1, 7.2, 7.3)', () => {
    // Sopprime il log d'errore di React per il render che lancia.
    expect(() => render(<CaptureProbe id={1} />)).toThrow();
  });
});
