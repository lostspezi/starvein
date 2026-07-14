import type { Db } from "mongodb";
import { refineryJobSchema, type RefineryJob } from "./refinery-jobs.schema";

const COLLECTION = "refineryJobs";
const NO_ID = { projection: { _id: 0 } } as const;

export async function insertRefineryJob(
  db: Db,
  job: RefineryJob,
): Promise<void> {
  await db.collection(COLLECTION).insertOne({ ...job });
}

export async function findRefineryJobById(
  db: Db,
  id: string,
): Promise<RefineryJob | null> {
  const doc = await db.collection(COLLECTION).findOne({ id }, NO_ID);
  return doc ? refineryJobSchema.parse(doc) : null;
}

export async function replaceRefineryJob(
  db: Db,
  job: RefineryJob,
): Promise<void> {
  await db.collection(COLLECTION).replaceOne({ id: job.id }, job);
}

export async function deleteRefineryJobById(db: Db, id: string): Promise<void> {
  await db.collection(COLLECTION).deleteOne({ id });
}

export async function listRefineryJobsByOwner(
  db: Db,
  userId: string,
): Promise<RefineryJob[]> {
  const docs = await db
    .collection(COLLECTION)
    .find({ ownerUserId: userId }, NO_ID)
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map((doc) => refineryJobSchema.parse(doc));
}
