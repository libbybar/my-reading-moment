import Parent from "../models/Parent.js";

const DUPLICATE_KEY_ERROR_CODE = 11000;

class DuplicateEmailError extends Error {
  constructor() {
    super("A parent with this email already exists");
    this.name = "DuplicateEmailError";
  }
}

// Mongoose lowercase/trim do not apply to query filters.
function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

async function findByEmail(email) {
  return Parent.findOne({ email: normalizeEmail(email) });
}

// Only login should opt into the `select: false` passwordHash field.
async function findByEmailWithPasswordHash(email) {
  return Parent.findOne({ email: normalizeEmail(email) }).select("+passwordHash");
}

async function findById(parentId) {
  return Parent.findById(parentId);
}

async function create({ email, passwordHash, children = [] }) {
  try {
    return await Parent.create({ email: normalizeEmail(email), passwordHash, children });
  } catch (error) {
    if (error.code === DUPLICATE_KEY_ERROR_CODE) {
      throw new DuplicateEmailError();
    }

    throw error;
  }
}

// `runValidators` is off by default on findByIdAndUpdate.
async function addChild(parentId, child) {
  return Parent.findByIdAndUpdate(
    parentId,
    { $push: { children: child } },
    { returnDocument: "after", runValidators: true },
  );
}

// The compound filter enforces parent/child ownership.
async function updateChild(parentId, childId, updates) {
  const setFields = {};

  if (updates.name !== undefined) {
    setFields["children.$.name"] = updates.name;
  }
  if (updates.grammaticalGender !== undefined) {
    setFields["children.$.grammaticalGender"] = updates.grammaticalGender;
  }
  if (updates.readingLevel !== undefined) {
    setFields["children.$.learningProfile.readingLevel"] = updates.readingLevel;
  }
  if (updates.interests !== undefined) {
    setFields["children.$.learningProfile.interests"] = updates.interests;
  }

  const parent = await Parent.findOneAndUpdate(
    { _id: parentId, "children._id": childId },
    { $set: setFields },
    { returnDocument: "after", runValidators: true },
  );

  return parent ? parent.children.id(childId) : null;
}

async function recordLogin(parentId) {
  return Parent.findByIdAndUpdate(
    parentId,
    { lastLoginAt: new Date() },
    { returnDocument: "after" },
  );
}

// Called inside the TextResult transaction; keeps derived child state in sync.
async function applyTextCompletionProgress(
  parentId,
  childId,
  { incrementJourneyProgress, levelUpdate },
  { session } = {},
) {
  const update = {};

  if (incrementJourneyProgress) {
    update.$inc = { "children.$.journeyProgress": 1 };
  }

  if (levelUpdate) {
    update.$set = {
      "children.$.learningProfile.currentLevel": levelUpdate.level,
      "children.$.learningProfile.currentSublevel": levelUpdate.sublevel,
    };
  }

  if (Object.keys(update).length === 0) {
    // Preserve null as "child not found", not "nothing changed".
    const parent = await Parent.findOne({ _id: parentId, "children._id": childId }, null, { session });

    return parent ? parent.children.id(childId) : null;
  }

  const parent = await Parent.findOneAndUpdate({ _id: parentId, "children._id": childId }, update, {
    returnDocument: "after",
    runValidators: true,
    session,
  });

  return parent ? parent.children.id(childId) : null;
}

async function addLearningEvent(parentId, childId, event, { session } = {}) {
  const parent = await Parent.findOneAndUpdate(
    { _id: parentId, "children._id": childId },
    { $push: { "children.$.learningEvents": event } },
    { returnDocument: "after", runValidators: true, session },
  );

  return parent ? parent.children.id(childId) : null;
}

export {
  findByEmail,
  findByEmailWithPasswordHash,
  findById,
  create,
  addChild,
  updateChild,
  recordLogin,
  applyTextCompletionProgress,
  addLearningEvent,
  DuplicateEmailError,
};
