import express from "express";

import * as placementService from "../services/placementService.js";
import { PlacementError } from "../services/placementService.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { sendErrorResponse } from "../http/errorResponses.js";

// Child-facing, so it needs the parent's login but deliberately not the parent zone.
const router = express.Router({ mergeParams: true });

const ERROR_RESPONSE_BY_REASON = {
  child_not_found: [404, "childNotFound"],
  estimate_missing: [409, "placementEstimateMissing"],
  no_active_placement: [409, "placementNotStarted"],
  unavailable: [503, "placementUnavailable"],
  invalid_input: [400, "placementInvalidInput"],
};

function isNonBlankString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function sendPlacementError(res, error) {
  const response = error instanceof PlacementError ? ERROR_RESPONSE_BY_REASON[error.reason] : null;

  if (response) {
    return sendErrorResponse(res, ...response);
  }

  return sendErrorResponse(res, 500, "placementFailed", { cause: error });
}

// Identity comes only from the token and the path, never from the body.
function handlePlacementRequest(performRequest) {
  return async (req, res) => {
    const { itemId, selectedSentenceIndex } = req.body ?? {};

    try {
      const view = await performRequest({
        parentId: req.parentId,
        childId: req.params.childId,
        itemId,
        selectedSentenceIndex,
      });

      res.status(200).json(view);
    } catch (error) {
      sendPlacementError(res, error);
    }
  };
}

function requireItemId(req, res, next) {
  if (!isNonBlankString(req.body?.itemId)) {
    return sendErrorResponse(res, 400, "placementInvalidInput");
  }

  next();
}

router.post("/", requireAuth, handlePlacementRequest(placementService.startOrResumePlacement));

router.post("/answer", requireAuth, requireItemId, handlePlacementRequest(placementService.submitPlacementAnswer));

router.post("/skip", requireAuth, requireItemId, handlePlacementRequest(placementService.skipPlacementItem));

router.post(
  "/instruction-help",
  requireAuth,
  requireItemId,
  handlePlacementRequest(placementService.requestInstructionHelp),
);

export default router;
