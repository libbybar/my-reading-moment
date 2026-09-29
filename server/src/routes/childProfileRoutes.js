import express from "express";

import readingSessionStore from "../services/readingSessionStore.js";
import * as parentRepository from "../repositories/parentRepository.js";
import * as textResultRepository from "../repositories/textResultRepository.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireParentZone } from "../middleware/parentZoneMiddleware.js";
import { sendErrorResponse } from "../http/errorResponses.js";
import INTERESTS from "../data/interests.js";
import AVATARS from "../data/avatars.js";

const router = express.Router();

// No cleanup/TTL exists on TextResult — a generous but bounded cap for the
// progress-report history, not a real pagination scheme (not needed yet).
const PROGRESS_HISTORY_LIMIT = 200;

const READING_LEVELS = ["beginner", "intermediate", "advanced"];
const GENDERS = ["female", "male"];

function toSafeChildProfile(child) {
  return {
    id: child._id,
    name: child.name,
    grammaticalGender: child.grammaticalGender,
    readingLevel: child.learningProfile.readingLevel,
    // Filters out any pre-allow-list free text still sitting in older
    // documents. Without this, the edit form would load a stale value that
    // has no matching chip (so the parent can never see or remove it), and
    // every future save would keep resubmitting — and keep failing — since
    // the route rejects the whole request the moment one value isn't
    // allow-listed, even for fields unrelated to interests.
    interests: child.learningProfile.interests.filter((interest) => INTERESTS.includes(interest)),
    journeyProgress: child.journeyProgress,
    // null (not omitted) when the child hasn't picked one yet — the client
    // treats "no avatarId" as the signal to show the picker.
    avatarId: AVATARS.includes(child.avatarId) ? child.avatarId : null,
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

// A fixed allow-list, not free text — interests flow into Gemini's
// generatePassage prompt, so this is a prompt-injection boundary, not just
// input hygiene. Never trust the client to have already restricted this.
function isValidInterests(value) {
  return Array.isArray(value) && value.every((item) => INTERESTS.includes(item));
}

function isValidAvatarId(value) {
  return AVATARS.includes(value);
}

router.get("/", requireAuth, async (req, res) => {
  try {
    // Token may outlive a deleted parent account.
    const parent = await parentRepository.findById(req.parentId);
    const children = parent ? parent.children : [];

    res.status(200).json({
      childProfiles: children.filter((child) => !child.isArchived).map(toSafeChildProfile),
    });
  } catch (error) {
    sendErrorResponse(res, 500, "childProfilesLoadFailed", { cause: error });
  }
});

function toSafeTextResult(result) {
  return {
    level: result.level,
    sublevel: result.sublevel,
    result: result.result,
    completedAt: result.completedAt,
  };
}

// Same ownership pattern as every other single-child lookup in this codebase
// (readingSessionRoutes.js's /preview, most notably): load the parent's own
// document first, then look up the child as a subdocument — never a bare
// childId query. An unowned or archived child is indistinguishable from one
// that doesn't exist.
router.get("/:childId/progress", requireAuth, requireParentZone, async (req, res) => {
  const { childId } = req.params;

  let child;

  try {
    const parent = await parentRepository.findById(req.parentId);

    child = parent?.children.id(childId);
  } catch {
    child = null;
  }

  if (!child || child.isArchived) {
    return sendErrorResponse(res, 404, "childNotFound");
  }

  try {
    const results = await textResultRepository.findAllForChild({
      parentId: req.parentId,
      childId,
      limit: PROGRESS_HISTORY_LIMIT,
    });

    res.status(200).json({
      currentLevel: child.learningProfile.currentLevel,
      currentSublevel: child.learningProfile.currentSublevel,
      journeyProgress: child.journeyProgress,
      results: results.map(toSafeTextResult),
    });
  } catch (error) {
    sendErrorResponse(res, 500, "childProfileProgressLoadFailed", { cause: error });
  }
});

router.post("/", requireAuth, requireParentZone, async (req, res) => {
  // req.body is undefined (not {}) when the request has no body/JSON
  // Content-Type at all — same fix as auth's /register and /login.
  const { name, grammaticalGender, readingLevel, interests = [] } = req.body ?? {};

  if (
    !isNonBlankString(name) ||
    !isValidGender(grammaticalGender) ||
    !isValidReadingLevel(readingLevel) ||
    !isValidInterests(interests)
  ) {
    return sendErrorResponse(res, 400, "childProfileCreateInvalidInput");
  }

  try {
    const parent = await parentRepository.addChild(req.parentId, {
      name,
      grammaticalGender,
      learningProfile: { readingLevel, interests },
      journeyProgress: 0,
    });

    if (!parent) {
      return sendErrorResponse(res, 404, "parentNotFound");
    }

    const createdChild = parent.children[parent.children.length - 1];

    res.status(201).json(toSafeChildProfile(createdChild));
  } catch (error) {
    sendErrorResponse(res, 500, "childProfileCreateFailed", { cause: error });
  }
});

router.patch("/:childId", requireAuth, requireParentZone, async (req, res) => {
  const { childId } = req.params;
  // req.body is undefined (not {}) when the request has no body/JSON
  // Content-Type at all — same fix as auth's /register and /login.
  const { name, grammaticalGender, readingLevel, interests, avatarId } = req.body ?? {};
  const updates = {};

  if (name !== undefined) {
    if (!isNonBlankString(name)) {
      return sendErrorResponse(res, 400, "childProfileInvalidName");
    }
    updates.name = name;
  }

  if (grammaticalGender !== undefined) {
    if (!isValidGender(grammaticalGender)) {
      return sendErrorResponse(res, 400, "childProfileInvalidGrammaticalGender");
    }
    updates.grammaticalGender = grammaticalGender;
  }

  if (readingLevel !== undefined) {
    if (!isValidReadingLevel(readingLevel)) {
      return sendErrorResponse(res, 400, "childProfileInvalidReadingLevel");
    }
    updates.readingLevel = readingLevel;
  }

  if (interests !== undefined) {
    if (!isValidInterests(interests)) {
      return sendErrorResponse(res, 400, "childProfileInvalidInterests");
    }
    updates.interests = interests;
  }

  if (avatarId !== undefined) {
    if (!isValidAvatarId(avatarId)) {
      return sendErrorResponse(res, 400, "childProfileInvalidAvatar");
    }
    updates.avatarId = avatarId;
  }

  if (Object.keys(updates).length === 0) {
    return sendErrorResponse(res, 400, "childProfileUpdateEmpty");
  }

  try {
    const updatedChild = await parentRepository.updateChild(req.parentId, childId, updates);

    if (!updatedChild) {
      return sendErrorResponse(res, 404, "childNotFound");
    }

    res.status(200).json(toSafeChildProfile(updatedChild));
  } catch (error) {
    sendErrorResponse(res, 500, "childProfileUpdateFailed", { cause: error });
  }
});

// Child-facing, so deliberately outside the parent zone: it can change nothing but the avatar.
router.patch("/:childId/avatar", requireAuth, async (req, res) => {
  const { avatarId } = req.body ?? {};

  if (!isValidAvatarId(avatarId)) {
    return sendErrorResponse(res, 400, "childProfileInvalidAvatar");
  }

  try {
    const updatedChild = await parentRepository.updateChild(req.parentId, req.params.childId, { avatarId });

    if (!updatedChild) {
      return sendErrorResponse(res, 404, "childNotFound");
    }

    res.status(200).json(toSafeChildProfile(updatedChild));
  } catch (error) {
    sendErrorResponse(res, 500, "childProfileUpdateFailed", { cause: error });
  }
});

// "Delete" from the parent's/product's perspective — actually a soft
// archive (see ChildSchema.js), so TextResult/learningEvents history is
// never destroyed. There is no restore endpoint yet.
router.delete("/:childId", requireAuth, requireParentZone, async (req, res) => {
  const { childId } = req.params;

  try {
    const archivedChild = await parentRepository.archiveChild(req.parentId, childId);

    if (!archivedChild) {
      return sendErrorResponse(res, 404, "childNotFound");
    }

    readingSessionStore.discardActiveSessionForChild(req.parentId, childId);

    res.status(200).json({ success: true });
  } catch (error) {
    sendErrorResponse(res, 500, "childProfileDeleteFailed", { cause: error });
  }
});

export default router;
