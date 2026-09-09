import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ErrorMessage } from '../ErrorMessage';

// Unit test (esempi) per il messaggio di Stato_Errore. Il componente mostra
// la categoria dell'errore e il messaggio; espone un comando di retry solo
// quando onRetry e fornito, invocandolo alla selezione.
// _Requirements: 2.3, 2.4, 4.4, 4.5_

describe('ErrorMessage', () => {
  it('mostra la categoria dell\u0027errore e il messaggio (Req 2.3, 4.4)', () => {
    render(
      <ErrorMessage category="errore di rete" message="Impossibile contattare il server" />,
    );

    expect(screen.getByText(/errore di rete/i)).toBeInTheDocument();
    expect(screen.getByText(/impossibile contattare il server/i)).toBeInTheDocument();
  });

  it('mostra un comando di retry quando onRetry e fornito (Req 2.4, 4.5)', () => {
    render(
      <ErrorMessage
        category="risposta HTTP non valida"
        message="Risposta non valida"
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /riprova/i })).toBeInTheDocument();
  });

  it('invoca onRetry quando il comando di retry viene attivato (Req 2.4, 4.5)', async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    render(
      <ErrorMessage
        category="parametri non validi"
        message="Parametri non validi"
        onRetry={onRetry}
      />,
    );

    await user.click(screen.getByRole('button', { name: /riprova/i }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('non mostra alcun comando di retry quando onRetry e assente (Req 4.4)', () => {
    render(
      <ErrorMessage category="risorsa non trovata" message="Il Pokemon non esiste" />,
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
