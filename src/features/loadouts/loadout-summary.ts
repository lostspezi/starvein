/** Kompakte Laser-Zeile für die Karte, z. B. "3× Helix II". */
export function summarizeLasers(
  hardpoints: { laserCode: string }[],
  laserNames: Map<string, string>,
): string {
  const counts = new Map<string, number>();
  for (const { laserCode } of hardpoints) {
    const name = laserNames.get(laserCode) ?? laserCode;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => (count > 1 ? `${count}× ${name}` : name))
    .join(", ");
}
