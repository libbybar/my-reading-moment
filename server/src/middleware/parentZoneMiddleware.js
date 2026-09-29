import { hasValidParentZoneSession, startParentZoneSession } from "../services/parentZoneSession.js";
import { sendErrorResponse } from "../http/errorResponses.js";

// Must run after requireAuth: the session is bound to the authenticated parentId.
function requireParentZone(req, res, next) {
  if (!hasValidParentZoneSession(req, req.parentId)) {
    return sendErrorResponse(res, 403, "parentZoneLocked");
  }

  // Sliding expiry: every parent-zone action restarts the hour.
  startParentZoneSession(res, req.parentId);
  next();
}

export { requireParentZone };
