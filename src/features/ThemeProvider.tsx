import {
  createContext,
  useCallback,
  useMemo,
  useState,
  type JSX,
  type ReactNode,
} from 'react';

import { normalizeThemeName, type ThemeName } from '../lib/theme';

/** Astrazione di storage iniettabile per rendere i test deterministici (Req 9.5). */
export interface ThemeStorage {
  read(): string | null;
  write(value: string): void;
}

/** Valore esposto dal ThemeContext (Req 5.4, 5.6). */
export interface ThemeContextValue {
  readonly theme: ThemeName;
  readonly setTheme: (name: ThemeName) => void;
}

export interface ThemeProviderProps {
  readonly children: ReactNode;
  /** Default: adapter su window.localStorage. Iniettabile nei test. */
  readonly storage?: ThemeStorage;
}

/** Chiave usata per persistere il tema in `window.localStorage`. */
const STORAGE_KEY = 'pokedex-theme';

/**
 * Context del Gestore_Temi. `null` fuori da un `ThemeProvider`, così l'hook
 * `useTheme` può segnalare un uso errato.
 */
export const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Adapter di default su `window.localStorage` (Req 5.6). */
function createLocalStorageAdapter(): ThemeStorage {
  return {
    read(): string | null {
      return window.localStorage.getItem(STORAGE_KEY);
    },
    write(value: string): void {
      window.localStorage.setItem(STORAGE_KEY, value);
    },
  };
}

/** Applica il tema come `data-theme` sull'elemento radice del documento (Req 5.5). */
function applyThemeToRoot(theme: ThemeName): void {
  document.documentElement.setAttribute('data-theme', theme);
}

/**
 * Fornisce il ThemeContext: legge il tema persistito (o DEFAULT_THEME),
 * lo applica come data-theme sull'elemento radice e lo ripersiste ad ogni
 * cambio (Req 5.2, 5.5, 5.6, 5.7).
 */
export function ThemeProvider({
  children,
  storage,
}: ThemeProviderProps): JSX.Element {
  const themeStorage = useMemo<ThemeStorage>(
    () => storage ?? createLocalStorageAdapter(),
    [storage],
  );

  const [theme, setThemeState] = useState<ThemeName>(() => {
    const initial = normalizeThemeName(themeStorage.read());
    applyThemeToRoot(initial);
    return initial;
  });

  const setTheme = useCallback(
    (name: ThemeName): void => {
      setThemeState(name);
      applyThemeToRoot(name);
      themeStorage.write(name);
    },
    [themeStorage],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme }),
    [theme, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
