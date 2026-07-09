import { MongoClient, type Db } from "mongodb";

/**
 * MongoClient-Singleton, über globalThis gecacht, damit Next.js-HMR
 * keine Verbindungs-Leaks erzeugt.
 */
const globalForMongo = globalThis as unknown as {
  _mongoClientPromise?: Promise<MongoClient>;
};

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set");
  }
  return uri;
}

function getClient(): Promise<MongoClient> {
  if (!globalForMongo._mongoClientPromise) {
    globalForMongo._mongoClientPromise = new MongoClient(
      getMongoUri(),
    ).connect();
  }
  return globalForMongo._mongoClientPromise;
}

const dbCache = new Map<string, Db>();

export async function getDb(name?: string): Promise<Db> {
  const client = await getClient();
  const key = name ?? "";
  let db = dbCache.get(key);
  if (!db) {
    db = client.db(name);
    dbCache.set(key, db);
  }
  return db;
}

export async function pingMongo(timeoutMs: number): Promise<"up" | "down"> {
  try {
    const client = await Promise.race([
      getClient(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("mongo connect timeout")), timeoutMs),
      ),
    ]);
    await client.db().admin().ping({ timeoutMS: timeoutMs });
    return "up";
  } catch {
    return "down";
  }
}

export async function closeMongo(): Promise<void> {
  const pending = globalForMongo._mongoClientPromise;
  if (!pending) return;
  globalForMongo._mongoClientPromise = undefined;
  dbCache.clear();
  try {
    const client = await pending;
    await client.close();
  } catch {
    // Verbindung kam nie zustande — nichts zu schließen
  }
}
