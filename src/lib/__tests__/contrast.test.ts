import { describe, expect, it } from 'vitest';

import { contrastRatio } from '../contrast';

// Unit test (esempio) mirato sul contrasto WCAG della coppia testo/sfondo del
// Tema_Rosso. `contrastRatio` è una funzione pura che calcola il rapporto di
// contrasto secondo la formula WCAG 2.x (luminanza relativa), restituendo un
// valore >= 1. Il testo `#0F380F` su sfondo `#9BBC0F` deve raggiungere almeno
// il rapporto AA per testo normale (4.5:1).
// _Requirements: 6.2_

const RED_THEME_TEXT = '#0F380F';
const RED_THEME_BACKGROUND = '#9BBC0F';
const WCAG_AA_NORMAL_TEXT = 4.5;

describe('contrastRatio', () => {
  it('garantisce almeno 4.5:1 tra il testo #0F380F e lo sfondo #9BBC0F del Tema_Rosso', () => {
    expect(contrastRatio(RED_THEME_TEXT, RED_THEME_BACKGROUND)).toBeGreaterThanOrEqual(
      WCAG_AA_NORMAL_TEXT,
    );
  });

  it("è simmetrico rispetto all'ordine dei due colori", () => {
    expect(contrastRatio(RED_THEME_TEXT, RED_THEME_BACKGROUND)).toBeCloseTo(
      contrastRatio(RED_THEME_BACKGROUND, RED_THEME_TEXT),
    );
  });
});
