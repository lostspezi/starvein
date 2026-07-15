import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GuideContent } from "./GuideContent";
import type { GuideContent as GuideContentDoc } from "./guides.schema";

function doc(content: unknown[]): GuideContentDoc {
  return { type: "doc", content } as unknown as GuideContentDoc;
}

describe("GuideContent", () => {
  it("renders sanitized guide HTML from a TipTap document", () => {
    const { container } = render(
      <GuideContent
        content={doc([
          {
            type: "heading",
            attrs: { level: 2 },
            content: [{ type: "text", text: "Step one" }],
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: "Scan the rock." }],
          },
        ])}
      />,
    );

    expect(container.querySelector("h2")?.textContent).toBe("Step one");
    expect(container.querySelector(".guide-prose")).not.toBeNull();
    expect(container.textContent).toContain("Scan the rock.");
  });
});
