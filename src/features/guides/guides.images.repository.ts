import { Readable } from "node:stream";
import { GridFSBucket, ObjectId, type Db } from "mongodb";

const BUCKET_NAME = "guideImages";

export const GUIDE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const GUIDE_IMAGE_CONTENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;

const ALLOWED = new Set<string>(GUIDE_IMAGE_CONTENT_TYPES);

/** Fachlicher Fehler bei ungültigen Uploads (falscher Typ / zu groß). */
export class GuideImageError extends Error {}

function bucket(db: Db): GridFSBucket {
  return new GridFSBucket(db, { bucketName: BUCKET_NAME });
}

export type GuideImageUpload = {
  data: Uint8Array;
  contentType: string;
  ownerUserId: string;
  filename?: string;
};

/**
 * Speichert ein Bild in GridFS und gibt die hex-ObjectId zurück, aus der die
 * same-origin-Quelle `/api/guides/images/<id>` gebaut wird. Validiert Typ und
 * Größe (Defense-in-depth zusätzlich zur Route).
 */
export async function uploadGuideImage(
  db: Db,
  upload: GuideImageUpload,
): Promise<string> {
  if (!ALLOWED.has(upload.contentType)) {
    throw new GuideImageError("unsupported content type");
  }
  if (upload.data.byteLength > GUIDE_IMAGE_MAX_BYTES) {
    throw new GuideImageError("image too large");
  }

  const gridfs = bucket(db);
  return new Promise<string>((resolve, reject) => {
    const stream = gridfs.openUploadStream(upload.filename ?? "image", {
      // contentType wird in metadata gehalten (die Top-Level-Option existiert
      // im v7-Driver nicht mehr) und beim Ausliefern von dort gelesen
      metadata: {
        ownerUserId: upload.ownerUserId,
        contentType: upload.contentType,
      },
    });
    stream.on("error", reject);
    stream.on("finish", () => resolve(stream.id.toHexString()));
    stream.end(Buffer.from(upload.data));
  });
}

export type GuideImageFile = {
  stream: Readable;
  contentType: string;
  length: number;
};

/** Öffnet den Download-Stream eines Bildes, oder null bei unbekannter id. */
export async function openGuideImage(
  db: Db,
  id: string,
): Promise<GuideImageFile | null> {
  if (!ObjectId.isValid(id)) return null;
  const objectId = new ObjectId(id);
  const gridfs = bucket(db);
  const [file] = await gridfs.find({ _id: objectId }).limit(1).toArray();
  if (!file) return null;
  const contentType =
    (file.metadata?.contentType as string | undefined) ??
    "application/octet-stream";
  return {
    stream: gridfs.openDownloadStream(objectId),
    contentType,
    length: file.length,
  };
}
