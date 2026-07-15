import { describe, expect, it } from "vitest";
import { buildGuideSearchText, extractGuideText } from "./guides.search";
import type { GuideContent } from "./guides.schema";

function doc(content: unknown[]): GuideContent {
  return { type: "doc", content } as unknown as GuideContent;
}

describe("extractGuideText", () => {
  it("collects text from nested nodes", () => {
    const text = extractGuideText(
      doc([
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Aaron Halo" }],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Scan for quantainium" }],
                },
              ],
            },
          ],
        },
      ]),
    );
    expect(text).toContain("Aaron Halo");
    expect(text).toContain("Scan for quantainium");
  });

  it("ignores image and youtube nodes", () => {
    const text = extractGuideText(
      doc([
        {
          type: "image",
          attrs: { src: "/api/guides/images/0123456789abcdef01234567" },
        },
        {
          type: "youtube",
          attrs: { src: "https://youtube.com/watch?v=x" },
        },
      ]),
    );
    expect(text).toBe("");
  });
});

describe("buildGuideSearchText", () => {
  it("combines title, description and body, lowercased", () => {
    const search = buildGuideSearchText({
      title: "Mining Quantainium",
      description: "Aaron Halo route",
      content: doc([
        {
          type: "paragraph",
          content: [{ type: "text", text: "Bring a MOLE" }],
        },
      ]),
    });
    expect(search).toBe("mining quantainium aaron halo route bring a mole");
  });

  it("works without a description", () => {
    const search = buildGuideSearchText({
      title: "Title",
      content: doc([]),
    });
    expect(search).toBe("title");
  });
});
