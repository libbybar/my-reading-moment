import TextResult from "../models/TextResult.js";

// Array-form create() is the documented-safe way to pass a transaction session in Mongoose.
async function create(
  { sessionId, parentId, childId, level, sublevel, specVersion, result, startedAt, completedAt, evidence },
  { session } = {},
) {
  const [created] = await TextResult.create(
    [{ sessionId, parentId, childId, level, sublevel, specVersion, result, startedAt, completedAt, evidence }],
    { session },
  );

  return created;
}

// Recovers an already-finalized completion after a duplicate sessionId.
async function findBySessionId(sessionId, { session } = {}) {
  return TextResult.findOne({ sessionId }).session(session ?? null);
}

// Raw, unfiltered — used for the skip-streak rule, which must see skips.
async function findRecentRaw({ parentId, childId, level, sublevel, limit }, { session } = {}) {
  return TextResult.find({ parentId, childId, level, sublevel })
    .sort({ completedAt: -1 })
    .limit(limit)
    .session(session ?? null);
}

// Uses $in, not $ne, to match TextResult's partial index.
async function findRecentNonSkipped({ parentId, childId, level, sublevel, limit }, { session } = {}) {
  return TextResult.find({ parentId, childId, level, sublevel, result: { $in: ["success", "failure"] } })
    .sort({ completedAt: -1 })
    .limit(limit)
    .session(session ?? null);
}

export { create, findBySessionId, findRecentRaw, findRecentNonSkipped };
