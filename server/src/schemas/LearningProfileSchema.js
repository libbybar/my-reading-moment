import mongoose from "mongoose";

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
    // Current station is derived from this count, not stored separately.
    completedStepCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  { _id: false, timestamps: true },
);

export default LearningProfileSchema;
