import express from "express";

import * as parentRepository from "../repositories/parentRepository.js";

const router = express.Router();

function toSafeChildProfile(child) {
  return {
    id: child._id,
    name: child.name,
    grammaticalGender: child.grammaticalGender,
    readingLevel: child.learningProfile.readingLevel,
  };
}

router.get("/", async (req, res) => {
  try {
    const parent = await parentRepository.findFirst();
    const children = parent ? parent.children : [];

    res.status(200).json({
      childProfiles: children.map(toSafeChildProfile),
    });
  } catch {
    res.status(500).json({
      error: "Failed to load child profiles",
    });
  }
});

export default router;
