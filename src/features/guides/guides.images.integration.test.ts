import { Readable } from "node:stream";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import {
  GuideImageError,
  openGuideImage,
  uploadGuideImage,
} from "./guides.images.repository";

async function collect(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe("guide images repository", () => {
  let db: Db;

  beforeEach(async () => {
    db = await getDb(uniqueDbName("guides-images"));
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("stores and reads an image back (roundtrip)", async () => {
    const id = await uploadGuideImage(db, {
      data: PNG,
      contentType: "image/png",
      ownerUserId: "owner-1",
    });
    expect(id).toMatch(/^[a-f0-9]{24}$/);

    const file = await openGuideImage(db, id);
    expect(file).not.toBeNull();
    expect(file?.contentType).toBe("image/png");
    const buffer = await collect(file!.stream);
    expect(Buffer.from(PNG).equals(buffer)).toBe(true);
  });

  it("rejects an unsupported content type", async () => {
    await expect(
      uploadGuideImage(db, {
        data: PNG,
        contentType: "text/html",
        ownerUserId: "owner-1",
      }),
    ).rejects.toThrow(GuideImageError);
  });

  it("rejects an oversized image", async () => {
    const big = new Uint8Array(5 * 1024 * 1024 + 1);
    await expect(
      uploadGuideImage(db, {
        data: big,
        contentType: "image/png",
        ownerUserId: "owner-1",
      }),
    ).rejects.toThrow(GuideImageError);
  });

  it("returns null for an unknown id", async () => {
    expect(await openGuideImage(db, "not-an-object-id")).toBeNull();
    expect(await openGuideImage(db, "0123456789abcdef01234567")).toBeNull();
  });
});
