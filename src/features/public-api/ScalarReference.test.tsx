import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SCALAR_CONFIGURATION, ScalarReference } from "./ScalarReference";

describe("ScalarReference", () => {
  it("renders the mount container without an inline script marker", () => {
    const { container } = render(<ScalarReference />);
    // React führt Script-Tags in Komponenten nie aus — der Mount läuft
    // über window.Scalar.createApiReference im onLoad des Bundles.
    expect(container.querySelector("script#api-reference")).toBeNull();
    expect(container.querySelector("#scalar-reference")).not.toBeNull();
  });

  it("points the configuration at the v1 spec without external fonts", () => {
    expect(SCALAR_CONFIGURATION).toMatchObject({
      url: "/api/v1/openapi.json",
      // Kein CDN/Font-Fetch: strikte CSP erlaubt nur 'self'
      withDefaultFonts: false,
    });
  });
});
