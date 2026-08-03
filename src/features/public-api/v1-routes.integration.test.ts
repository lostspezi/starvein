import { ObjectId } from "mongodb";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createKey } from "@/features/api-keys/api-keys.service";
import { upsertOreOccurrences } from "@/features/ore-occurrences/ore-occurrences.repository";
import { upsertOres } from "@/features/ores/ores.repository";
import type { Ore } from "@/features/ores/ores.schema";
import { upsertSignatureProfiles } from "@/features/signature-profiles/signature-profiles.repository";
import {
  upsertCelestialBodies,
  upsertStarSystems,
} from "@/features/locations/locations.repository";
import { closeMongo, getDb } from "@/lib/db";

import { GET as getOreByCode } from "@/app/api/v1/ores/[code]/route";
import { GET as getOccurrences } from "@/app/api/v1/ore-occurrences/route";
import { GET as getSignatures } from "@/app/api/v1/signatures/route";
import { GET as getStarSystems } from "@/app/api/v1/star-systems/route";
import { GET as getStarSystem } from "@/app/api/v1/star-systems/[code]/route";
import { GET as getBodies } from "@/app/api/v1/star-systems/[code]/bodies/route";
import { GET as getRefineryMethods } from "@/app/api/v1/refinery-methods/route";
import { GET as getRefineryTerminals } from "@/app/api/v1/refinery-terminals/route";
import { GET as getRefineryYields } from "@/app/api/v1/refinery-yields/route";
import { GET as getPrices } from "@/app/api/v1/prices/[oreCode]/route";
import { GET as getTicker } from "@/app/api/v1/prices/ticker/route";

const bexa: Ore = {
  code: "BEXA",
  name_de: "Bexalit",
  name_en: "Bexalite",
  rarityTier: "rare",
  mineableBy: { ship: true, roc: false, fps: false },
};

const hada: Ore = {
  code: "HADA",
  name_de: "Hadanit",
  name_en: "Hadanite",
  rarityTier: "epic",
  mineableBy: { ship: false, roc: true, fps: true },
};

