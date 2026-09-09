import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { ThemeName } from '../../lib/theme';
import { ThemeSwitcher } from '../ThemeSwitcher';

// Unit test (esempi) per il Selettore_Tema. Il componente e "stupido":
// riceve il tema attivo e la callback onChange via props, mostra esattamente
// due opzioni (rosso, diamante) e invoca onChange alla selezione.
// _Requirements: 5.1, 5.3_

describe('ThemeSwitcher', () => {
  it('mostra esattamente due opzioni: Tema_Rosso e Tema_Diamante (Req 5.1, 5.3)', () => {
    render(<ThemeSwitcher theme="rosso" onChange={vi.fn()} />);

    expect(screen.getByRole('radio', { name: /rosso/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /diamante/i })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(2);
  });

  it('marca come selezionata l\u0027opzione del tema attivo (Req 5.3)', () => {
    render(<ThemeSwitcher theme="diamante" onChange={vi.fn()} />);

    expect(screen.getByRole('radio', { name: /diamante/i })).toBeChecked();
    expect(screen.getByRole('radio', { name: /rosso/i })).not.toBeChecked();
  });

  it('invoca onChange con il tema scelto alla selezione (Req 5.3)', async () => {
    const onChange = vi.fn<(name: ThemeName) => void>();
    const user = userEvent.setup();
    render(<ThemeSwitcher theme="rosso" onChange={onChange} />);

    await user.click(screen.getByRole('radio', { name: /diamante/i }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('diamante');
  });
});
