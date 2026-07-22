import { describe, expect, it } from "vitest";
import { isRouteActive, NAV_ITEMS, navTriggerClasses } from "./nav-items";

describe("NAV_ITEMS", () => {
  it("defines six top-level entries in the agreed order", () => {
    expect(
      NAV_ITEMS.map((item) =>
        item.kind === "group" ? `group:${item.key}` : `link:${item.key}`,
      ),
    ).toEqual([
      "group:mining",
      "link:locations",
      "group:crafting",
      "group:fleet",
      "link:guides",
      "link:companion",
    ]);
  });

  it("groups the mining reference routes under mining", () => {
    const mining = NAV_ITEMS.find(
      (item) => item.kind === "group" && item.key === "mining",
    );
    expect(mining?.kind).toBe("group");
    if (mining?.kind !== "group") return;
    expect(mining.children.map((child) => child.href)).toEqual([
      "/ores",
      "/occurrences",
      "/signatures",
      "/compare",
      "/calculator",
    ]);
  });

  it("groups crafting and fleet routes", () => {
    const byKey = Object.fromEntries(
      NAV_ITEMS.filter((item) => item.kind === "group").map((item) => [
        item.key,
        item,
      ]),
    );
    expect(
      byKey.crafting.kind === "group" &&
        byKey.crafting.children.map((child) => child.href),
    ).toEqual(["/materials", "/blueprints"]);
    expect(
      byKey.fleet.kind === "group" &&
        byKey.fleet.children.map((child) => child.href),
    ).toEqual(["/ships", "/loadouts"]);
  });

  it("covers exactly the expected routes without duplicates", () => {
    const hrefs = NAV_ITEMS.flatMap((item) =>
      item.kind === "group"
        ? item.children.map((child) => child.href)
        : [item.href],
    );
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect([...hrefs].sort()).toEqual(
      [
        "/ores",
        "/blueprints",
        "/materials",
        "/locations",
        "/occurrences",
        "/signatures",
        "/compare",
        "/calculator",
        "/loadouts",
        "/ships",
        "/guides",
        "/companion",
      ].sort(),
    );
  });
});

describe("isRouteActive", () => {
  it("matches the exact route", () => {
    expect(isRouteActive("/ores", "/ores")).toBe(true);
  });

  it("matches sub-routes", () => {
    expect(isRouteActive("/locations/stanton/crusader", "/locations")).toBe(
      true,
    );
  });

  it("does not match unrelated routes sharing a prefix", () => {
    expect(isRouteActive("/oresight", "/ores")).toBe(false);
  });

  it("does not match the home route", () => {
    expect(isRouteActive("/", "/ores")).toBe(false);
  });
});

describe("navTriggerClasses", () => {
  it("marks the active state with the cyan HUD indicator", () => {
    expect(navTriggerClasses(true)).toContain("text-accent-cyan");
    expect(navTriggerClasses(true)).toContain("after:bg-accent-cyan");
  });

  it("keeps inactive entries muted with a hover state", () => {
    const classes = navTriggerClasses(false);
    expect(classes).toContain("text-text-muted");
    expect(classes).toContain("hover:text-text-primary");
  });
});
