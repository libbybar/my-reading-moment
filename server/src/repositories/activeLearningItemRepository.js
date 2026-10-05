import { randomUUID } from "node:crypto";

import ActiveLearningItem from "../models/ActiveLearningItem.js";

// Array-form create() is the documented-safe way to pass a transaction session in Mongoose.
async function create(fields, { session } = {}) {
  const [created] = await ActiveLearningItem.create([fields], { session });

  return created;
}

async function findForChild({ parentId, childId }) {
  return ActiveLearningItem.findOne({ parentId, childId });
}

async function findByAttemptId({ parentId, childId, attemptId }) {
  return ActiveLearningItem.findOne({ parentId, childId, attemptId });
}

// Returns null when the item is gone, for a refresh racing a deletion.
async function recordActivity({ parentId, childId, attemptId, now }) {
  return ActiveLearningItem.findOneAndUpdate(
    { parentId, childId, attemptId },
    { $set: { lastActivityAt: now } },
    { returnDocument: "after" },
  );
}

// Atomic compare-and-swap in the database, so it also holds across server processes.
// An expired claim is reclaimable, and every claim gets a fresh token.
async function tryClaim({ parentId, childId, attemptId, now, leaseMs }) {
  return ActiveLearningItem.findOneAndUpdate(
    {
      parentId,
      childId,
      attemptId,
      $or: [{ state: "active" }, { state: "claimed", claimedAt: { $lte: new Date(now.getTime() - leaseMs) } }],
    },
    { $set: { state: "claimed", claimedAt: now, claimToken: randomUUID(), lastActivityAt: now } },
    { returnDocument: "after" },
  );
}

async function release({ parentId, childId, attemptId, claimToken }) {
  return ActiveLearningItem.findOneAndUpdate(
    { parentId, childId, attemptId, state: "claimed", claimToken },
    { $set: { state: "active" }, $unset: { claimedAt: 1, claimToken: 1 } },
    { returnDocument: "after" },
  );
}

// Returns the deleted document, so the terminal attempt is built from the
// server's own snapshot and not from anything the caller sends.
async function deleteClaimed({ parentId, childId, attemptId, claimToken }, { session } = {}) {
  return ActiveLearningItem.findOneAndDelete(
    { parentId, childId, attemptId, state: "claimed", claimToken },
    { session },
  );
}

async function deleteIdleSince({ parentId, childId, attemptId, cutoff }, { session } = {}) {
  return ActiveLearningItem.findOneAndDelete(
    { parentId, childId, attemptId, lastActivityAt: { $lt: cutoff } },
    { session },
  );
}

async function deleteAllForChild({ parentId, childId }, { session } = {}) {
  return ActiveLearningItem.deleteMany({ parentId, childId }, { session });
}

export {
  create,
  findForChild,
  findByAttemptId,
  recordActivity,
  tryClaim,
  release,
  deleteClaimed,
  deleteIdleSince,
  deleteAllForChild,
};