describe("v1 breadth endpoints", () => {
  let authHeader: Record<string, string>;

  beforeAll(async () => {
    const db = await getDb();
    const created = await createKey(
      db,
      new ObjectId().toHexString(),
      "v1-breadth",
    );
    authHeader = { authorization: `Bearer ${created.key}` };

    await upsertOres(db, [bexa, hada]);
    await upsertStarSystems(db, [
      { code: "STANTON", name: "Stanton", status: "live", uexId: 1 },
      { code: "PYRO", name: "Pyro", status: "live", uexId: 2 },
    ]);
    await upsertCelestialBodies(db, [
      {
        slug: "daymar",
        systemCode: "STANTON",
        type: "moon",
        name: "Daymar",
        parentSlug: "crusader",
      },
    ]);
    await upsertOreOccurrences(db, [
      {
        oreCode: "BEXA",
        systemCode: "STANTON",
        bodySlug: "daymar",
        method: "ship",
        probabilityPercent: 42,
        patchVersion: "4.9.0",
        sourceType: "wiki",
        confidenceScore: 0.9,
        lastVerifiedAt: "2026-08-01T00:00:00.000Z",
      },
      {
        oreCode: "HADA",
        systemCode: "PYRO",
        bodySlug: "daymar",
        method: "roc",
        probabilityPercent: 21,
        patchVersion: "4.9.0",
        sourceType: "wiki",
        confidenceScore: 0.8,
        lastVerifiedAt: "2026-08-01T00:00:00.000Z",
      },
    ]);
    await upsertSignatureProfiles(db, [
      {
        oreCode: "BEXA",
        method: "ship",
        signatureValue: 3600,
        patchVersion: "4.9.0",
        sourceType: "curated",
        confidenceScore: 1,
      },
      {
        oreCode: "HADA",
        method: "roc",
        signatureValue: 4000,
        patchVersion: "4.9.0",
        sourceType: "curated",
        confidenceScore: 1,
      },
    ]);
    await db.collection("refineryMethods").insertOne({
      code: "DINYX",
      name: "Dinyx Solventation",
      ratingYield: 3,
      ratingCost: 1,
      ratingSpeed: 1,
      syncedAt: "2026-08-01T00:00:00.000Z",
    });
    await db.collection("refineryYields").insertOne({
      oreCode: "BEXA",
      terminalId: 11,
      terminalName: "ARC-L1",
      starSystemName: "Stanton",
      bonusPercent: 5,
      syncedAt: "2026-08-01T00:00:00.000Z",
    });
    await db.collection("priceSnapshots").insertOne({
      oreCode: "BEXA",
      kind: "refined",
      terminalId: 11,
      terminalName: "ARC-L1",
      priceBuy: 0,
      priceSell: 7000,
      syncedAt: "2026-08-01T00:00:00.000Z",
    });
  });

  afterAll(async () => {
    await closeMongo();
  });

  function req(path: string) {
    return new Request(`http://localhost${path}`, { headers: authHeader });
  }

  async function data(response: Response) {
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.meta.patchVersion).toBeTruthy();
    return body.data;
  }

  it("serves a single ore and 404s unknown codes", async () => {
    const ore = await data(
      await getOreByCode(req("/api/v1/ores/BEXA"), {
        params: Promise.resolve({ code: "BEXA" }),
      }),
    );
    expect(ore.code).toBe("BEXA");

    const missing = await getOreByCode(req("/api/v1/ores/NOPE"), {
      params: Promise.resolve({ code: "NOPE" }),
    });
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: "not found" });
  });

  it("filters occurrences by ore, system and method", async () => {
    const all = await data(
      await getOccurrences(req("/api/v1/ore-occurrences")),
    );
    expect(all).toHaveLength(2);

    const shipOnly = await data(
      await getOccurrences(req("/api/v1/ore-occurrences?method=ship")),
    );
    expect(shipOnly).toHaveLength(1);
    expect(shipOnly[0].oreCode).toBe("BEXA");

    const bySystem = await data(
      await getOccurrences(req("/api/v1/ore-occurrences?system=PYRO")),
    );
    expect(bySystem).toHaveLength(1);

    const byOre = await data(
      await getOccurrences(req("/api/v1/ore-occurrences?ore=HADA")),
    );
    expect(byOre).toHaveLength(1);
  });

  it("rejects invalid occurrence query enums with 400", async () => {
    const response = await getOccurrences(
      req("/api/v1/ore-occurrences?method=laser"),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid query" });
  });

  it("serves signatures with optional method filter", async () => {
    const all = await data(await getSignatures(req("/api/v1/signatures")));
    expect(all).toHaveLength(2);

    const roc = await data(
      await getSignatures(req("/api/v1/signatures?method=roc")),
    );
    expect(roc).toHaveLength(1);
    expect(roc[0].oreCode).toBe("HADA");

    const bad = await getSignatures(req("/api/v1/signatures?method=nope"));
    expect(bad.status).toBe(400);
  });

  it("serves star systems, single system and its bodies", async () => {
    const systems = await data(
      await getStarSystems(req("/api/v1/star-systems")),
    );
    expect(systems.map((s: { code: string }) => s.code)).toContain("STANTON");

    const single = await data(
      await getStarSystem(req("/api/v1/star-systems/STANTON"), {
        params: Promise.resolve({ code: "STANTON" }),
      }),
    );
    expect(single.name).toBe("Stanton");

    const bodies = await data(
      await getBodies(req("/api/v1/star-systems/STANTON/bodies"), {
        params: Promise.resolve({ code: "STANTON" }),
      }),
    );
    expect(bodies.some((b: { slug: string }) => b.slug === "daymar")).toBe(
      true,
    );

    const missing = await getStarSystem(req("/api/v1/star-systems/NARNIA"), {
      params: Promise.resolve({ code: "NARNIA" }),
    });
    expect(missing.status).toBe(404);

    const missingBodies = await getBodies(
      req("/api/v1/star-systems/NARNIA/bodies"),
      { params: Promise.resolve({ code: "NARNIA" }) },
    );
    expect(missingBodies.status).toBe(404);
  });

  it("serves refinery methods and terminals", async () => {
    const methods = await data(
      await getRefineryMethods(req("/api/v1/refinery-methods")),
    );
    expect(methods[0].code).toBe("DINYX");

    const terminals = await data(
      await getRefineryTerminals(req("/api/v1/refinery-terminals")),
    );
    expect(terminals[0].terminalName).toBe("ARC-L1");
  });

  it("requires an ore for refinery yields", async () => {
    const bad = await getRefineryYields(req("/api/v1/refinery-yields"));
    expect(bad.status).toBe(400);

    const yields = await data(
      await getRefineryYields(req("/api/v1/refinery-yields?ore=BEXA")),
    );
    expect(yields).toHaveLength(1);
    expect(yields[0].bonusPercent).toBe(5);
  });

  it("serves price summaries and 404s unknown ores", async () => {
    const summary = await data(
      await getPrices(req("/api/v1/prices/BEXA"), {
        params: Promise.resolve({ oreCode: "BEXA" }),
      }),
    );
    expect(summary.refined.bestSell).toBeDefined();

    const missing = await getPrices(req("/api/v1/prices/NOPE"), {
      params: Promise.resolve({ oreCode: "NOPE" }),
    });
    expect(missing.status).toBe(404);
  });

  it("serves the price ticker", async () => {
    const ticker = await data(await getTicker(req("/api/v1/prices/ticker")));
    expect(Array.isArray(ticker)).toBe(true);
    expect(ticker.some((t: { oreCode: string }) => t.oreCode === "BEXA")).toBe(
      true,
    );
  });
});
