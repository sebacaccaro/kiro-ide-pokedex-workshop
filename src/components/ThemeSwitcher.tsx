import type { ReactElement } from 'react';

import type { ThemeName } from '../lib/theme';

// Componente di presentazione "stupido" per il Selettore_Tema. Riceve il tema
// attivo e la callback onChange via props e mostra esattamente due opzioni
// (Tema_Rosso, Tema_Diamante) come gruppo di radio; invoca onChange con il
// ThemeName scelto alla selezione.
// _Requirements: 5.1, 5.3_

export interface ThemeSwitcherProps {
  readonly theme: ThemeName;
  readonly onChange: (name: ThemeName) => void;
}

/** Opzioni disponibili con la relativa etichetta visibile. */
const THEME_OPTIONS: ReadonlyArray<{ readonly value: ThemeName; readonly label: string }> = [
  { value: 'rosso', label: 'Rosso' },
  { value: 'diamante', label: 'Diamante' },
];

export function ThemeSwitcher({ theme, onChange }: ThemeSwitcherProps): ReactElement {
  return (
    <div role="radiogroup" aria-label="Selettore tema">
      {THEME_OPTIONS.map((option) => (
        <label key={option.value}>
          <input
            type="radio"
            name="theme"
            value={option.value}
            checked={theme === option.value}
            onChange={() => onChange(option.value)}
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}
