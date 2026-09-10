import { describe, expect, it } from 'vitest';
import fc from 'fast-check';

import {
  capture,
  emptyCaptureSet,
  isCaptured,
  isValidCaptureId,
  normalizeCaptureSet,
  serializeCaptureSet,
  uncapture,
} from '../captures';

// Unit test (esempi/edge) per il core puro del Gestore_Catture (funzioni pure e
// immutabili). Il modulo non esiste ancora: questi test devono fallire (Red).
// _Requirements: 7.1, 7.2, 7.3, 7.4, 7.6, 7.7_

describe('isValidCaptureId', () => {
  it('considera valido l id intero minimo (1)', () => {
    expect(isValidCaptureId(1)).toBe(true);
  });

  it('considera valido un id intero intermedio', () => {
    expect(isValidCaptureId(25)).toBe(true);
  });

  it('considera valido un id intero grande', () => {
    expect(isValidCaptureId(100000)).toBe(true);
  });

  it('considera non valido l id 0', () => {
    expect(isValidCaptureId(0)).toBe(false);
  });

  it('considera non valido un id negativo', () => {
    expect(isValidCaptureId(-3)).toBe(false);
  });

  it('considera non valido un numero non intero', () => {
    expect(isValidCaptureId(1.5)).toBe(false);
  });

  it('considera non valido NaN', () => {
    expect(isValidCaptureId(Number.NaN)).toBe(false);
  });

  it('considera non valido Infinity', () => {
    expect(isValidCaptureId(Number.POSITIVE_INFINITY)).toBe(false);
  });
});

describe('emptyCaptureSet', () => {
  it('restituisce un insieme senza elementi', () => {
    expect(emptyCaptureSet().size).toBe(0);
  });

  it('considera ogni id valido come non catturato all inizio', () => {
    const set = emptyCaptureSet();
    expect(isCaptured(set, 1)).toBe(false);
    expect(isCaptured(set, 42)).toBe(false);
  });
});

describe('capture / isCaptured', () => {
  it('rende catturato un id valido aggiunto a un insieme vuoto', () => {
    const set = capture(emptyCaptureSet(), 4);
    expect(isCaptured(set, 4)).toBe(true);
  });

  it('non modifica l insieme originale (immutabilita)', () => {
    const original = emptyCaptureSet();
    const next = capture(original, 7);
    expect(original.size).toBe(0);
    expect(isCaptured(original, 7)).toBe(false);
    expect(isCaptured(next, 7)).toBe(true);
  });

  it('lascia catturati gli id gia presenti quando ne aggiunge un altro', () => {
    const set = capture(capture(emptyCaptureSet(), 1), 2);
    expect(isCaptured(set, 1)).toBe(true);
    expect(isCaptured(set, 2)).toBe(true);
  });

  it('ignora un id non valido lasciando l insieme invariato', () => {
    const original = capture(emptyCaptureSet(), 1);
    const next = capture(original, 0);
    expect(serializeCaptureSet(next)).toEqual(serializeCaptureSet(original));
    expect(isCaptured(next, 0)).toBe(false);
  });
});

describe('uncapture', () => {
  it('rende non catturato un id precedentemente catturato', () => {
    const set = uncapture(capture(emptyCaptureSet(), 5), 5);
    expect(isCaptured(set, 5)).toBe(false);
  });

  it('lascia l insieme invariato quando l id non e presente (no-op)', () => {
    const original = capture(emptyCaptureSet(), 1);
    const next = uncapture(original, 99);
    expect(serializeCaptureSet(next)).toEqual(serializeCaptureSet(original));
  });

  it('non modifica l insieme originale (immutabilita)', () => {
    const original = capture(emptyCaptureSet(), 3);
    const next = uncapture(original, 3);
    expect(isCaptured(original, 3)).toBe(true);
    expect(isCaptured(next, 3)).toBe(false);
  });

  it('ignora un id non valido lasciando l insieme invariato', () => {
    const original = capture(emptyCaptureSet(), 2);
    const next = uncapture(original, -1);
    expect(serializeCaptureSet(next)).toEqual(serializeCaptureSet(original));
  });
});

describe('serializeCaptureSet', () => {
  it('restituisce un array vuoto per l insieme vuoto', () => {
    expect(serializeCaptureSet(emptyCaptureSet())).toEqual([]);
  });

  it('restituisce gli id ordinati in modo crescente', () => {
    let set = emptyCaptureSet();
    set = capture(set, 7);
    set = capture(set, 1);
    set = capture(set, 4);
    expect(serializeCaptureSet(set)).toEqual([1, 4, 7]);
  });

  it('non contiene duplicati dopo catture ripetute', () => {
    let set = emptyCaptureSet();
    set = capture(set, 3);
    set = capture(set, 3);
    expect(serializeCaptureSet(set)).toEqual([3]);
  });
});

// -----------------------------------------------------------------------------
// Property test (proprietà universali) per il core puro del Gestore_Catture.
// Libreria: fast-check (>= 100 iterazioni). Il modulo non esiste ancora:
// questi test devono fallire (Red). Ogni proprietà = un singolo test dedicato
// con commento tag nel formato richiesto.
// -----------------------------------------------------------------------------

const MIN_CAPTURE_ID = 1;
const MAX_CAPTURE_ID = 100000;

/** Id di cattura validi: interi positivi >= 1. */
const validCaptureId = fc.integer({ min: MIN_CAPTURE_ID, max: MAX_CAPTURE_ID });

/** Un CaptureSet arbitrario, costruito applicando `capture` su id validi. */
const captureSetArb: fc.Arbitrary<ReadonlySet<number>> = fc
  .array(validCaptureId, { maxLength: 20 })
  .map((ids) => ids.reduce((set, id) => capture(set, id), emptyCaptureSet()));

