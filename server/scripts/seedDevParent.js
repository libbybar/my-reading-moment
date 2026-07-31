import "dotenv/config";
import mongoose from "mongoose";

import { connectToDatabase } from "../src/config/db.js";
import * as parentRepository from "../src/repositories/parentRepository.js";
import { hashPassword } from "../src/services/passwordHasher.js";
import mockChildProfiles from "../src/data/mockChildProfiles.js";

// Dev-only: not the real registration flow. Its whole purpose is to give
// GET /api/child-profiles the same two children mockChildProfiles used to
// provide, now as a real embedded Parent document.
const SEED_PARENT_EMAIL = "dev-parent@example.com";
const SEED_PARENT_PASSWORD = "dev-password-123";

function toSeedChild(profile) {
  return {
    name: profile.name,
    grammaticalGender: profile.grammaticalGender,
    learningProfile: {
      readingLevel: profile.readingLevel,
      interests: profile.interests,
      completedStepCount: 0,
    },
  };
}

async function seed() {
  await connectToDatabase();

  // Idempotent: re-running the seed must never create a second parent for
  // the same email — checking first, rather than relying only on the
  // schema's unique index, lets a repeat run report "already seeded"
  // instead of failing.
  const existing = await parentRepository.findByEmail(SEED_PARENT_EMAIL);

  if (existing) {
    console.log(
      `Seed parent "${SEED_PARENT_EMAIL}" already exists (${existing.children.length} children) — skipping.`,
    );
  } else {
    const passwordHash = await hashPassword(SEED_PARENT_PASSWORD);
    const parent = await parentRepository.create({
      email: SEED_PARENT_EMAIL,
      passwordHash,
      children: mockChildProfiles.map(toSeedChild),
    });

    console.log(
      `Created seed parent "${parent.email}" (password: "${SEED_PARENT_PASSWORD}") with ${parent.children.length} children.`,
    );
  }

  await mongoose.disconnect();
}

seed().catch((error) => {
  console.error("Seed failed:", error.message);
  process.exitCode = 1;
});
