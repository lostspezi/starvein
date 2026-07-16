import { describe, expect, it } from "vitest";
import {
  guideContentSchema,
  guideInputSchema,
  guideSchema,
  type GuideContent,
  type GuideInput,
} from "./guides.schema";

const validDoc: GuideContent = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Mining a Quantainium rock" }],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Fire the " },
        { type: "text", text: "laser", marks: [{ type: "bold" }] },
        {
          type: "text",
          text: " guide",
          marks: [{ type: "link", attrs: { href: "https://uexcorp.space" } }],
        },
      ],
    },
    {
      type: "image",
      attrs: {
        src: "/api/guides/images/0123456789abcdef01234567",
        alt: "rock",
      },
    },
    {
      type: "youtube",
      attrs: { src: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
    },
  ],
};

describe("guideContentSchema", () => {
  it("accepts a valid TipTap document", () => {
    expect(guideContentSchema.safeParse(validDoc).success).toBe(true);
  });

  it("rejects unknown node types", () => {
    const doc = {
      type: "doc",
      content: [{ type: "script", content: [{ type: "text", text: "x" }] }],
    };
    expect(guideContentSchema.safeParse(doc).success).toBe(false);
  });

  it("rejects a link mark with a javascript: href", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "click",
              marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
            },
          ],
        },
      ],
    };
    expect(guideContentSchema.safeParse(doc).success).toBe(false);
  });

  it("rejects an image from an external source", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "image",
          attrs: { src: "https://evil.example/tracker.png" },
        },
      ],
    };
    expect(guideContentSchema.safeParse(doc).success).toBe(false);
  });

  it("rejects a youtube node with a non-youtube src", () => {
    const doc = {
      type: "doc",
      content: [{ type: "youtube", attrs: { src: "https://vimeo.com/12345" } }],
    };
    expect(guideContentSchema.safeParse(doc).success).toBe(false);
  });

  it("rejects headings deeper than level 3", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 5 },
          content: [{ type: "text", text: "too deep" }],
        },
      ],
    };
    expect(guideContentSchema.safeParse(doc).success).toBe(false);
  });
});

describe("guideInputSchema", () => {
  const baseInput: GuideInput = {
    tags: ["mining", "quantainium"],
    isPublic: true,
    translations: [
      {
        language: "en",
        title: "How to mine Quantainium",
        description: "A short intro",
        content: validDoc,
      },
      {
        language: "de",
        title: "Quantainium abbauen",
        content: validDoc,
      },
    ],
  };

  it("accepts a valid multilingual input", () => {
    expect(guideInputSchema.safeParse(baseInput).success).toBe(true);
  });

  it("requires at least one translation", () => {
    const input = { ...baseInput, translations: [] };
    expect(guideInputSchema.safeParse(input).success).toBe(false);
  });

  it("rejects duplicate languages", () => {
    const input = {
      ...baseInput,
      translations: [
        { language: "en", title: "A", content: validDoc },
        { language: "en", title: "B", content: validDoc },
      ],
    };
    expect(guideInputSchema.safeParse(input).success).toBe(false);
  });

  it("rejects an unknown language", () => {
    const input = {
      ...baseInput,
      translations: [{ language: "xx", title: "A", content: validDoc }],
    };
    expect(guideInputSchema.safeParse(input).success).toBe(false);
  });

  it("rejects more than eight tags", () => {
    const input = {
      ...baseInput,
      tags: ["a", "b", "c", "d", "e", "f", "g", "h", "i"],
    };
    expect(guideInputSchema.safeParse(input).success).toBe(false);
  });

  it("rejects unknown fields (strict)", () => {
    const input = { ...baseInput, ownerUserId: "hacker" };
    expect(guideInputSchema.safeParse(input).success).toBe(false);
  });

  it("rejects an empty title in a translation", () => {
    const input = {
      ...baseInput,
      translations: [{ language: "en", title: "", content: validDoc }],
    };
    expect(guideInputSchema.safeParse(input).success).toBe(false);
  });
});

describe("guideSchema votes", () => {
  const baseGuide = {
    id: "guide-1",
    tags: ["mining"],
    translations: [
      {
        language: "en",
        title: "Sample guide",
        content: { type: "doc" },
        searchText: "sample guide",
      },
    ],
    ownerUserId: "user-1",
    isPublic: true,
    patchVersion: "4.8.0",
    createdAt: "2026-07-16T00:00:00.000Z",
    updatedAt: "2026-07-16T00:00:00.000Z",
  };

  it("defaults votes and voters for documents without vote fields", () => {
    const guide = guideSchema.parse(baseGuide);
    expect(guide.votes).toEqual({ up: 0 });
    expect(guide.voters).toEqual([]);
  });

  it("keeps stored votes and voters", () => {
    const guide = guideSchema.parse({
      ...baseGuide,
      votes: { up: 2 },
      voters: ["user-a", "user-b"],
    });
    expect(guide.votes.up).toBe(2);
    expect(guide.voters).toEqual(["user-a", "user-b"]);
  });

  it("rejects negative vote counts", () => {
    const result = guideSchema.safeParse({ ...baseGuide, votes: { up: -1 } });
    expect(result.success).toBe(false);
  });
});
