import mongoose from "mongoose";

import { READABILITY_BANDS, STARTING_SIGNALS } from "../data/readabilityBands.js";

// Outcomes only, never which sentence the child tapped.
const PlacementObservationSchema = new mongoose.Schema(
  {
    band: { type: String, required: true, enum: READABILITY_BANDS },
    outcome: { type: String, required: true, enum: ["correct", "incorrect", "skipped", "dropped"] },
  },
  { _id: false },
);

const PlacementCurrentItemSchema = new mongoose.Schema(
  {
    itemId: { type: String, required: true },
    isPractice: { type: Boolean, required: true },
    // Interface help is instruction support: it drops the item from the evidence.
    instructionHelp: { type: Boolean, required: true, default: false },
  },
  { _id: false },
);

const PlacementSchema = new mongoose.Schema(
  {
    practiceCompleted: { type: Boolean, required: true, default: false },
    observations: [PlacementObservationSchema],
    currentItem: { type: PlacementCurrentItemSchema, default: null },
    // Items already issued in this placement, so none is shown twice.
    usedItemIds: [String],
  },
  { _id: false },
);

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
    placement: {
      type: PlacementSchema,
      default: () => ({}),
    },
  },
  { timestamps: true },
);

LearningJourneySchema.index({ parentId: 1, childId: 1 }, { unique: true });

export default mongoose.models.LearningJourney || mongoose.model("LearningJourney", LearningJourneySchema);
