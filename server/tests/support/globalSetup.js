import { MongoMemoryReplSet } from "mongodb-memory-server";

// A (single-node) replica set, not a standalone server, because Learning
// Progression needs real multi-document Mongo transactions (TextResult write +
// child state update as one atomic unit) — transactions require a replica set,
// and Atlas (production) already is one, so this only affects local test infra.
export default async function globalSetup() {
  const instance = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  global.__MONGO_INSTANCE__ = instance;

  const uri = instance.getUri();
  process.env.MONGO_URI = uri.slice(0, uri.lastIndexOf("/"));
}
