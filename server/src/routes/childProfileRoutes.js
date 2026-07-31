import express from "express";

import * as parentRepository from "../repositories/parentRepository.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

const READING_LEVELS = ["beginner", "intermediate", "advanced"];
const GENDERS = ["female", "male"];

function toSafeChildProfile(child) {
  return {
    id: child._id,
    name: child.name,
    grammaticalGender: child.grammaticalGender,
    readingLevel: child.learningProfile.readingLevel,
    interests: child.learningProfile.interests,
  };
}

function isNonBlankString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidGender(value) {
  return GENDERS.includes(value);
}

function isValidReadingLevel(value) {
  return READING_LEVELS.includes(value);
}

function isValidInterests(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

router.get("/", requireAuth, async (req, res) => {
  try {
    // Rare edge case (e.g. the account was deleted after the token was
    // issued, before it expired) — same graceful empty-list fallback as
    // before, not an error.
    const parent = await parentRepository.findById(req.parentId);
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

router.post("/", requireAuth, async (req, res) => {
  const { name, grammaticalGender, readingLevel, interests = [] } = req.body;

  if (
    !isNonBlankString(name) ||
    !isValidGender(grammaticalGender) ||
    !isValidReadingLevel(readingLevel) ||
    !isValidInterests(interests)
  ) {
    return res.status(400).json({
      error:
        "name is required, grammaticalGender must be female/male, readingLevel must be beginner/intermediate/advanced, and interests must be a list of strings",
    });
  }

  try {
    const parent = await parentRepository.addChild(req.parentId, {
      name,
      grammaticalGender,
      learningProfile: { readingLevel, interests, completedStepCount: 0 },
    });

    if (!parent) {
      return res.status(404).json({ error: "Parent not found" });
    }

    const createdChild = parent.children[parent.children.length - 1];

    res.status(201).json(toSafeChildProfile(createdChild));
  } catch {
    res.status(500).json({
      error: "Failed to create child profile",
    });
  }
});

router.patch("/:childId", requireAuth, async (req, res) => {
  const { childId } = req.params;
  const { name, grammaticalGender, readingLevel, interests } = req.body;
  const updates = {};

  if (name !== undefined) {
    if (!isNonBlankString(name)) {
      return res.status(400).json({ error: "name must be a non-blank string" });
    }
    updates.name = name;
  }

  if (grammaticalGender !== undefined) {
    if (!isValidGender(grammaticalGender)) {
      return res.status(400).json({ error: 'grammaticalGender must be "female" or "male"' });
    }
    updates.grammaticalGender = grammaticalGender;
  }

  if (readingLevel !== undefined) {
    if (!isValidReadingLevel(readingLevel)) {
      return res
        .status(400)
        .json({ error: "readingLevel must be beginner, intermediate, or advanced" });
    }
    updates.readingLevel = readingLevel;
  }

  if (interests !== undefined) {
    if (!isValidInterests(interests)) {
      return res.status(400).json({ error: "interests must be a list of strings" });
    }
    updates.interests = interests;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "At least one field must be provided" });
  }

  try {
    const updatedChild = await parentRepository.updateChild(req.parentId, childId, updates);

    if (!updatedChild) {
      return res.status(404).json({ error: "Child not found" });
    }

    res.status(200).json(toSafeChildProfile(updatedChild));
  } catch {
    res.status(500).json({
      error: "Failed to update child profile",
    });
  }
});

export default router;
