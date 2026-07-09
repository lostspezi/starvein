/**
 * Wilson-Score-Lower-Bound — der klassische "Best"-Sortieralgorithmus
 * (CLAUDE.md §6.3). Verhindert, dass wenige Upvotes ohne Gegenstimmen
 * höher gewichtet werden als viele Stimmen mit leichtem Widerspruch.
 *
 * z = 1.2816 (wie in Reddits "Best"-Implementierung): damit erreicht der
 * minimale Accept-Fall aus der Spezifikation (5 klare Upvotes) einen Score
 * von ~0.75 >= 0.7. Mit z = 1.96 läge 5:0 nur bei ~0.57 und die
 * Schwellwerte aus CLAUDE.md §6.3 wären praktisch unerreichbar.
 */
const Z = 1.281551565545;

export function wilsonLowerBound(up: number, down: number): number {
  const n = up + down;
  if (n === 0) return 0;

  const phat = up / n;
  const z2 = Z * Z;

  const numerator =
    phat + z2 / (2 * n) - Z * Math.sqrt((phat * (1 - phat) + z2 / (4 * n)) / n);
  const bound = numerator / (1 + z2 / n);

  return Math.min(1, Math.max(0, bound));
}
