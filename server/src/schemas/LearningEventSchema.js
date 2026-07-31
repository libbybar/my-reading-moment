import mongoose from "mongoose";

// Events keep ids because individual milestones may be referenced later.
const LearningEventSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    trim: true,
  },
  source: {
    type: String,
    required: true,
    enum: ["system", "parent"],
  },
  // Mongoose does not track in-place mutations to Mixed values; call markModified("payload").
  payload: {
    type: mongoose.Schema.Types.Mixed,
    validate: {
      validator: (value) =>
        value === undefined || (typeof value === "object" && value !== null && !Array.isArray(value)),
      message: "payload must be a plain object",
    },
  },
  occurredAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

export default LearningEventSchema;
