/**
 * Unisce baseUrl e segmenti con esattamente un singolo '/' tra le parti,
 * indipendentemente da '/' finali/iniziali (Requirement 3.3). Il '//' dello
 * schema del base URL viene preservato.
 */
export function buildUrl(baseUrl: string, ...segments: string[]): string {
  const trimmedBase = baseUrl.replace(/\/+$/, '');
  const normalizedSegments = segments.map((segment) =>
    segment.replace(/^\/+|\/+$/g, ''),
  );

  return [trimmedBase, ...normalizedSegments].join('/');
}

/** Serializza i parametri di query in modo deterministico e ordinato per chiave. */
export function buildQuery(params: Record<string, string | number>): string {
  return Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
}
