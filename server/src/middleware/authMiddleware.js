import { verifyToken, AUTH_COOKIE_NAME } from "../services/tokenService.js";
import { sendErrorResponse } from "../http/errorResponses.js";

// Deliberately stateless: this only verifies the token and attaches the
// claimed parentId — it never touches the database. Loading the actual
// parent document is the route's job (via parentRepository), keeping
// "who is this" (middleware) separate from "what do they have" (route).
function requireAuth(req, res, next) {
  const token = req.cookies?.[AUTH_COOKIE_NAME];

  if (!token) {
    return sendErrorResponse(res, 401, "authenticationRequired");
  }

  try {
    const { parentId } = verifyToken(token);

    req.parentId = parentId;
    next();
  } catch {
    // Never distinguish "expired" from "malformed" from "wrong signature"
    // to the caller — same stable, generic response either way.
    sendErrorResponse(res, 401, "authenticationRequired");
  }
}

export { requireAuth };
