import type { ReactElement } from 'react';

// Componente di presentazione per lo Stato_Caricamento. Rende un indicatore
// accessibile (role="status") che espone la label fornita, con un fallback
// ragionevole quando la label e assente.
// _Requirements: 2.1, 4.1_

export interface LoadingIndicatorProps {
  readonly label?: string;
}

/** Testo di default quando nessuna label e fornita. */
const DEFAULT_LABEL = 'Caricamento in corso';

export function LoadingIndicator({
  label,
}: LoadingIndicatorProps): ReactElement {
  return (
    <div role="status" className="loading-indicator">
      <span className="loading-indicator__spinner" aria-hidden="true" />
      {label ?? DEFAULT_LABEL}
    </div>
  );
}
