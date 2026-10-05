import mongoose from "mongoose";

import { READABILITY_BANDS, STARTING_SIGNALS } from "../data/readabilityBands.js";

const LearningJourneySchema = new mongoose.Schema(
  {
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    childId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    startingSignal: {
      type: String,
      required: true,
      enum: STARTING_SIGNALS,
    },
    seedBand: {
      type: String,
      required: true,
      enum: READABILITY_BANDS,
    },
    // Written only by placement; null until it finishes.
    provisionalAnchorBand: {
      type: String,
      enum: READABILITY_BANDS,
      default: null,
    },
    placementStatus: {
      type: String,
      required: true,
      enum: ["not_started", "in_progress", "complete"],
      default: "not_started",
    },
  },
  { timestamps: true },
);

LearningJourneySchema.index({ parentId: 1, childId: 1 }, { unique: true });

export default mongoose.models.LearningJourney || mongoose.model("LearningJourney", LearningJourneySchema);
