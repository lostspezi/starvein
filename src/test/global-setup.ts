import { MongoMemoryServer } from "mongodb-memory-server";

/**
 * Startet genau eine In-Memory-MongoDB für alle Integration-Tests.
 * Suiten isolieren sich über eigene DB-Namen (siehe factories.uniqueDbName).
 */
export default async function globalSetup() {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();

  return async () => {
    await mongod.stop();
  };
}
