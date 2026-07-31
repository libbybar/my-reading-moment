import mongoose from "mongoose";

// Notes keep ids because parents may edit or remove individual entries.
const ParentNoteSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true },
);

export default ParentNoteSchema;
