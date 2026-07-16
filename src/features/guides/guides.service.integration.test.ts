import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import { closeMongo, getDb } from "@/lib/db";
import { CURRENT_PATCH_VERSION } from "@/lib/patch";
import { uniqueDbName } from "@/test/factories";
import { listPublicGuides } from "./guides.repository";
import type { GuideInput, GuideTranslationInput } from "./guides.schema";
import {
  createGuide,
  deleteGuide,
  getGuideForViewer,
  GuideNotFoundError,
  GuideValidationError,
  toggleGuideVote,
  updateGuide,
  type GuideRequester,
} from "./guides.service";

const OWNER = "user-owner";
const VISITOR = "user-visitor";
const ADMIN: GuideRequester = { id: "user-admin", role: "admin" };
const OWNER_REQ: GuideRequester = { id: OWNER, role: "user" };
const VISITOR_REQ: GuideRequester = { id: VISITOR, role: "user" };

function paragraph(text: string): GuideTranslationInput["content"] {
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  } as GuideTranslationInput["content"];
}

const validInput: GuideInput = {
  tags: ["Mining", "quantainium", "mining"],
  isPublic: true,
  translations: [
    {
      language: "en",
      title: "Mining Quantainium in Aaron Halo",
      description: "Where to look and how to scan",
      content: paragraph("Head to the Aaron Halo."),
    },
  ],
};

