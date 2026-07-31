import mongoose from "mongoose";

import ChildSchema from "../schemas/ChildSchema.js";

const ParentSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    lastLoginAt: {
      type: Date,
    },
    children: [ChildSchema],
  },
  { timestamps: true },
);

// Avoid scanning every parent's children array when resolving the active child.
ParentSchema.index({ "children._id": 1 });

export default mongoose.models.Parent || mongoose.model("Parent", ParentSchema);
