import jwt from "jsonwebtoken";

// Kept short and deliberately minimal: only the claim actually needed to
// look up the parent again. No email, no other data — the token is an
// identity pointer, not a place to cache anything.
//
// Exported as seconds (not just used inline) so the login route can derive
// the auth cookie's maxAge from the same number, instead of a second
// "7 days" duplicated in a different file and free to drift out of sync.
const TOKEN_EXPIRES_IN_SECONDS = 7 * 24 * 60 * 60;

// Shared by the login route (sets it) and the auth middleware (reads it) —
// defined once here so the two can't drift to different cookie names.
const AUTH_COOKIE_NAME = "token";

function generateToken(parent) {
  return jwt.sign({ parentId: parent._id.toString() }, process.env.JWT_SECRET, {
    expiresIn: TOKEN_EXPIRES_IN_SECONDS,
  });
}

// Throws (JsonWebTokenError/TokenExpiredError) on a missing, malformed,
// mis-signed, or expired token — callers decide what that means for them,
// same as every other error in this codebase.
function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

export { generateToken, verifyToken, TOKEN_EXPIRES_IN_SECONDS, AUTH_COOKIE_NAME };
