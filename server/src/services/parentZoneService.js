import * as parentRepository from "../repositories/parentRepository.js";
import { hashPassword, comparePassword } from "./passwordHasher.js";
import { isLockedOut, recordFailedAttempt, clearFailedAttempts } from "./parentZoneAttemptLimiter.js";

const PIN_PATTERN = /^\d{4}$/;

function isValidPin(value) {
  return typeof value === "string" && PIN_PATTERN.test(value);
}

// Failures of the PIN and of the account password share one counter, so
// guessing the password through the reset route can't dodge the lockout.
async function checkSecret({ parentId, secret, loadHash }) {
  if (isLockedOut(parentId)) {
    return { status: "locked" };
  }

  const hash = await loadHash();

  if (hash === undefined) {
    return { status: "parentNotFound" };
  }

  if (hash === null) {
    return { status: "pinNotSet" };
  }

  if (!(await comparePassword(secret, hash))) {
    recordFailedAttempt(parentId);

    return { status: "invalidSecret" };
  }

  clearFailedAttempts(parentId);

  return { status: "ok" };
}

async function loadPinHash(parentId) {
  const parent = await parentRepository.findByIdWithParentPinHash(parentId);

  return parent ? (parent.parentPinHash ?? null) : undefined;
}

async function loadPasswordHash(parentId) {
  const parent = await parentRepository.findByIdWithPasswordHash(parentId);

  return parent?.passwordHash;
}

async function isPinSet(parentId) {
  const pinHash = await loadPinHash(parentId);

  return typeof pinHash === "string";
}

async function verifyPin({ parentId, pin }) {
  return checkSecret({ parentId, secret: pin, loadHash: () => loadPinHash(parentId) });
}

function verifyPassword({ parentId, password }) {
  return checkSecret({ parentId, secret: password, loadHash: () => loadPasswordHash(parentId) });
}

// The password is the recovery path for a forgotten PIN — the only other secret the parent has.
async function changePin({ parentId, newPin, currentPin, password }) {
  const check =
    currentPin !== undefined
      ? await verifyPin({ parentId, pin: currentPin })
      : await verifyPassword({ parentId, password });

  if (check.status !== "ok") {
    return check;
  }

  await parentRepository.replaceParentPinHash(parentId, await hashPassword(newPin));

  return { status: "ok" };
}

export { isValidPin, isPinSet, verifyPin, changePin };
