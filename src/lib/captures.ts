/** Id di cattura minimo valido: intero positivo maggiore o uguale a 1. */
export const MIN_CAPTURE_ID = 1;

/** Insieme immutabile degli id catturati (interi positivi >= 1). */
export type CaptureSet = ReadonlySet<number>;

/** Vero se `id` è un intero positivo valido (>= 1) per la cattura (Req 7.1, 7.7). */
export function isValidCaptureId(id: number): boolean {
  return Number.isInteger(id) && id >= MIN_CAPTURE_ID;
}

/** Insieme vuoto iniziale: nessun Pokémon catturato (Req 7.4). */
export function emptyCaptureSet(): CaptureSet {
  return new Set<number>();
}

/** Predicato di appartenenza: vero se `id` è catturato, falso altrimenti (Req 7.3). */
export function isCaptured(set: CaptureSet, id: number): boolean {
  return set.has(id);
}

/**
 * Aggiunge `id` all'insieme. Idempotente: applicarla due volte produce lo
 * stesso insieme di una sola applicazione (Req 7.5). Ignora id non validi
 * lasciando l'insieme invariato (Req 7.7).
 */
export function capture(set: CaptureSet, id: number): CaptureSet {
  if (!isValidCaptureId(id) || set.has(id)) {
    return set;
  }
  const next = new Set<number>(set);
  next.add(id);
  return next;
}

/**
 * Rimuove `id` dall'insieme. Su un id non presente (Stato_Non_Catturato) lascia
 * l'insieme invariato (Req 7.6). Ignora id non validi (Req 7.7).
 */
export function uncapture(set: CaptureSet, id: number): CaptureSet {
  if (!isValidCaptureId(id) || !set.has(id)) {
    return set;
  }
  const next = new Set<number>(set);
  next.delete(id);
  return next;
}

/** Serializza il CaptureSet in un array ordinato di id (per la persistenza). */
export function serializeCaptureSet(set: CaptureSet): number[] {
  return Array.from(set).sort((a, b) => a - b);
}

/**
 * Normalizza un valore persistito sconosciuto in un CaptureSet valido:
 * accetta solo array di interi positivi, altrimenti insieme vuoto (Req 4.4).
 */
export function normalizeCaptureSet(persisted: unknown): CaptureSet {
  if (!Array.isArray(persisted)) {
    return emptyCaptureSet();
  }
  const valid = new Set<number>();
  for (const element of persisted) {
    if (typeof element !== 'number' || !isValidCaptureId(element)) {
      return emptyCaptureSet();
    }
    valid.add(element);
  }
  return valid;
}
