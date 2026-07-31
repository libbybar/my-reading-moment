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

// No authentication/session exists yet, so nothing can select "the"
// authenticated parent. This is a deliberate stand-in for that lookup,
// picking the first-created parent — not a real multi-tenant query. It
// should be replaced once a real parent identity (session/token) exists.
async function findFirst() {
  return Parent.findOne({}).sort({ createdAt: 1 });
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

export { findByEmail, findFirst, create, addChild, DuplicateEmailError };
