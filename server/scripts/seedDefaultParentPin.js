import "dotenv/config";
import mongoose from "mongoose";

import { connectToDatabase } from "../src/config/db.js";
import Parent from "../src/models/Parent.js";
import { hashPassword } from "../src/services/passwordHasher.js";

// One-off: parents registered before the parent-zone PIN existed get "1234"
// and change it in the parent zone. Deliberately not code in the request
// path — a runtime "no PIN means 1234" fallback would leave every future
// parent with a known PIN. Writes to whatever MONGODB_URI points at.
const DEFAULT_PIN = "1234";

async function seedDefaultParentPin() {
  await connectToDatabase();

  const parentPinHash = await hashPassword(DEFAULT_PIN);
  const result = await Parent.updateMany(
    { parentPinHash: { $exists: false } },
    { $set: { parentPinHash } },
  );

  console.log(`Set the default parent PIN on ${result.modifiedCount} parent(s) that had none.`);

  await mongoose.disconnect();
}

seedDefaultParentPin().catch((error) => {
  console.error("Seeding the default parent PIN failed:", error.message);
  process.exitCode = 1;
});
