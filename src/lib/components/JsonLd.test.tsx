import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { JsonLd } from "./JsonLd";

describe("JsonLd", () => {
  it("renders the data as an application/ld+json script", () => {
    const { container } = render(
      <JsonLd data={{ "@type": "WebSite", name: "STARVEIN" }} />,
    );
    const script = container.querySelector(
      'script[type="application/ld+json"]',
    );
    expect(script).not.toBeNull();
    expect(JSON.parse(script!.textContent ?? "")).toEqual({
      "@type": "WebSite",
      name: "STARVEIN",
    });
  });

  it("escapes < so content cannot break out of the script tag", () => {
    const { container } = render(
      <JsonLd data={{ name: "</script><script>alert(1)" }} />,
    );
    const script = container.querySelector(
      'script[type="application/ld+json"]',
    );
    expect(script!.innerHTML).not.toContain("</script>");
    expect(script!.innerHTML).toContain("\\u003c");
    // Der escapte Inhalt bleibt gültiges JSON mit identischem Wert
    expect(JSON.parse(script!.textContent ?? "")).toEqual({
      name: "</script><script>alert(1)",
    });
  });
});
