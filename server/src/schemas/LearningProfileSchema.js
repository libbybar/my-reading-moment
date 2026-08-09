import mongoose from "mongoose";

import { MIN_LEVEL, MAX_LEVEL, MIN_SUBLEVEL, MAX_SUBLEVEL } from "../data/readingLevelSpec.js";

// The profile is reached only through its child; it is never looked up by id.
const LearningProfileSchema = new mongoose.Schema(
  {
    readingLevel: {
      type: String,
      required: true,
      enum: ["beginner", "intermediate", "advanced"],
    },
    interests: [
      {
        type: String,
        trim: true,
      },
    ],
    // System-derived pedagogical position (Learning Progression). Kept alongside
    // the coarse `readingLevel` enum for now, not replacing it yet.
    currentLevel: {
      type: Number,
      required: true,
      default: MIN_LEVEL,
      min: MIN_LEVEL,
      max: MAX_LEVEL,
    },
    currentSublevel: {
      type: Number,
      required: true,
      default: MIN_SUBLEVEL,
      min: MIN_SUBLEVEL,
      max: MAX_SUBLEVEL,
    },
  },
  { _id: false, timestamps: true },
);

export default LearningProfileSchema;
