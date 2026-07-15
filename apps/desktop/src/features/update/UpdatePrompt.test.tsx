import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IntlProvider } from "use-intl";
import { describe, expect, it, vi } from "vitest";
import { messages } from "../../i18n/messages";
import { UpdatePrompt } from "./UpdatePrompt";

function renderPrompt(
  overrides: Partial<Parameters<typeof UpdatePrompt>[0]> = {},
) {
  const props = {
    version: "0.3.0",
    busy: false,
    onInstall: vi.fn(),
    onDismiss: vi.fn(),
    ...overrides,
  };
  render(
    <IntlProvider locale="en" messages={messages.en}>
      <UpdatePrompt {...props} />
    </IntlProvider>,
  );
  return props;
}

describe("UpdatePrompt", () => {
  it("announces the available version and offers install or later", async () => {
    const props = renderPrompt();

    expect(
      screen.getByText("Version 0.3.0 is available — install now?"),
    ).toBeVisible();

    await userEvent.click(screen.getByRole("button", { name: "Update now" }));
    expect(props.onInstall).toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Later" }));
    expect(props.onDismiss).toHaveBeenCalled();
  });

  it("locks the buttons while the update installs", () => {
    renderPrompt({ busy: true });

    expect(screen.getByText("Installing update …")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Installing update …" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Later" })).toBeDisabled();
  });
});
