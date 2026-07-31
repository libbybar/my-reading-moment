import mongoose from "mongoose";

// The summary is reached only through its child; it is never looked up by id.
const AiSummarySchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },
    generatedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { _id: false },
);

export default AiSummarySchema;
