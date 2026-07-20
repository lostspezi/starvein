import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OreFaq } from "./OreFaq";

const items = [
  {
    question: "Where can I find Hadanite?",
    answer: "Best chance 42 % at Daymar.",
  },
  { question: "How rare is Hadanite?", answer: "Hadanite is an epic ore." },
];

describe("OreFaq", () => {
  it("renders each question and answer visibly", () => {
    render(<OreFaq heading="FAQ" items={items} />);
    expect(screen.getByText("Where can I find Hadanite?")).toBeVisible();
    expect(screen.getByText("Best chance 42 % at Daymar.")).toBeVisible();
    expect(screen.getByText("How rare is Hadanite?")).toBeVisible();
  });

  it("emits FAQPage JSON-LD mirroring the visible items", () => {
    const { container } = render(<OreFaq heading="FAQ" items={items} />);
    const script = container.querySelector(
      'script[type="application/ld+json"]',
    );
    expect(script).not.toBeNull();
    const data = JSON.parse(script!.innerHTML.replace(/\\u003c/g, "<"));
    expect(data["@type"]).toBe("FAQPage");
    expect(data.mainEntity).toHaveLength(2);
    expect(data.mainEntity[0]).toEqual({
      "@type": "Question",
      name: "Where can I find Hadanite?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Best chance 42 % at Daymar.",
      },
    });
  });

  it("renders nothing when there are no items", () => {
    const { container } = render(<OreFaq heading="FAQ" items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
