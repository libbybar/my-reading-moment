import { randomUUID } from "node:crypto";
import mongoose from "mongoose";

async function connect() {
  await mongoose.connect(`${process.env.MONGO_URI}/${randomUUID()}`);

  // Each test file connects to a brand-new database name, so indexes (e.g. the
  // unique email index) haven't been built yet — Mongoose builds them in the
  // background after connect(). Wait for them so uniqueness checks are actually
  // enforced from the first write.
  await Promise.all(Object.values(mongoose.connection.models).map((model) => model.init()));
}

async function disconnect() {
  await mongoose.disconnect();
}

async function clearDatabase() {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
}

export { connect, disconnect, clearDatabase };
