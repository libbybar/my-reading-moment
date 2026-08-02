import * as parentRepository from "../repositories/parentRepository.js";
import { hashPassword, comparePassword } from "./passwordHasher.js";
import { generateToken } from "./tokenService.js";

async function registerParent({ email, password }) {
  const existingParent = await parentRepository.findByEmail(email);

  if (existingParent) {
    return { status: "emailTaken" };
  }

  const passwordHash = await hashPassword(password);

  try {
    const parent = await parentRepository.create({ email, passwordHash });

    return { status: "created", parent };
  } catch (error) {
    // Closes the race between the findByEmail check above and this create:
    // two concurrent registrations for the same email can both pass the
    // check before either write lands. The repository's DuplicateEmailError
    // (backed by the schema's unique index) is what actually prevents the
    // duplicate; this just turns that into the same "emailTaken" outcome
    // instead of an unhandled 500.
    if (error instanceof parentRepository.DuplicateEmailError) {
      return { status: "emailTaken" };
    }

    throw error;
  }
}

// Unknown email and wrong password both return the same "invalidCredentials"
// outcome — a login route must never let a caller distinguish "no such
// account" from "wrong password" (that's how account enumeration works).
async function loginParent({ email, password }) {
  const parent = await parentRepository.findByEmailWithPasswordHash(email);

  if (!parent) {
    return { status: "invalidCredentials" };
  }

  const passwordMatches = await comparePassword(password, parent.passwordHash);

  if (!passwordMatches) {
    return { status: "invalidCredentials" };
  }

  const updatedParent = await parentRepository.recordLogin(parent._id);
  const token = generateToken(parent);

  return { status: "success", token, parent: updatedParent };
}

export { registerParent, loginParent };
