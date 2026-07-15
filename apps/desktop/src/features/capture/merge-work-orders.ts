import type { ParsedItem, ParsedWorkOrder } from "./ocr-parse";

/**
 * Verschmilzt die Parse-Ergebnisse mehrerer Frames desselben Terminals
 * (Multi-Frame-Capture) zu einem robusten Ergebnis. Ein einzelner
 * Screenshot verliest durch Glow/Animation/Laufschrift mal Zahlen, mal
 * ganze Zeilen; über ~5 Frames stimmt ein Mehrheitsvotum diese Ausreißer
 * weg und füllt Lücken auf.
 *
 * Zeilen werden über die y-Position der Namenszeile zusammengeführt
 * (`sourceY`) — das Terminal ist pro Burst räumlich statisch, nur lange
 * Namen scrollen horizontal. Zeilen ohne Koordinaten (String-Fallback)
 * gruppieren über den normalisierten Namen.
 */

export type MergedItem = {
  /** Alle beobachteten Namensvarianten der Zeile (Laufschrift-Fragmente). */
  fragments: string[];
  quantityScu: number | null;
  qualityRating: number | null;
  sourceY: number | null;
};

export type MergedWorkOrder = {
  items: MergedItem[];
  durationMinutes: number | null;
  unmatched: string[];
};

/** y-Abstand (px), bis zu dem zwei Namenszeilen als dieselbe Zeile gelten. */
const MERGE_Y_TOLERANCE = 25;

type Group = {
  sourceY: number | null;
  ys: number[];
  nameKey: string | null;
  fragments: string[];
  quantities: number[];
  qualities: number[];
};

function normalizeName(value: string): string {
  return value.toUpperCase().replace(/[^A-ZÄÖÜ0-9]/g, "");
}

/** Häufigster Wert; bei Gleichstand der numerisch größte. Null wenn leer. */
function vote(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const counts = new Map<number, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  let best = Number.NEGATIVE_INFINITY;
  let bestCount = 0;
  for (const [value, count] of counts) {
    if (count > bestCount || (count === bestCount && value > best)) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}

function groupRepresentativeY(group: Group): number {
  const sum = group.ys.reduce((total, y) => total + y, 0);
  return sum / group.ys.length;
}

function findGroup(groups: Group[], item: ParsedItem): Group | undefined {
  if (item.sourceY !== null) {
    return groups.find(
      (group) =>
        group.sourceY !== null &&
        Math.abs(groupRepresentativeY(group) - (item.sourceY as number)) <=
          MERGE_Y_TOLERANCE,
    );
  }
  const key = normalizeName(item.oreName);
  return groups.find((group) => group.nameKey === key);
}

export function mergeWorkOrders(frames: ParsedWorkOrder[]): MergedWorkOrder {
  const groups: Group[] = [];
  const durations: number[] = [];
  const unmatched: string[] = [];
  const seenUnmatched = new Set<string>();

  for (const frame of frames) {
    if (frame.durationMinutes !== null) {
      durations.push(frame.durationMinutes);
    }
    for (const line of frame.unmatched) {
      if (!seenUnmatched.has(line)) {
        seenUnmatched.add(line);
        unmatched.push(line);
      }
    }
    for (const item of frame.items) {
      let group = findGroup(groups, item);
      if (group === undefined) {
        group = {
          sourceY: item.sourceY,
          ys: item.sourceY === null ? [] : [item.sourceY],
          nameKey: item.sourceY === null ? normalizeName(item.oreName) : null,
          fragments: [],
          quantities: [],
          qualities: [],
        };
        groups.push(group);
      } else if (item.sourceY !== null) {
        group.ys.push(item.sourceY);
      }
      if (!group.fragments.includes(item.oreName)) {
        group.fragments.push(item.oreName);
      }
      if (item.quantityScu !== null) {
        group.quantities.push(item.quantityScu);
      }
      if (item.qualityRating !== null) {
        group.qualities.push(item.qualityRating);
      }
    }
  }

  return {
    items: groups.map((group) => ({
      fragments: group.fragments,
      quantityScu: vote(group.quantities),
      qualityRating: vote(group.qualities),
      sourceY: group.sourceY,
    })),
    durationMinutes: vote(durations),
    unmatched,
  };
}
