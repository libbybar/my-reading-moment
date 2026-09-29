import jwt from "jsonwebtoken";

const PARENT_ZONE_COOKIE_NAME = "parentZone";
const PARENT_ZONE_SESSION_SECONDS = 60 * 60;
// Keeps a parent-zone token from being accepted as anything else, and vice versa.
const PARENT_ZONE_SCOPE = "parentZone";

function buildCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  };
}

function generateParentZoneToken(parentId) {
  return jwt.sign({ parentId, scope: PARENT_ZONE_SCOPE }, process.env.JWT_SECRET, {
    expiresIn: PARENT_ZONE_SESSION_SECONDS,
  });
}

function startParentZoneSession(res, parentId) {
  res.cookie(PARENT_ZONE_COOKIE_NAME, generateParentZoneToken(parentId), {
    ...buildCookieOptions(),
    maxAge: PARENT_ZONE_SESSION_SECONDS * 1000,
  });
}

// Must mirror startParentZoneSession's cookie options (minus maxAge) or the browser keeps the cookie.
function endParentZoneSession(res) {
  res.clearCookie(PARENT_ZONE_COOKIE_NAME, buildCookieOptions());
}

function hasValidParentZoneSession(req, parentId) {
  const token = req.cookies?.[PARENT_ZONE_COOKIE_NAME];

  if (!token) {
    return false;
  }

  try {
    const claims = jwt.verify(token, process.env.JWT_SECRET);

    return claims.scope === PARENT_ZONE_SCOPE && claims.parentId === parentId;
  } catch {
    return false;
  }
}

export {
  generateParentZoneToken,
  startParentZoneSession,
  endParentZoneSession,
  hasValidParentZoneSession,
  PARENT_ZONE_COOKIE_NAME,
};
