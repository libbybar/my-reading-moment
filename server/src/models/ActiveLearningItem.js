import mongoose from "mongoose";

import { READABILITY_BANDS } from "../data/readabilityBands.js";
import { STORY_DETECTIVES_MISSIONS } from "../data/learningMissions.js";
import { SUPPORT_LEVELS, INTERACTIVE_OUTCOMES, EXPRESSIVE_STATES } from "./learningItemStates.js";

const BACKSTOP_TTL_SECONDS = 7 * 24 * 60 * 60;

// Working storage for the one item a child is on, deleted when it ends.
// It holds the server-side generated item and support state, never a child answer.
const ActiveLearningItemSchema = new mongoose.Schema({
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
  item: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  supportLevel: {
    type: String,
    required: true,
    enum: SUPPORT_LEVELS,
    default: "independent",
  },
  interactiveOutcome: {
    type: String,
    required: true,
    enum: INTERACTIVE_OUTCOMES,
    default: "not_attempted",
  },
  expressiveState: {
    type: String,
    required: true,
    enum: EXPRESSIVE_STATES,
    default: "not_reached",
  },
  state: {
    type: String,
    required: true,
    enum: ["active", "claimed"],
    default: "active",
  },
  // A claim older than the lease no longer blocks, so a crashed request cannot lock a child out.
  claimedAt: {
    type: Date,
  },
  // Release and completion must present the token of the claim they hold, so a
  // request that outlived its lease cannot end a claim someone else has since taken.
  claimToken: {
    type: String,
  },
  startedAt: {
    type: Date,
    required: true,
  },
  lastActivityAt: {
    type: Date,
    required: true,
  },
});

// One unfinished item per child.
ActiveLearningItemSchema.index({ parentId: 1, childId: 1 }, { unique: true });

// Backstop so abandoned snapshots never accumulate; the 24-hour resume rule is enforced in code.
ActiveLearningItemSchema.index({ lastActivityAt: 1 }, { expireAfterSeconds: BACKSTOP_TTL_SECONDS });

export default mongoose.models.ActiveLearningItem ||
  mongoose.model("ActiveLearningItem", ActiveLearningItemSchema);
