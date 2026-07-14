/** "125" → "2h 05m", "45" → "45m" — kompakte Restzeit für die Jobliste. */
export function formatRemaining(minutes: number): string {
  const clamped = Math.max(0, minutes);
  const hours = Math.floor(clamped / 60);
  const rest = clamped % 60;
  if (hours === 0) {
    return `${rest}m`;
  }
  return `${hours}h ${String(rest).padStart(2, "0")}m`;
}
