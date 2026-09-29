import express from "express";

import * as parentZoneService from "../services/parentZoneService.js";
import {
  startParentZoneSession,
  endParentZoneSession,
  hasValidParentZoneSession,
} from "../services/parentZoneSession.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { sendErrorResponse } from "../http/errorResponses.js";

const router = express.Router();

const FAILURE_RESPONSES = {
  locked: [429, "parentZoneTooManyAttempts"],
  invalidSecret: [403, "parentZoneInvalidCredentials"],
  pinNotSet: [409, "parentZonePinNotSet"],
  parentNotFound: [401, "authenticationRequired"],
};

function respondToFailure(res, status) {
  const [statusCode, errorResponseName] = FAILURE_RESPONSES[status];

  return sendErrorResponse(res, statusCode, errorResponseName);
}

// Setting a PIN always proves itself with exactly one of currentPin or password — including the
// first one, since a login cookie alone (an unattended browser) must not be able to claim the zone.
function isValidPinChange({ newPin, currentPin, password }) {
  const hasCurrentPin = currentPin !== undefined;
  const hasPassword = password !== undefined;

  if (!parentZoneService.isValidPin(newPin) || hasCurrentPin === hasPassword) {
    return false;
  }

  return hasCurrentPin ? parentZoneService.isValidPin(currentPin) : typeof password === "string" && password.length > 0;
}

router.get("/status", requireAuth, async (req, res) => {
  try {
    res.status(200).json({
      pinSet: await parentZoneService.isPinSet(req.parentId),
      unlocked: hasValidParentZoneSession(req, req.parentId),
    });
  } catch (error) {
    sendErrorResponse(res, 500, "parentZoneFailed", { cause: error });
  }
});

router.post("/unlock", requireAuth, async (req, res) => {
  const { pin } = req.body ?? {};

  if (!parentZoneService.isValidPin(pin)) {
    return sendErrorResponse(res, 400, "parentZoneInvalidInput");
  }

  try {
    const result = await parentZoneService.verifyPin({ parentId: req.parentId, pin });

    if (result.status !== "ok") {
      return respondToFailure(res, result.status);
    }

    startParentZoneSession(res, req.parentId);
    res.status(200).json({ unlocked: true });
  } catch (error) {
    sendErrorResponse(res, 500, "parentZoneFailed", { cause: error });
  }
});

// No requireAuth, like /auth/logout: clearing a cookie must work even when the auth cookie is gone.
router.post("/lock", (req, res) => {
  endParentZoneSession(res);
  res.status(200).json({ locked: true });
});

router.post("/pin", requireAuth, async (req, res) => {
  const { newPin, currentPin, password } = req.body ?? {};

  if (!isValidPinChange({ newPin, currentPin, password })) {
    return sendErrorResponse(res, 400, "parentZoneInvalidInput");
  }

  try {
    const result = await parentZoneService.changePin({ parentId: req.parentId, newPin, currentPin, password });

    if (result.status !== "ok") {
      return respondToFailure(res, result.status);
    }

    startParentZoneSession(res, req.parentId);
    res.status(200).json({ pinSet: true, unlocked: true });
  } catch (error) {
    sendErrorResponse(res, 500, "parentZoneFailed", { cause: error });
  }
});

export default router;
