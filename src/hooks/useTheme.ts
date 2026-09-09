import { useContext } from 'react';

import {
  ThemeContext,
  type ThemeContextValue,
} from '../features/ThemeProvider';

/** Risultato dell'hook `useTheme` (Req 5.4, 5.6, 9.4). */
export type UseThemeResult = ThemeContextValue;

/**
 * Legge/aggiorna il tema attivo dal ThemeContext.
 * Deve essere usato all'interno di un `ThemeProvider`.
 */
export function useTheme(): UseThemeResult {
  const context = useContext(ThemeContext);
  if (context === null) {
    throw new Error('useTheme deve essere usato dentro un ThemeProvider');
  }
  return context;
}
