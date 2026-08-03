import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ScalarReference } from "./ScalarReference";

describe("ScalarReference", () => {
  it("mounts the scalar marker pointing at the v1 spec", () => {
    const { container } = render(<ScalarReference />);
    const marker = container.querySelector("script#api-reference");
    expect(marker).not.toBeNull();
    expect(marker?.getAttribute("data-url")).toBe("/api/v1/openapi.json");
    // Kein CDN: das Bundle kommt selbst-gehostet aus /public/vendor
    const config = marker?.getAttribute("data-configuration") ?? "";
    expect(JSON.parse(config)).toMatchObject({ withDefaultFonts: false });
  });
});
