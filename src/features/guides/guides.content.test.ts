import { describe, expect, it } from "vitest";
import { renderGuideHtml } from "./guides.content";
import type { GuideContent } from "./guides.schema";

function doc(content: unknown[]): GuideContent {
  return { type: "doc", content } as unknown as GuideContent;
}

describe("renderGuideHtml", () => {
  it("keeps allowed formatting", () => {
    const html = renderGuideHtml(
      doc([
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Title" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "bold", marks: [{ type: "bold" }] }],
        },
      ]),
    );

    expect(html).toContain("<h2>Title</h2>");
    expect(html).toContain("<strong>bold</strong>");
  });

  it("renders a same-origin image", () => {
    const html = renderGuideHtml(
      doc([
        {
          type: "image",
          attrs: {
            src: "/api/guides/images/0123456789abcdef01234567",
            alt: "r",
          },
        },
      ]),
    );
    expect(html).toContain('src="/api/guides/images/0123456789abcdef01234567"');
  });

  it("renders a youtube embed as a nocookie iframe", () => {
    const html = renderGuideHtml(
      doc([
        {
          type: "youtube",
          attrs: { src: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
        },
      ]),
    );
    expect(html).toContain("<iframe");
    expect(html).toContain("youtube-nocookie.com/embed/dQw4w9WgXcQ");
  });

  it("strips a raw script tag that slipped into the HTML output", () => {
    // renderGuideHtml sanitizes generated HTML — even if a mark rendered a
    // tag, sanitize-html removes anything outside the allowlist.
    const html = renderGuideHtml(
      doc([
        {
          type: "paragraph",
          content: [{ type: "text", text: "<script>alert(1)</script>" }],
        },
      ]),
    );
    expect(html).not.toContain("<script>");
  });
});
