import mongoose from "mongoose";

import LearningProfileSchema from "./LearningProfileSchema.js";
import LearningEventSchema from "./LearningEventSchema.js";
import ParentNoteSchema from "./ParentNoteSchema.js";
import AiSummarySchema from "./AiSummarySchema.js";

// Embedded children still need their own ids because routes address one child at a time.
const ChildSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  // Missing gender is a data-contract failure, never a guessed fallback.
  grammaticalGender: {
    type: String,
    required: true,
    enum: ["female", "male"],
  },
  lastSessionAt: {
    type: Date,
  },
  // Every child must always have the profile data needed to generate an exercise.
  learningProfile: {
    type: LearningProfileSchema,
    required: true,
  },
  // Motivational "journey path" position — deliberately NOT part of learningProfile:
  // it advances on every successful text regardless of whether Learning Progression
  // (level/sublevel) changes, and has no final/maximum value baked into the model.
  journeyProgress: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  learningEvents: [LearningEventSchema],
  parentNotes: [ParentNoteSchema],
  aiSummary: AiSummarySchema,
});

export default ChildSchema;
