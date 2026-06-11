/**
 * Formatting utilities for CAR - Algoritmia
 *
 * Rules:
 *  - fmtCurrency: monetary values → no decimals (integers), with $ prefix
 *  - fmtRoas: ROAS multipliers → always 2 decimals (e.g. 16.65x)
 *  - fmtPct: percentages → 1 decimal (e.g. 14.1%)
 *  - fmtNum: plain counts/integers → locale-formatted, no decimals
 *  - fmtK: compact thousands (1.2k) for chart axes / small spaces
 */

/** Format a currency value without decimals. e.g. 974.69 → "$ 975" */
export function fmtCurrency(n: number | null | undefined, prefix = '$ '): string {
  if (n == null || isNaN(n as number)) return '—';
  return `${prefix}${Math.round(n).toLocaleString('es-AR')}`;
}

/** Format ROAS with 2 decimals. e.g. 16.65 → "16.65x" */
export function fmtRoas(n: number | null | undefined): string {
  if (n == null || isNaN(n as number) || n <= 0) return '—';
  return `${(n as number).toFixed(2)}x`;
}

/** Format a percentage with 1 decimal. e.g. 14.1 → "14.1%" */
export function fmtPct(n: number | null | undefined): string {
  if (n == null || isNaN(n as number)) return '—';
  return `${(n as number).toFixed(1)}%`;
}

/** Format a whole number with locale separators. e.g. 36619 → "36.619" */
export function fmtNum(n: number | null | undefined): string {
  if (n == null || isNaN(n as number)) return '—';
  return Math.round(n as number).toLocaleString('es-AR');
}

/**
 * Compact format for chart axes / small spaces.
 * e.g. 1200 → "1.2k", 974 → "975"
 * Monetary: prefix with $
 */
export function fmtK(n: number, monetary = false): string {
  const prefix = monetary ? '$' : '';
  if (Math.abs(n) >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${prefix}${(n / 1_000).toFixed(1)}k`;
  return `${prefix}${Math.round(n)}`;
}

/** CPA / cost-per-result: if > 0, no decimals; dash otherwise */
export function fmtCpa(n: number | null | undefined): string {
  if (!n || n <= 0) return '—';
  return fmtCurrency(n);
}
