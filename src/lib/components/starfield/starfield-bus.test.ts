import { describe, expect, it, vi } from "vitest";
import { boostDrift, onBoost } from "./starfield-bus";

describe("starfield-bus", () => {
  it("notifies subscribers on boostDrift", () => {
    const listener = vi.fn();
    const unsubscribe = onBoost(listener);

    boostDrift();
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
  });

  it("stops notifying after unsubscribe", () => {
    const listener = vi.fn();
    const unsubscribe = onBoost(listener);
    unsubscribe();

    boostDrift();
    expect(listener).not.toHaveBeenCalled();
  });

  it("supports multiple independent subscribers", () => {
    const first = vi.fn();
    const second = vi.fn();
    const offFirst = onBoost(first);
    const offSecond = onBoost(second);

    boostDrift();
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);

    offFirst();
    offSecond();
  });
});
