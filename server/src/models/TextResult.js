import mongoose from "mongoose";

import { MIN_LEVEL, MAX_LEVEL, MIN_SUBLEVEL, MAX_SUBLEVEL } from "../data/readingLevelSpec.js";

// Minimal pedagogical evidence, not a transcript — never the passage/question text itself.
const TextResultEvidenceSchema = new mongoose.Schema(
  {
    questionsTotal: { type: Number, min: 0 },
    questionsCorrect: { type: Number, min: 0 },
  },
  { _id: false },
);

// The durable, canonical outcome of one completed active reading session.
// Source of truth for Learning Progression — never re-derived from LearningEvent.
const TextResultSchema = new mongoose.Schema({
  // Durable once-only key for finalizing an active session.
  sessionId: {
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
  level: {
    type: Number,
    required: true,
    min: MIN_LEVEL,
    max: MAX_LEVEL,
  },
  sublevel: {
    type: Number,
    required: true,
    min: MIN_SUBLEVEL,
    max: MAX_SUBLEVEL,
  },
  specVersion: {
    type: Number,
    required: true,
  },
  result: {
    type: String,
    required: true,
    enum: ["success", "failure", "skipped"],
  },
  startedAt: {
    type: Date,
    required: true,
  },
  completedAt: {
    type: Date,
    required: true,
  },
  evidence: {
    type: TextResultEvidenceSchema,
    required: false,
  },
});

// Matches Progression's raw skip-streak query.
TextResultSchema.index(
  { parentId: 1, childId: 1, level: 1, sublevel: 1, completedAt: -1 },
  { name: "recent_raw" },
);

// Partial index for success/failure windows; query filter must match this exactly.
TextResultSchema.index(
  { parentId: 1, childId: 1, level: 1, sublevel: 1, completedAt: -1 },
  { name: "recent_non_skipped", partialFilterExpression: { result: { $in: ["success", "failure"] } } },
);

export default mongoose.models.TextResult || mongoose.model("TextResult", TextResultSchema);
