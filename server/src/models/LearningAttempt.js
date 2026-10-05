import mongoose from "mongoose";

import { READABILITY_BANDS } from "../data/readabilityBands.js";
import { STORY_DETECTIVES_MISSIONS } from "../data/learningMissions.js";
import { SUPPORT_LEVELS, INTERACTIVE_OUTCOMES, EXPRESSIVE_STATES } from "./learningItemStates.js";

// Metadata only: never the generated story or any child answer. The
// fingerprint and signature are what anti-replay needs after the item is gone.
const LearningAttemptSchema = new mongoose.Schema({
  // Durable once-only key for ending an item; backstops the in-store claim.
  attemptId: {
    type: String,
    required: true,
    unique: true,
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  childId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  missionId: {
    type: String,
    required: true,
    enum: STORY_DETECTIVES_MISSIONS.map((mission) => mission.missionId),
  },
  band: {
    type: String,
    required: true,
    enum: READABILITY_BANDS,
  },
  contentFingerprint: {
    type: String,
    required: true,
  },
  variationSignature: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    required: true,
    enum: ["completed", "skipped", "interrupted"],
  },
  // Highest support reached, so a supported completion can never read as independent.
  supportLevel: {
    type: String,
    required: true,
    enum: SUPPORT_LEVELS,
  },
  interactiveOutcome: {
    type: String,
    required: true,
    enum: INTERACTIVE_OUTCOMES,
  },
  expressiveState: {
    type: String,
    required: true,
    enum: EXPRESSIVE_STATES,
  },
  startedAt: {
    type: Date,
    required: true,
  },
  endedAt: {
    type: Date,
    required: true,
  },
});

LearningAttemptSchema.index({ parentId: 1, childId: 1, endedAt: -1 });

export default mongoose.models.LearningAttempt || mongoose.model("LearningAttempt", LearningAttemptSchema);
