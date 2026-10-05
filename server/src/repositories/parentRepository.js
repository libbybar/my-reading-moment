import mongoose from "mongoose";

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

async function findByIdWithParentPinHash(parentId) {
  return Parent.findById(parentId).select("+parentPinHash");
}

async function findByIdWithPasswordHash(parentId) {
  return Parent.findById(parentId).select("+passwordHash");
}

async function replaceParentPinHash(parentId, parentPinHash) {
  return Parent.findByIdAndUpdate(parentId, { $set: { parentPinHash } }, { returnDocument: "after" });
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

// The compound filter enforces parent/child ownership. $elemMatch (not two
// separate top-level "children.x" conditions) is required so isArchived is
// checked on the *same* array element as _id — an archived child must be
// exactly as unreachable here as one that doesn't belong to this parent.
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
  if (updates.avatarId !== undefined) {
    setFields["children.$.avatarId"] = updates.avatarId;
  }

  const parent = await Parent.findOneAndUpdate(
    { _id: parentId, children: { $elemMatch: { _id: childId, isArchived: { $ne: true } } } },
    { $set: setFields },
    { returnDocument: "after", runValidators: true },
  );

  return parent ? parent.children.id(childId) : null;
}

// An archived child must be as unreachable as an unowned one, so a session
// that outlives the archive can't keep writing history or progress.
function activeChildFilter(parentId, childId) {
  return { _id: parentId, children: { $elemMatch: { _id: childId, isArchived: { $ne: true } } } };
}

// Null for an unowned, missing, archived or malformed child id, so those cases stay indistinguishable.
async function findActiveChild(parentId, childId, { session } = {}) {
  if (!mongoose.isValidObjectId(childId)) {
    return null;
  }

  const parent = await Parent.findOne(activeChildFilter(parentId, childId), null, { session });

  return parent ? parent.children.id(childId) : null;
}

// Beyond recording the time, this write is what makes a concurrent archive of
// the same parent document conflict with the transaction that issues it.
async function recordChildSession(parentId, childId, at, { session } = {}) {
  const parent = await Parent.findOneAndUpdate(
    activeChildFilter(parentId, childId),
    { $set: { "children.$.lastSessionAt": at } },
    { returnDocument: "after", session },
  );

  return parent ? parent.children.id(childId) : null;
}

// Soft delete: flips isArchived rather than pulling the child out of the
// array, so TextResult/learningEvents history stays intact. Same
// ownership-scoped filter as updateChild.
async function archiveChild(parentId, childId, { session } = {}) {
  const parent = await Parent.findOneAndUpdate(
    activeChildFilter(parentId, childId),
    { $set: { "children.$.isArchived": true } },
    { returnDocument: "after", runValidators: true, session },
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
    const parent = await Parent.findOne(activeChildFilter(parentId, childId), null, { session });

    return parent ? parent.children.id(childId) : null;
  }

  const parent = await Parent.findOneAndUpdate(activeChildFilter(parentId, childId), update, {
    returnDocument: "after",
    runValidators: true,
    session,
  });

  return parent ? parent.children.id(childId) : null;
}

async function addLearningEvent(parentId, childId, event, { session } = {}) {
  const parent = await Parent.findOneAndUpdate(
    activeChildFilter(parentId, childId),
    { $push: { "children.$.learningEvents": event } },
    { returnDocument: "after", runValidators: true, session },
  );

  return parent ? parent.children.id(childId) : null;
}

export {
  findByEmail,
  findByEmailWithPasswordHash,
  findById,
  findByIdWithParentPinHash,
  findByIdWithPasswordHash,
  replaceParentPinHash,
  create,
  addChild,
  updateChild,
  findActiveChild,
  recordChildSession,
  archiveChild,
  recordLogin,
  applyTextCompletionProgress,
  addLearningEvent,
  DuplicateEmailError,
};
