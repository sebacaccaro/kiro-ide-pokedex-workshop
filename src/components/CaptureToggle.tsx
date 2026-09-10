import { useCallback, useEffect, useRef, useState } from 'react';
import type { JSX, MouseEvent } from 'react';

/** Durata di default dell'Animazione_Cattura in ms (range 300–2000) (Req 2.2). */
const DEFAULT_ANIMATION_MS = 700;

export interface CaptureToggleProps {
  readonly pokemonId: number;
  readonly pokemonName: string;
  /** Stato_Catturato corrente (opacità 1,0 vs 0,4) (Req 1.2, 1.3). */
  readonly isCaptured: boolean;
  /** Chiamata al termine dell'Animazione_Cattura per catturare (Req 2.2). */
  readonly onCapture: (id: number) => void;
  /** Chiamata immediatamente per annullare la cattura (Req 3.1). */
  readonly onUncapture: (id: number) => void;
  /** Durata dell'Animazione_Cattura in ms (300–2000). Default: 700 (Req 2.2). */
  readonly animationMs?: number;
}

/**
 * Pulsante Poké Ball di presentazione (Toggle_Cattura). Detiene solo lo stato
 * locale dell'animazione (busy); non conosce la persistenza né il tema.
 *
 * - Rende un vero `<button type="button">` con classe stabile `capture-toggle`
 *   e `data-captured` (`'true'`/`'false'`) per pilotare l'opacità via CSS
 *   (Req 1.2, 1.3). Essendo un `<button>`, click e Enter/Spazio attivano la
 *   stessa azione (Req 1.5, 1.6).
 * - Il nome accessibile (`aria-label`) riflette azione e stato (Req 1.4).
 * - Su un Pokémon già catturato annulla subito, senza animazione (Req 3.1, 2.5).
 * - Su un Pokémon non catturato e non in animazione avvia l'Animazione_Cattura
 *   (busy, `data-animating`, `aria-busy`), e al termine del timer chiama
 *   `onCapture` (Req 2.1, 2.2, 2.4). Le attivazioni durante busy sono ignorate.
 * - L'attivazione non deve propagare il click alla selezione della voce
 *   (`stopPropagation`), così catturare non apre il dettaglio.
 * - L'aspetto per tema è guidato dal CSS via `data-theme`: nessuna dipendenza
 *   JS dal tema (Req 6.x).
 */
export function CaptureToggle({
  pokemonId,
  pokemonName,
  isCaptured,
  onCapture,
  onUncapture,
  animationMs = DEFAULT_ANIMATION_MS,
}: CaptureToggleProps): JSX.Element {
  const [isAnimating, setIsAnimating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pulizia del timer al unmount per evitare aggiornamenti su componente smontato.
  useEffect(
    () => () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    },
    [],
  );

  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      // Non propagare al contenitore della voce: catturare non apre il dettaglio.
      event.stopPropagation();

      // Già catturato: annulla subito, nessuna animazione (Req 3.1, 2.5).
      if (isCaptured) {
        onUncapture(pokemonId);
        return;
      }

      // Animazione in corso: ignora l'attivazione, nessuna nuova animazione (Req 2.4).
      if (isAnimating) {
        return;
      }

      // Non catturato e non busy: avvia l'Animazione_Cattura (Req 2.1).
      setIsAnimating(true);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        setIsAnimating(false);
        onCapture(pokemonId);
      }, animationMs);
    },
    [animationMs, isAnimating, isCaptured, onCapture, onUncapture, pokemonId],
  );

  const label = isCaptured
    ? `Annulla la cattura di ${pokemonName}`
    : `Cattura ${pokemonName}`;

  return (
    <button
      type="button"
      className="capture-toggle"
      data-captured={isCaptured ? 'true' : 'false'}
      data-animating={isAnimating ? 'true' : undefined}
      aria-busy={isAnimating ? 'true' : undefined}
      aria-label={label}
      onClick={handleClick}
    />
  );
}
