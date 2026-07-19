import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { HttpResponse, delay, http } from "msw";
import { setupServer } from "msw/node";
import { readJsonCapped, safeFetch } from "@/lib/safe-fetch";

const server = setupServer(
  http.get("https://safe.test/ok", () => HttpResponse.json({ ok: true })),
  http.get("https://safe.test/slow", async () => {
    await delay(300);
    return HttpResponse.json({ ok: true });
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("safeFetch", () => {
  it("returns the response for a fast endpoint", async () => {
    const response = await safeFetch("https://safe.test/ok", {
      timeoutMs: 1000,
    });
    expect(response.ok).toBe(true);
    await expect(readJsonCapped(response)).resolves.toEqual({ ok: true });
  });

  it("aborts when the upstream is slower than the timeout", async () => {
    await expect(
      safeFetch("https://safe.test/slow", { timeoutMs: 50 }),
    ).rejects.toThrow();
  });
});

describe("readJsonCapped", () => {
  it("parses a normal JSON response", async () => {
    const response = new Response(JSON.stringify({ value: 42 }));
    await expect(readJsonCapped(response)).resolves.toEqual({ value: 42 });
  });

  it("rejects early when Content-Length exceeds the cap", async () => {
    const response = new Response("{}", {
      headers: { "content-length": "999999" },
    });
    await expect(readJsonCapped(response, 1024)).rejects.toThrow(/too large/);
  });

  it("rejects while streaming when no Content-Length is present", async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("a".repeat(50)));
        controller.enqueue(new TextEncoder().encode("b".repeat(50)));
        controller.close();
      },
    });
    const response = new Response(stream);
    await expect(readJsonCapped(response, 10)).rejects.toThrow(/exceeded/);
  });
});
