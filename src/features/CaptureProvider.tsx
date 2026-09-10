import {
  createContext,
  useCallback,
  useMemo,
  useState,
  type JSX,
  type ReactNode,
} from 'react';

import {
  capture as captureId,
  emptyCaptureSet,
  isCaptured as isCapturedInSet,
  normalizeCaptureSet,
  serializeCaptureSet,
  uncapture as uncaptureId,
  type CaptureSet,
} from '../lib/captures';

/** Astrazione di storage iniettabile per rendere i test deterministici (Req 4.8). */
export interface CaptureStorage {
  read(): string | null;
  write(value: string): void;
}

/** Valore esposto dal CaptureContext (Req 7.1–7.3, 4.6). */
export interface CaptureContextValue {
  /** Predicato: vero se il Pokémon `id` è catturato (Req 7.3). */
  readonly isCaptured: (id: number) => boolean;
  /** Pone il Pokémon in Stato_Catturato e persiste (Req 2, 4.1). */
  readonly capture: (id: number) => void;
  /** Pone il Pokémon in Stato_Non_Catturato e persiste (Req 3, 4.2). */
  readonly uncapture: (id: number) => void;
  /** True se l'ultima scrittura nello Store_Catture è fallita (Req 4.6). */
  readonly hasPersistError: boolean;
}

export interface CaptureProviderProps {
  readonly children: ReactNode;
  /** Default: adapter su window.localStorage. Iniettabile nei test (Req 4.7, 4.8). */
  readonly storage?: CaptureStorage;
}

/** Chiave usata per persistere le catture in `window.localStorage`. */
const STORAGE_KEY = 'pokedex-captures';

/**
 * Context del Gestore_Catture. `null` fuori da un `CaptureProvider`, così
 * l'hook `useCaptures` può segnalare un uso errato.
 */
export const CaptureContext = createContext<CaptureContextValue | null>(null);

/** Adapter di default su `window.localStorage` (Req 4.7). */
function createLocalStorageAdapter(): CaptureStorage {
  return {
    read(): string | null {
      return window.localStorage.getItem(STORAGE_KEY);
    },
    write(value: string): void {
      window.localStorage.setItem(STORAGE_KEY, value);
    },
  };
}

/**
 * Legge lo Store_Catture e normalizza in modo difensivo (Req 4.3, 4.4, 4.5):
 * assenza/JSON non valido/array non conforme → insieme vuoto; se `read()`
 * solleva, cattura l'eccezione e ripiega sull'insieme vuoto.
 */
function readInitialCaptureSet(storage: CaptureStorage): CaptureSet {
  try {
    const raw = storage.read();
    if (raw === null) {
      return emptyCaptureSet();
    }
    const parsed: unknown = JSON.parse(raw);
    return normalizeCaptureSet(parsed);
  } catch {
    return emptyCaptureSet();
  }
}

/**
 * Fornisce il CaptureContext: legge l'insieme persistito con inizializzazione
 * difensiva, applica le funzioni pure ai comandi e riscrive lo Store con
 * `serializeCaptureSet` + `JSON.stringify`; se la scrittura fallisce, mantiene
 * lo stato in memoria e segnala `hasPersistError` (Req 4.1–4.6).
 */
export function CaptureProvider({
  children,
  storage,
}: CaptureProviderProps): JSX.Element {
  const captureStorage = useMemo<CaptureStorage>(
    () => storage ?? createLocalStorageAdapter(),
    [storage],
  );

  const [captured, setCaptured] = useState<CaptureSet>(() =>
    readInitialCaptureSet(captureStorage),
  );
  const [hasPersistError, setHasPersistError] = useState(false);

  const persist = useCallback(
    (next: CaptureSet): void => {
      try {
        captureStorage.write(JSON.stringify(serializeCaptureSet(next)));
        setHasPersistError(false);
      } catch {
        setHasPersistError(true);
      }
    },
    [captureStorage],
  );

  const isCaptured = useCallback(
    (id: number): boolean => isCapturedInSet(captured, id),
    [captured],
  );

  const capture = useCallback(
    (id: number): void => {
      const next = captureId(captured, id);
      setCaptured(next);
      persist(next);
    },
    [captured, persist],
  );

  const uncapture = useCallback(
    (id: number): void => {
      const next = uncaptureId(captured, id);
      setCaptured(next);
      persist(next);
    },
    [captured, persist],
  );

  const value = useMemo<CaptureContextValue>(
    () => ({ isCaptured, capture, uncapture, hasPersistError }),
    [isCaptured, capture, uncapture, hasPersistError],
  );

  return (
    <CaptureContext.Provider value={value}>
      {children}
    </CaptureContext.Provider>
  );
}
