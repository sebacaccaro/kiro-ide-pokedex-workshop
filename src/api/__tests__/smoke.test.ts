import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

// Smoke test: verifica che Vitest e fast-check siano configurati e girino.
// Va rimosso/sostituito dai test reali della feature (task successivi).
describe('setup degli strumenti di test', () => {
  it('esegue un assert di base con Vitest', () => {
    expect(1 + 1).toBe(2);
  });

  it('esegue una property con fast-check', () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (a, b) => a + b === b + a),
      { numRuns: 100 },
    );
  });
});
