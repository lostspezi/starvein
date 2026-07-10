import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render";
import { AdminUsersTable } from "./AdminUsersTable";
import type { AdminUserListEntry } from "./users.repository";

const fetchMock = vi.fn();

const USERS: AdminUserListEntry[] = [
  { id: "admin-1", name: "Admin Anna", email: "anna@x.de", role: "admin" },
  { id: "mod-1", name: "Mod Mia", email: "mia@x.de", role: "moderator" },
  { id: "user-1", name: "Miner Joe", email: "joe@x.de", role: "user" },
];

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({}),
  });
  vi.stubGlobal("fetch", fetchMock);
});

describe("AdminUsersTable", () => {
  it("renders users with role badges", () => {
    renderWithIntl(<AdminUsersTable users={USERS} currentUserId="admin-1" />, {
      locale: "en",
    });

    expect(screen.getByText("Miner Joe")).toBeVisible();
    expect(screen.getByText("Admin")).toBeVisible();
    expect(screen.getByText("Moderator")).toBeVisible();
    expect(screen.getByText("User")).toBeVisible();
  });

  it("promotes a user to moderator via PATCH", async () => {
    const user = userEvent.setup();
    renderWithIntl(<AdminUsersTable users={USERS} currentUserId="admin-1" />, {
      locale: "en",
    });

    await user.click(
      screen.getByRole("button", { name: "Promote to moderator" }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/users/user-1/role",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ role: "moderator" }),
      }),
    );
  });

  it("demotes a moderator to user via PATCH", async () => {
    const user = userEvent.setup();
    renderWithIntl(<AdminUsersTable users={USERS} currentUserId="admin-1" />, {
      locale: "en",
    });

    await user.click(screen.getByRole("button", { name: "Demote to user" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/users/mod-1/role",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ role: "user" }),
      }),
    );
  });

  it("hides actions for admin rows and the current user", () => {
    renderWithIntl(
      <AdminUsersTable
        users={[
          USERS[0],
          { id: "me", name: "Ich", email: "me@x.de", role: "user" },
        ]}
        currentUserId="me"
      />,
      { locale: "en" },
    );

    expect(
      screen.queryByRole("button", { name: "Promote to moderator" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Demote to user" }),
    ).not.toBeInTheDocument();
  });

  it("shows an error line when the request fails", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: "cannotModerate" }),
    });
    const user = userEvent.setup();
    renderWithIntl(<AdminUsersTable users={USERS} currentUserId="admin-1" />, {
      locale: "en",
    });

    await user.click(
      screen.getByRole("button", { name: "Promote to moderator" }),
    );

    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent("Action failed.");
  });
});
