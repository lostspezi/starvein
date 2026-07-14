import type { Db } from "mongodb";
import {
  refineryTerminalSchema,
  type RefineryTerminal,
} from "@starvein/shared/refinery-catalog";
import {
  refineryMethodSchema,
  type RefineryMethod,
} from "./refinery-and-prices.schema";

const YIELDS = "refineryYields";
const METHODS = "refineryMethods";

const NO_ID = { projection: { _id: 0 } } as const;

export type { RefineryTerminal };

/**
 * Distinct-Liste aller Refinery-Terminals aus den gesyncten Yields —
 * es gibt keine eigene Terminal-Collection (UEX-Sync schreibt nur Yields).
 */
export async function listRefineryTerminals(
  db: Db,
): Promise<RefineryTerminal[]> {
  const docs = await db
    .collection(YIELDS)
    .aggregate([
      {
        $group: {
          _id: "$terminalId",
          terminalId: { $first: "$terminalId" },
          terminalName: { $first: "$terminalName" },
          starSystemName: { $first: "$starSystemName" },
        },
      },
      { $project: { _id: 0 } },
    ])
    .toArray();
  return docs
    .map((doc) => refineryTerminalSchema.parse(doc))
    .sort((a, b) => a.terminalName.localeCompare(b.terminalName, "en"));
}

export async function listRefineryMethods(db: Db): Promise<RefineryMethod[]> {
  const docs = await db.collection(METHODS).find({}, NO_ID).toArray();
  return docs
    .map((doc) => refineryMethodSchema.parse(doc))
    .sort((a, b) => a.name.localeCompare(b.name, "en"));
}
