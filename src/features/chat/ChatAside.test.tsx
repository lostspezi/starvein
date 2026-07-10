import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render";
import type { ChatMessage } from "./chat.schema";
import { ChatAside } from "./ChatAside";

const { useSessionMock } = vi.hoisted(() => ({
  useSessionMock: vi.fn(),
}));

vi.mock("@/lib/auth-client", () => ({
  useSession: useSessionMock,
}));

const fetchMock = vi.fn();

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  };
}

function buildMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: crypto.randomUUID(),
    userId: "user-1",
    userName: "Miner Joe",
    body: "hallo zusammen",
    createdAt: "2026-07-10T10:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  useSessionMock.mockReset();
  useSessionMock.mockReturnValue({ data: null, isPending: false });
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(jsonResponse({ messages: [] }));
  vi.stubGlobal("fetch", fetchMock);
  window.localStorage.clear();
});

describe("ChatAside", () => {
  it("renders collapsed with an open-chat toggle by default", () => {
    renderWithIntl(<ChatAside />, { locale: "en" });

    const toggle = screen.getByRole("button", { name: "Open chat" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("opens the panel on toggle and persists the state", async () => {
    const user = userEvent.setup();
    renderWithIntl(<ChatAside />, { locale: "en" });

    await user.click(screen.getByRole("button", { name: "Open chat" }));

    expect(
      screen.getByRole("complementary", { name: "Community chat" }),
    ).toBeVisible();
    expect(window.localStorage.getItem("starvein.chat.open")).toBe("1");

    await user.click(screen.getByRole("button", { name: "Close chat" }));
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
    expect(window.localStorage.getItem("starvein.chat.open")).toBe("0");
  });

  it("restores the open state from localStorage", async () => {
    window.localStorage.setItem("starvein.chat.open", "1");
    renderWithIntl(<ChatAside />, { locale: "en" });

    expect(
      await screen.findByRole("complementary", { name: "Community chat" }),
    ).toBeVisible();
  });

  it("shows a login prompt instead of the composer when logged out", async () => {
    const user = userEvent.setup();
    renderWithIntl(<ChatAside />, { locale: "en" });

    await user.click(screen.getByRole("button", { name: "Open chat" }));

    expect(
      screen.getByText("Sign in with Discord to join the chat."),
    ).toBeVisible();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("fetches and renders messages when opened", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        messages: [
          buildMessage({ body: "hallo zusammen" }),
          buildMessage({ body: "moin", userName: "Rock Hound" }),
        ],
      }),
    );
    const user = userEvent.setup();
    renderWithIntl(<ChatAside />, { locale: "en" });

    await user.click(screen.getByRole("button", { name: "Open chat" }));

    expect(await screen.findByText("hallo zusammen")).toBeVisible();
    expect(screen.getByText("moin")).toBeVisible();
    expect(screen.getByText("Rock Hound")).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/chat/messages"),
    );
  });

  it("sends a message, clears the input and shows it in the list", async () => {
    useSessionMock.mockReturnValue({
      data: { user: { id: "u1", name: "MinerMarcell" } },
      isPending: false,
    });
    const sent = buildMessage({
      body: "frisches Quantanium bei Lyria",
      userName: "MinerMarcell",
    });
    fetchMock.mockImplementation(async (_url, init?: RequestInit) =>
      init?.method === "POST"
        ? jsonResponse(sent, 201)
        : jsonResponse({ messages: [] }),
    );
    const user = userEvent.setup();
    renderWithIntl(<ChatAside />, { locale: "en" });

    await user.click(screen.getByRole("button", { name: "Open chat" }));
    const input = screen.getByRole("textbox", { name: "Write a message" });
    await user.type(input, "frisches Quantanium bei Lyria");
    await user.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => expect(input).toHaveValue(""));
    expect(
      await screen.findByText("frisches Quantanium bei Lyria"),
    ).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/chat/messages",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("shows a cooldown countdown after a 429 response", async () => {
    useSessionMock.mockReturnValue({
      data: { user: { id: "u1", name: "MinerMarcell" } },
      isPending: false,
    });
    fetchMock.mockImplementation(async (_url, init?: RequestInit) =>
      init?.method === "POST"
        ? jsonResponse({ error: "rateLimited", retryAfterSeconds: 30 }, 429)
        : jsonResponse({ messages: [] }),
    );
    const user = userEvent.setup();
    renderWithIntl(<ChatAside />, { locale: "en" });

    await user.click(screen.getByRole("button", { name: "Open chat" }));
    await user.type(screen.getByRole("textbox"), "hallo");
    await user.click(screen.getByRole("button", { name: "Send" }));

    const cooldownButton = await screen.findByRole("button", {
      name: /Wait \d+s/,
    });
    expect(cooldownButton).toBeDisabled();
    expect(
      screen.getByText("Slow mode: one message every 30 seconds."),
    ).toBeVisible();
  });

  it("shows no moderation actions for a regular user", async () => {
    useSessionMock.mockReturnValue({
      data: { user: { id: "u1", name: "MinerMarcell", role: "user" } },
      isPending: false,
    });
    fetchMock.mockResolvedValue(
      jsonResponse({ messages: [buildMessage()], deletions: [] }),
    );
    const user = userEvent.setup();
    renderWithIntl(<ChatAside />, { locale: "en" });

    await user.click(screen.getByRole("button", { name: "Open chat" }));
    await screen.findByText("hallo zusammen");

    expect(
      screen.queryByRole("button", { name: "Delete message" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Timeout user" }),
    ).not.toBeInTheDocument();
  });

  it("lets a moderator delete a message", async () => {
    useSessionMock.mockReturnValue({
      data: { user: { id: "mod-1", name: "Mod Mia", role: "moderator" } },
      isPending: false,
    });
    const message = buildMessage();
    fetchMock.mockImplementation(async (_url, init?: RequestInit) =>
      init?.method === "DELETE"
        ? { ok: true, status: 204, json: async () => null }
        : jsonResponse({ messages: [message], deletions: [] }),
    );
    const user = userEvent.setup();
    renderWithIntl(<ChatAside />, { locale: "en" });

    await user.click(screen.getByRole("button", { name: "Open chat" }));
    await screen.findByText("hallo zusammen");
    await user.click(screen.getByRole("button", { name: "Delete message" }));

    await waitFor(() =>
      expect(screen.queryByText("hallo zusammen")).not.toBeInTheDocument(),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/chat/messages/${message.id}`,
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("lets a moderator timeout a user with a chosen duration", async () => {
    useSessionMock.mockReturnValue({
      data: { user: { id: "mod-1", name: "Mod Mia", role: "moderator" } },
      isPending: false,
    });
    const message = buildMessage({ userId: "user-9" });
    fetchMock.mockImplementation(async (_url, init?: RequestInit) =>
      init?.method === "POST"
        ? jsonResponse({ userId: "user-9", until: "x" }, 201)
        : jsonResponse({ messages: [message], deletions: [] }),
    );
    const user = userEvent.setup();
    renderWithIntl(<ChatAside />, { locale: "en" });

    await user.click(screen.getByRole("button", { name: "Open chat" }));
    await screen.findByText("hallo zusammen");
    await user.click(screen.getByRole("button", { name: "Timeout user" }));
    await user.click(screen.getByRole("button", { name: "1 h" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/chat/timeouts",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ userId: "user-9", durationMinutes: 60 }),
      }),
    );
  });

  it("hides the timeout action on the moderator's own messages", async () => {
    useSessionMock.mockReturnValue({
      data: { user: { id: "mod-1", name: "Mod Mia", role: "moderator" } },
      isPending: false,
    });
    fetchMock.mockResolvedValue(
      jsonResponse({
        messages: [buildMessage({ userId: "mod-1", userName: "Mod Mia" })],
        deletions: [],
      }),
    );
    const user = userEvent.setup();
    renderWithIntl(<ChatAside />, { locale: "en" });

    await user.click(screen.getByRole("button", { name: "Open chat" }));
    await screen.findByText("hallo zusammen");

    expect(
      screen.getByRole("button", { name: "Delete message" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Timeout user" }),
    ).not.toBeInTheDocument();
  });

  it("removes messages listed in deletions from the poll response", async () => {
    const gone = buildMessage({ body: "wird entfernt" });
    const kept = buildMessage({ body: "bleibt stehen" });
    fetchMock.mockResolvedValue(
      jsonResponse({
        messages: [gone, kept],
        deletions: [{ id: gone.id, deletedAt: "2026-07-10T10:02:00.000Z" }],
      }),
    );
    const user = userEvent.setup();
    renderWithIntl(<ChatAside />, { locale: "en" });

    await user.click(screen.getByRole("button", { name: "Open chat" }));

    expect(await screen.findByText("bleibt stehen")).toBeVisible();
    expect(screen.queryByText("wird entfernt")).not.toBeInTheDocument();
  });

  it("shows the timed-out error with remaining minutes after a 403", async () => {
    useSessionMock.mockReturnValue({
      data: { user: { id: "u1", name: "MinerMarcell", role: "user" } },
      isPending: false,
    });
    const until = new Date(Date.now() + 5 * 60_000).toISOString();
    fetchMock.mockImplementation(async (_url, init?: RequestInit) =>
      init?.method === "POST"
        ? jsonResponse({ error: "timedOut", until }, 403)
        : jsonResponse({ messages: [], deletions: [] }),
    );
    const user = userEvent.setup();
    renderWithIntl(<ChatAside />, { locale: "en" });

    await user.click(screen.getByRole("button", { name: "Open chat" }));
    await user.type(screen.getByRole("textbox"), "hallo");
    await user.click(screen.getByRole("button", { name: "Send" }));

    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent(/muted for another \d+ min/);
  });

  it("shows a translated error for a 422 rejection code", async () => {
    useSessionMock.mockReturnValue({
      data: { user: { id: "u1", name: "MinerMarcell" } },
      isPending: false,
    });
    fetchMock.mockImplementation(async (_url, init?: RequestInit) =>
      init?.method === "POST"
        ? jsonResponse({ error: "linkBlocked" }, 422)
        : jsonResponse({ messages: [] }),
    );
    const user = userEvent.setup();
    renderWithIntl(<ChatAside />, { locale: "en" });

    await user.click(screen.getByRole("button", { name: "Open chat" }));
    await user.type(screen.getByRole("textbox"), "spam text");
    await user.click(screen.getByRole("button", { name: "Send" }));

    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent("Links are not allowed in chat.");
  });
});
