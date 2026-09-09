import type { ReactElement } from 'react';

import type { PokeApiError } from '../api/errors';

// Componente di presentazione per lo Stato_Errore. Mostra la categoria e il
// messaggio dell'errore; espone un comando di retry solo quando `onRetry` e
// fornito, invocandolo alla selezione.
// _Requirements: 2.3, 2.4, 4.4, 4.5_

export interface ErrorMessageProps {
  readonly category: PokeApiError['category'];
  readonly message: string;
  readonly onRetry?: () => void;
}

export function ErrorMessage({ category, message, onRetry }: ErrorMessageProps): ReactElement {
  return (
    <div role="alert">
      <p className="error-category">{category}</p>
      <p className="error-message">{message}</p>
      {onRetry !== undefined ? (
        <button type="button" onClick={onRetry}>
          Riprova
        </button>
      ) : null}
    </div>
  );
}
