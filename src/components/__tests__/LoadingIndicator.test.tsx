import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LoadingIndicator } from '../LoadingIndicator';

// Unit test (esempi) per l'indicatore di Stato_Caricamento. Il componente
// rende un indicatore accessibile (role="status") e usa la label fornita,
// con un fallback ragionevole quando la label e assente.
// _Requirements: 2.1, 4.1_

describe('LoadingIndicator', () => {
  it('rende un indicatore accessibile con role status', () => {
    render(<LoadingIndicator />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('mostra la label fornita nell\u0027indicatore', () => {
    render(<LoadingIndicator label="Caricamento in corso" />);

    expect(screen.getByRole('status')).toHaveTextContent(/caricamento in corso/i);
  });
});
