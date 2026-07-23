import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render";
import type { EquipmentCatalog } from "./compatibility";
import { LoadoutBuilder } from "./LoadoutBuilder";

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: pushMock, refresh: vi.fn() }),
}));

const fetchMock = vi.fn();

const patchVersion = "4.7";

const catalog: EquipmentCatalog = {
  vehicles: [
    {
      code: "mole",
      name: "MOLE",
      manufacturer: "Argo Astronautics",
      method: "ship",
      hardpoints: [{ size: 2 }, { size: 2 }, { size: 2 }],
      gadgetCapable: true,
      stockLaserCode: "arbor-mh2",
      patchVersion,
    },
    {
      code: "roc",
      name: "ROC",
      manufacturer: "Greycat Industrial",
      method: "roc",
      hardpoints: [{ size: 0 }],
      gadgetCapable: true,
      stockLaserCode: "arbor-mhv",
      patchVersion,
    },
  ],
  lasers: [
    {
      code: "arbor-mh2",
      name: "Arbor MH2",
      manufacturer: "Greycat Industrial",
      size: 2,
      moduleSlots: 2,
      stats: {
        laserPower: 2400,
        extractionLaserPower: 2590,
        optimalRange: 90,
        maxRange: 270,
      },
      modifiers: {},
      patchVersion,
    },
    {
      code: "helix-ii",
      name: "Helix II",
      manufacturer: "Thermyte Concern",
      size: 2,
      moduleSlots: 3,
      stats: {
        laserPower: 4080,
        extractionLaserPower: 2590,
        optimalRange: 30,
        maxRange: 90,
      },
      modifiers: {},
      patchVersion,
    },
    {
      code: "arbor-mh1",
      name: "Arbor MH1",
      manufacturer: "Greycat Industrial",
      size: 1,
      moduleSlots: 1,
      stats: {
        laserPower: 1890,
        extractionLaserPower: 1850,
        optimalRange: 60,
        maxRange: 180,
      },
      modifiers: {},
      patchVersion,
    },
    {
      code: "arbor-mhv",
      name: "Arbor MHV",
      manufacturer: "Greycat Industrial",
      size: 0,
      moduleSlots: 2,
      stats: {
        laserPower: null,
        extractionLaserPower: null,
        optimalRange: 5,
        maxRange: 15,
      },
      modifiers: {},
      patchVersion,
    },
  ],
  modules: [
    {
      code: "rieger-c3",
      name: "Rieger-C3",
      manufacturer: "Shubin Interstellar",
      type: "passive",
      charges: null,
      durationSeconds: null,
      modifiers: { laserPower: 1.25 },
      patchVersion,
    },
  ],
  gadgets: [
    {
      code: "optimax",
      name: "OptiMax",
      manufacturer: "Greycat Industrial",
      modifiers: {},
      patchVersion,
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
});

function renderBuilder() {
  renderWithIntl(<LoadoutBuilder catalog={catalog} />, { locale: "en" });
}

describe("LoadoutBuilder", () => {
  it("shows one laser select per hardpoint after picking a vehicle", async () => {
    const user = userEvent.setup();
    renderBuilder();

    await user.click(
      screen.getByRole("button", { name: "MOLE — Argo Astronautics" }),
    );

    expect(
      screen.getByRole("combobox", { name: "Laser for hardpoint 1" }),
    ).toBeVisible();
    expect(
      screen.getByRole("combobox", { name: "Laser for hardpoint 3" }),
    ).toBeVisible();
  });

  it("prefills the stock laser and offers only size-compatible lasers", async () => {
    const user = userEvent.setup();
    renderBuilder();

    await user.click(
      screen.getByRole("button", { name: "MOLE — Argo Astronautics" }),
    );

    const laserSelect = screen.getByRole("combobox", {
      name: "Laser for hardpoint 1",
    });
    expect(laserSelect).toHaveValue("arbor-mh2");
    const options = within(laserSelect).getAllByRole("option");
    const values = options.map((o) => o.getAttribute("value"));
    expect(values).toContain("helix-ii");
    expect(values).not.toContain("arbor-mh1");
    expect(values).not.toContain("arbor-mhv");
  });

  it("caps module selects at the laser's slot count", async () => {
    const user = userEvent.setup();
    renderBuilder();

    await user.click(
      screen.getByRole("button", { name: "MOLE — Argo Astronautics" }),
    );

    // Arbor MH2 (Stock) hat 2 Slots
    expect(
      screen.getByRole("combobox", { name: "Module slot 2 on hardpoint 1" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("combobox", { name: "Module slot 3 on hardpoint 1" }),
    ).toBeNull();

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Laser for hardpoint 1" }),
      "helix-ii",
    );
    expect(
      screen.getByRole("combobox", { name: "Module slot 3 on hardpoint 1" }),
    ).toBeVisible();
  });

  it("filters vehicles by mining method", async () => {
    const user = userEvent.setup();
    renderBuilder();

    await user.click(screen.getByRole("button", { name: "ROC" }));

    expect(
      screen.queryByRole("button", { name: "MOLE — Argo Astronautics" }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "ROC — Greycat Industrial" }),
    ).toBeVisible();
  });

  it("submits the assembled loadout and redirects to the detail page", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: "new-loadout" }), { status: 200 }),
    );
    const user = userEvent.setup();
    renderBuilder();

    await user.click(
      screen.getByRole("button", { name: "MOLE — Argo Astronautics" }),
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Module slot 1 on hardpoint 1" }),
      "rieger-c3",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Loadout name" }),
      "Mein MOLE",
    );
    await user.click(screen.getByRole("button", { name: "Save loadout" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/loadouts",
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse(
      (fetchMock.mock.calls[0]?.[1] as RequestInit).body as string,
    );
    expect(body.name).toBe("Mein MOLE");
    expect(body.vehicleCode).toBe("mole");
    expect(body.hardpoints).toEqual([
      { hardpointIndex: 0, laserCode: "arbor-mh2", moduleCodes: ["rieger-c3"] },
      { hardpointIndex: 1, laserCode: "arbor-mh2", moduleCodes: [] },
      { hardpointIndex: 2, laserCode: "arbor-mh2", moduleCodes: [] },
    ]);
    expect(pushMock).toHaveBeenCalledWith("/loadouts/new-loadout");
  });

  it("reveals the crafted bonus input only after checking the crafted box", async () => {
    const user = userEvent.setup();
    renderBuilder();

    await user.click(
      screen.getByRole("button", { name: "MOLE — Argo Astronautics" }),
    );

    const crafted = screen.getByRole("checkbox", {
      name: "Crafted laser on hardpoint 1",
    });
    expect(crafted).not.toBeChecked();
    expect(
      screen.queryByRole("spinbutton", {
        name: "Crafted laser power bonus (%) for hardpoint 1",
      }),
    ).toBeNull();

    await user.click(crafted);
    expect(
      screen.getByRole("spinbutton", {
        name: "Crafted laser power bonus (%) for hardpoint 1",
      }),
    ).toBeVisible();
  });

  it("submits the crafted bonus per hardpoint and omits it when unchecked", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: "new-loadout" }), { status: 200 }),
    );
    const user = userEvent.setup();
    renderBuilder();

    await user.click(
      screen.getByRole("button", { name: "MOLE — Argo Astronautics" }),
    );
    await user.click(
      screen.getByRole("checkbox", { name: "Crafted laser on hardpoint 1" }),
    );
    await user.type(
      screen.getByRole("spinbutton", {
        name: "Crafted laser power bonus (%) for hardpoint 1",
      }),
      "29",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Loadout name" }),
      "Craft-MOLE",
    );
    await user.click(screen.getByRole("button", { name: "Save loadout" }));

    const body = JSON.parse(
      (fetchMock.mock.calls[0]?.[1] as RequestInit).body as string,
    );
    expect(body.hardpoints[0]).toEqual({
      hardpointIndex: 0,
      laserCode: "arbor-mh2",
      moduleCodes: [],
      craftedBonusPct: 29,
    });
    // nicht angehakte Hardpoints tragen das Feld gar nicht
    expect(body.hardpoints[1]).toEqual({
      hardpointIndex: 1,
      laserCode: "arbor-mh2",
      moduleCodes: [],
    });
  });

  it("clamps out-of-range input and defaults an empty bonus to 0", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: "new-loadout" }), { status: 200 }),
    );
    const user = userEvent.setup();
    renderBuilder();

    await user.click(
      screen.getByRole("button", { name: "MOLE — Argo Astronautics" }),
    );
    await user.click(
      screen.getByRole("checkbox", { name: "Crafted laser on hardpoint 1" }),
    );
    await user.type(
      screen.getByRole("spinbutton", {
        name: "Crafted laser power bonus (%) for hardpoint 1",
      }),
      "150",
    );
    // Hardpoint 2: Checkbox an, Input leer lassen
    await user.click(
      screen.getByRole("checkbox", { name: "Crafted laser on hardpoint 2" }),
    );
    await user.type(
      screen.getByRole("textbox", { name: "Loadout name" }),
      "Clamp-MOLE",
    );
    await user.click(screen.getByRole("button", { name: "Save loadout" }));

    const body = JSON.parse(
      (fetchMock.mock.calls[0]?.[1] as RequestInit).body as string,
    );
    expect(body.hardpoints[0].craftedBonusPct).toBe(100);
    expect(body.hardpoints[1].craftedBonusPct).toBe(0);
  });

  it("resets the crafted state when the laser changes", async () => {
    const user = userEvent.setup();
    renderBuilder();

    await user.click(
      screen.getByRole("button", { name: "MOLE — Argo Astronautics" }),
    );
    await user.click(
      screen.getByRole("checkbox", { name: "Crafted laser on hardpoint 1" }),
    );
    await user.type(
      screen.getByRole("spinbutton", {
        name: "Crafted laser power bonus (%) for hardpoint 1",
      }),
      "29",
    );

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Laser for hardpoint 1" }),
      "helix-ii",
    );

    expect(
      screen.getByRole("checkbox", { name: "Crafted laser on hardpoint 1" }),
    ).not.toBeChecked();
    expect(
      screen.queryByRole("spinbutton", {
        name: "Crafted laser power bonus (%) for hardpoint 1",
      }),
    ).toBeNull();
  });

  it("prefills the crafted state in edit mode", () => {
    renderWithIntl(
      <LoadoutBuilder
        catalog={catalog}
        loadoutId="loadout-1"
        initialValue={{
          name: "Craft-MOLE",
          method: "ship",
          vehicleCode: "mole",
          hardpoints: [
            {
              hardpointIndex: 0,
              laserCode: "arbor-mh2",
              moduleCodes: [],
              craftedBonusPct: 15,
            },
            { hardpointIndex: 1, laserCode: "arbor-mh2", moduleCodes: [] },
          ],
          gadgetCodes: [],
          isPublic: false,
        }}
      />,
      { locale: "en" },
    );

    expect(
      screen.getByRole("checkbox", { name: "Crafted laser on hardpoint 1" }),
    ).toBeChecked();
    expect(
      screen.getByRole("spinbutton", {
        name: "Crafted laser power bonus (%) for hardpoint 1",
      }),
    ).toHaveValue(15);
    expect(
      screen.getByRole("checkbox", { name: "Crafted laser on hardpoint 2" }),
    ).not.toBeChecked();
  });

  it("disables submit until the loadout is complete", async () => {
    const user = userEvent.setup();
    renderBuilder();

    expect(screen.getByRole("button", { name: "Save loadout" })).toBeDisabled();

    await user.click(
      screen.getByRole("button", { name: "MOLE — Argo Astronautics" }),
    );
    expect(screen.getByRole("button", { name: "Save loadout" })).toBeDisabled();

    await user.type(
      screen.getByRole("textbox", { name: "Loadout name" }),
      "Mein MOLE",
    );
    expect(screen.getByRole("button", { name: "Save loadout" })).toBeEnabled();
  });
});
