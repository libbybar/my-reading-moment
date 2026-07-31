import Parent from "../models/Parent.js";

const DUPLICATE_KEY_ERROR_CODE = 11000;

class DuplicateEmailError extends Error {
  constructor() {
    super("A parent with this email already exists");
    this.name = "DuplicateEmailError";
  }
}

// Mongoose's schema-level `lowercase`/`trim` only apply when a document is
// saved, not to query filters — every read/write here normalizes its own
// input the same way, so callers never need to know about this quirk.
function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

async function findByEmail(email) {
  return Parent.findOne({ email: normalizeEmail(email) });
}

// Separate from findByEmail on purpose: passwordHash is `select: false` on
// the schema, so every other caller gets a parent without it by default.
// Only login needs the hash, and naming this explicitly makes that need
// visible at the call site instead of a generic method silently returning
// sensitive data.
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

// `runValidators` is off by default on findByIdAndUpdate — without it, an
// invalid embedded child (bad grammaticalGender, missing learningProfile
// fields) would save silently instead of being rejected.
async function addChild(parentId, child) {
  return Parent.findByIdAndUpdate(
    parentId,
    { $push: { children: child } },
    { returnDocument: "after", runValidators: true },
  );
}

// Compound filter (_id + children._id) is what enforces ownership — a
// parent can only ever update a child that's actually embedded in their own
// document, even if they guess another child's real id.
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

export {
  findByEmail,
  findByEmailWithPasswordHash,
  findById,
  create,
  addChild,
  updateChild,
  recordLogin,
  DuplicateEmailError,
};