describe("guides service", () => {
  let db: Db;

  beforeEach(async () => {
    db = await getDb(uniqueDbName("guides-service"));
  });

  afterAll(async () => {
    await closeMongo();
  });

  describe("createGuide", () => {
    it("stamps server-managed fields and normalizes tags", async () => {
      const created = await createGuide(db, OWNER, validInput);

      expect(created.id).toBeTruthy();
      expect(created.ownerUserId).toBe(OWNER);
      expect(created.patchVersion).toBe(CURRENT_PATCH_VERSION);
      expect(created.createdAt).toBe(created.updatedAt);
      // trimmed, lowercased, de-duplicated
      expect(created.tags).toEqual(["mining", "quantainium"]);
    });

    it("stores multiple translations with per-language searchText", async () => {
      const created = await createGuide(db, OWNER, {
        ...validInput,
        translations: [
          validInput.translations[0],
          {
            language: "de",
            title: "Quantainium im Aaron Halo abbauen",
            content: paragraph("Flieg in den Aaron Halo."),
          },
        ],
      });

      expect(created.translations).toHaveLength(2);
      const de = created.translations.find((t) => t.language === "de");
      expect(de?.searchText).toContain("aaron halo");
    });

    it("rejects a whitespace-only title", async () => {
      await expect(
        createGuide(db, OWNER, {
          ...validInput,
          translations: [{ ...validInput.translations[0], title: "   " }],
        }),
      ).rejects.toThrow(GuideValidationError);
    });

    it("stamps a searchText that makes body text findable", async () => {
      const created = await createGuide(db, OWNER, validInput);
      expect(created.translations[0].searchText).toContain("aaron halo");

      const hits = await listPublicGuides(db, { q: "aaron halo" });
      expect(hits.map((g) => g.id)).toContain(created.id);
    });
  });

  describe("updateGuide", () => {
    it("replaces translations and bumps updatedAt", async () => {
      const created = await createGuide(db, OWNER, validInput);
      const updated = await updateGuide(db, OWNER, created.id, {
        translations: [
          {
            language: "en",
            title: "Updated title",
            content: paragraph("New body"),
          },
        ],
      });
      expect(updated.translations[0].title).toBe("Updated title");
      expect(updated.createdAt).toBe(created.createdAt);
    });

    it("keeps translations on a visibility-only update", async () => {
      const created = await createGuide(db, OWNER, validInput);
      const updated = await updateGuide(db, OWNER, created.id, {
        isPublic: false,
      });
      expect(updated.isPublic).toBe(false);
      expect(updated.translations[0].title).toBe(
        validInput.translations[0].title,
      );
    });

    it("throws NotFound for non-owners", async () => {
      const created = await createGuide(db, OWNER, validInput);
      await expect(
        updateGuide(db, VISITOR, created.id, { isPublic: false }),
      ).rejects.toThrow(GuideNotFoundError);
    });

    it("throws NotFound for missing guides", async () => {
      await expect(
        updateGuide(db, OWNER, "missing", { isPublic: false }),
      ).rejects.toThrow(GuideNotFoundError);
    });
  });

  describe("deleteGuide", () => {
    it("deletes own guides", async () => {
      const created = await createGuide(db, OWNER, validInput);
      await deleteGuide(db, OWNER_REQ, created.id);
      await expect(
        getGuideForViewer(db, created.id, OWNER),
      ).resolves.toBeNull();
    });

    it("lets an admin delete someone else's guide", async () => {
      const created = await createGuide(db, OWNER, validInput);
      await deleteGuide(db, ADMIN, created.id);
      await expect(
        getGuideForViewer(db, created.id, OWNER),
      ).resolves.toBeNull();
    });

    it("throws NotFound when a non-owner non-admin tries to delete", async () => {
      const created = await createGuide(db, OWNER, validInput);
      await expect(deleteGuide(db, VISITOR_REQ, created.id)).rejects.toThrow(
        GuideNotFoundError,
      );
      await expect(
        getGuideForViewer(db, created.id, OWNER),
      ).resolves.toMatchObject({ id: created.id });
    });
  });

  describe("toggleGuideVote", () => {
    it("adds and removes a vote on repeated calls", async () => {
      const created = await createGuide(db, OWNER, validInput);

      const voted = await toggleGuideVote(db, VISITOR, created.id);
      expect(voted.votes.up).toBe(1);
      expect(voted.voters).toEqual([VISITOR]);

      const unvoted = await toggleGuideVote(db, VISITOR, created.id);
      expect(unvoted.votes.up).toBe(0);
      expect(unvoted.voters).toEqual([]);
    });

    it("rejects voting the own guide", async () => {
      const created = await createGuide(db, OWNER, validInput);
      await expect(toggleGuideVote(db, OWNER, created.id)).rejects.toThrow(
        GuideValidationError,
      );
    });

    it("throws NotFound for private guides", async () => {
      const created = await createGuide(db, OWNER, {
        ...validInput,
        isPublic: false,
      });
      await expect(toggleGuideVote(db, VISITOR, created.id)).rejects.toThrow(
        GuideNotFoundError,
      );
    });

    it("throws NotFound for missing guides", async () => {
      await expect(toggleGuideVote(db, VISITOR, "missing")).rejects.toThrow(
        GuideNotFoundError,
      );
    });
  });

  describe("votes lifecycle", () => {
    it("stamps zero votes on creation", async () => {
      const created = await createGuide(db, OWNER, validInput);
      expect(created.votes).toEqual({ up: 0 });
      expect(created.voters).toEqual([]);
    });

    it("keeps votes when the guide is edited", async () => {
      const created = await createGuide(db, OWNER, validInput);
      await toggleGuideVote(db, VISITOR, created.id);

      const updated = await updateGuide(db, OWNER, created.id, {
        tags: ["mining", "updated"],
      });

      expect(updated.votes.up).toBe(1);
      expect(updated.voters).toEqual([VISITOR]);
    });
  });

  describe("getGuideForViewer", () => {
    it("shows public guides to everyone", async () => {
      const created = await createGuide(db, OWNER, validInput);
      await expect(
        getGuideForViewer(db, created.id, null),
      ).resolves.toMatchObject({ id: created.id });
    });

    it("hides private guides from everyone but the owner", async () => {
      const created = await createGuide(db, OWNER, {
        ...validInput,
        isPublic: false,
      });
      await expect(
        getGuideForViewer(db, created.id, OWNER),
      ).resolves.toMatchObject({ id: created.id });
      await expect(
        getGuideForViewer(db, created.id, VISITOR),
      ).resolves.toBeNull();
      await expect(getGuideForViewer(db, created.id, null)).resolves.toBeNull();
    });
  });
});
