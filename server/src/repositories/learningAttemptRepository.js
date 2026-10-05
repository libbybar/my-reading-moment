import LearningAttempt from "../models/LearningAttempt.js";

// Array-form create() is the documented-safe way to pass a transaction session in Mongoose.
async function create(fields, { session } = {}) {
  const [created] = await LearningAttempt.create([fields], { session });

  return created;
}

async function findByAttemptId({ parentId, childId, attemptId }, { session } = {}) {
  return LearningAttempt.findOne({ parentId, childId, attemptId }).session(session ?? null);
}

// Source of the fingerprints and signatures anti-replay must avoid.
async function findRecent({ parentId, childId, limit }) {
  return LearningAttempt.find({ parentId, childId }).sort({ endedAt: -1 }).limit(limit);
}

export { create, findByAttemptId, findRecent };
