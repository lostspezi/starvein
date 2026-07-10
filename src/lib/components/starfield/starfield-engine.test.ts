import { describe, expect, it } from "vitest";
import {
  BOOST_DURATION_MS,
  DEPTH_LAYERS,
  MAX_STARS,
  STAR_STRIDE,
  boostEnvelope,
  generateStars,
  starCountFor,
} from "./starfield-engine";

describe("starCountFor", () => {
  it("scales star count with viewport width", () => {
    expect(starCountFor(375)).toBe(187);
    expect(starCountFor(1280)).toBe(640);
  });

  it("caps at MAX_STARS and never goes negative", () => {
    expect(starCountFor(4000)).toBe(MAX_STARS);
    expect(starCountFor(0)).toBe(0);
  });
});

describe("generateStars", () => {
  it("produces one stride of attributes per star", () => {
    const stars = generateStars(10);
    expect(stars).toHaveLength(10 * STAR_STRIDE);
  });

  it("keeps positions normalized and depths on the defined layers", () => {
    const stars = generateStars(50);
    for (let i = 0; i < 50; i++) {
      const offset = i * STAR_STRIDE;
      expect(stars[offset]).toBeGreaterThanOrEqual(0);
      expect(stars[offset]).toBeLessThan(1);
      expect(stars[offset + 1]).toBeGreaterThanOrEqual(0);
      expect(stars[offset + 1]).toBeLessThan(1);
      // Float32Array rundet auf einfache Genauigkeit — mit Toleranz vergleichen
      expect(
        DEPTH_LAYERS.some(
          (layer) => Math.abs(layer - stars[offset + 2]) < 1e-6,
        ),
      ).toBe(true);
      expect(stars[offset + 3]).toBeGreaterThan(0);
    }
  });

  it("is deterministic for a given random source", () => {
    let seed = 0;
    const random = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    const first = generateStars(5, random);
    seed = 0;
    const second = generateStars(5, random);
    expect(first).toEqual(second);
  });
});

describe("boostEnvelope", () => {
  it("is neutral before, after and at the boundaries of the boost", () => {
    expect(boostEnvelope(0)).toBe(1);
    expect(boostEnvelope(BOOST_DURATION_MS)).toBe(1);
    expect(boostEnvelope(BOOST_DURATION_MS * 5)).toBe(1);
    expect(boostEnvelope(-100)).toBe(1);
  });

  it("peaks at 3.5x halfway through", () => {
    expect(boostEnvelope(BOOST_DURATION_MS / 2)).toBeCloseTo(3.5, 5);
  });

  it("ramps smoothly up and down", () => {
    const quarter = boostEnvelope(BOOST_DURATION_MS / 4);
    expect(quarter).toBeGreaterThan(1);
    expect(quarter).toBeLessThan(3.5);
  });
});
