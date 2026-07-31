import * as parentRepository from "../repositories/parentRepository.js";
import { hashPassword } from "./passwordHasher.js";

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

export { registerParent };
