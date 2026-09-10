import { useContext } from 'react';

import {
  CaptureContext,
  type CaptureContextValue,
} from '../features/CaptureProvider';

/** Risultato dell'hook `useCaptures` (Req 7.1, 7.2, 7.3). */
export type UseCapturesResult = CaptureContextValue;

/**
 * Legge/aggiorna le catture dal CaptureContext.
 * Deve essere usato all'interno di un `CaptureProvider`.
 */
export function useCaptures(): UseCapturesResult {
  const context = useContext(CaptureContext);
  if (context === null) {
    throw new Error('useCaptures deve essere usato dentro un CaptureProvider');
  }
  return context;
}
