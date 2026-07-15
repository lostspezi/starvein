import { describe, expect, it } from "vitest";
import {
  guideContentSchema,
  guideInputSchema,
  type GuideInput,
} from "./guides.schema";

const validDoc: GuideInput["content"] = {
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
    title: "How to mine Quantainium",
    description: "A short intro",
    tags: ["mining", "quantainium"],
    content: validDoc,
    isPublic: true,
  };

  it("accepts a valid input", () => {
    expect(guideInputSchema.safeParse(baseInput).success).toBe(true);
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

  it("rejects an empty title", () => {
    expect(
      guideInputSchema.safeParse({ ...baseInput, title: "" }).success,
    ).toBe(false);
  });
});