/**
 * Id non validi per la cattura: numeri <= 0, non interi e NaN.
 * (Esclude gli interi positivi >= 1, che sono validi.)
 */
const invalidCaptureId: fc.Arbitrary<number> = fc.oneof(
  fc.integer({ min: -100000, max: 0 }),
  fc.double({ min: -100000, max: 100000, noInteger: true, noNaN: true }),
  fc.constant(Number.NaN),
  fc.constant(Number.POSITIVE_INFINITY),
  fc.constant(Number.NEGATIVE_INFINITY),
);

/** Valore arbitrario `unknown` per testare la normalizzazione difensiva. */
const arbitraryUnknown: fc.Arbitrary<unknown> = fc.anything();

// Feature: pokemon-capture-toggle, Property 1: La cattura rende catturato; il
// set vuoto non cattura nulla.
// Validates: Requirements 7.1, 7.3, 7.4
describe('Property 1: la cattura rende catturato; il set vuoto non cattura nulla', () => {
  it('dopo capture(set, id) l id valido e catturato; emptyCaptureSet non cattura alcun id valido', () => {
    fc.assert(
      fc.property(captureSetArb, validCaptureId, (set, id) => {
        expect(isCaptured(capture(set, id), id)).toBe(true);
        expect(isCaptured(emptyCaptureSet(), id)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});

// Feature: pokemon-capture-toggle, Property 2: L'annullamento rende non
// catturato.
// Validates: Requirements 7.2, 7.3
describe('Property 2: l annullamento rende non catturato', () => {
  it('dopo uncapture(set, id) l id non e catturato', () => {
    fc.assert(
      fc.property(captureSetArb, validCaptureId, (set, id) => {
        expect(isCaptured(uncapture(set, id), id)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});

// Feature: pokemon-capture-toggle, Property 3: Idempotenza della cattura
// (OBBLIGATORIA property-based).
// Validates: Requirements 7.5, 2.5
describe('Property 3: idempotenza della cattura', () => {
  it('capture(capture(set, id), id) e uguale a capture(set, id)', () => {
    fc.assert(
      fc.property(captureSetArb, validCaptureId, (set, id) => {
        const once = capture(set, id);
        const twice = capture(once, id);
        expect(serializeCaptureSet(twice)).toEqual(serializeCaptureSet(once));
      }),
      { numRuns: 100 },
    );
  });
});

// Feature: pokemon-capture-toggle, Property 4: Annullamento di un id assente e
// no-op.
// Validates: Requirements 7.6
describe('Property 4: annullamento di un id assente e no-op', () => {
  it('per ogni id non presente, uncapture(set, id) lascia l insieme invariato', () => {
    fc.assert(
      fc.property(captureSetArb, validCaptureId, (set, id) => {
        // Garantiamo che l id NON sia presente rimuovendolo prima.
        const withoutId = uncapture(set, id);
        const next = uncapture(withoutId, id);
        expect(serializeCaptureSet(next)).toEqual(serializeCaptureSet(withoutId));
      }),
      { numRuns: 100 },
    );
  });
});

// Feature: pokemon-capture-toggle, Property 5: Gli id non validi lasciano
// l'insieme invariato.
// Validates: Requirements 7.7
describe('Property 5: gli id non validi lasciano l insieme invariato', () => {
  it('capture e uncapture con un id non valido restituiscono un insieme uguale all originale', () => {
    fc.assert(
      fc.property(captureSetArb, invalidCaptureId, (set, id) => {
        const original = serializeCaptureSet(set);
        expect(serializeCaptureSet(capture(set, id))).toEqual(original);
        expect(serializeCaptureSet(uncapture(set, id))).toEqual(original);
      }),
      { numRuns: 100 },
    );
  });
});

// Feature: pokemon-capture-toggle, Property 6: Round-trip di persistenza delle
// catture.
// Validates: Requirements 3.3, 4.1, 4.2
describe('Property 6: round-trip di persistenza delle catture', () => {
  it('serialize -> JSON.stringify -> JSON.parse -> normalizeCaptureSet ricostruisce lo stesso insieme', () => {
    fc.assert(
      fc.property(captureSetArb, (set) => {
        const serialized = serializeCaptureSet(set);
        const roundTripped = normalizeCaptureSet(
          JSON.parse(JSON.stringify(serialized)),
        );
        expect(serializeCaptureSet(roundTripped)).toEqual(
          serializeCaptureSet(set),
        );
      }),
      { numRuns: 100 },
    );
  });
});

// Feature: pokemon-capture-toggle, Property 7: Normalizzazione difensiva
// dell'insieme persistito.
// Validates: Requirements 4.4
describe('Property 7: normalizzazione difensiva dell insieme persistito', () => {
  it('normalizeCaptureSet contiene esattamente gli interi positivi se e un array di interi positivi, altrimenti l insieme vuoto', () => {
    fc.assert(
      fc.property(arbitraryUnknown, (value) => {
        const normalized = normalizeCaptureSet(value);
        const isArrayOfPositiveIntegers =
          Array.isArray(value) &&
          value.every(
            (element) =>
              typeof element === 'number' &&
              Number.isInteger(element) &&
              element >= MIN_CAPTURE_ID,
          );

        if (isArrayOfPositiveIntegers) {
          const expected = Array.from(new Set(value as number[])).sort(
            (a, b) => a - b,
          );
          expect(serializeCaptureSet(normalized)).toEqual(expected);
        } else {
          expect(serializeCaptureSet(normalized)).toEqual([]);
        }
      }),
      { numRuns: 100 },
    );
  });
});
