import crypto from "crypto";
import express from "express";

import * as parentService from "../services/parentService.js";
import { writeDebugLog, runWithRequestId } from "../services/debugLogger.js";
import { TOKEN_EXPIRES_IN_SECONDS, AUTH_COOKIE_NAME } from "../services/tokenService.js";
import { sendErrorResponse } from "../http/errorResponses.js";

const router = express.Router();

const MIN_PASSWORD_LENGTH = 8;
// Deliberately lenient; stricter email patterns reject too many real addresses.
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

function isValidEmail(value) {
  return typeof value === "string" && EMAIL_PATTERN.test(value.trim());
}

// Registration enforces password *strength* (>= MIN_PASSWORD_LENGTH); login
// only needs to know a password was sent at all — rejecting a well-formed
// short password here would confirm the account's password length to
// whoever's guessing, which isn't login's job to reveal. The real check is
// bcrypt comparison, not this.
function isNonBlankPassword(value) {
  return typeof value === "string" && value.length > 0;
}

function isValidPassword(value) {
  return typeof value === "string" && value.length >= MIN_PASSWORD_LENGTH;
}

// Never pass a Mongoose document straight to res.json.
function toSafeParent(parent) {
  return {
    id: parent._id,
    email: parent.email,
    createdAt: parent.createdAt,
  };
}

function logError(label, error) {
  writeDebugLog({
    tag: "Error",
    label,
    errorName: error.name,
    errorMessage: error.message,
    errorStatus: error.status ?? null,
  });
}

router.post("/register", async (req, res) => {
  const requestId = crypto.randomUUID().slice(0, 8);

  return runWithRequestId(requestId, async () => {
    writeDebugLog({ tag: "Route", label: "POST /auth/register received" });
    const requestStartTime = Date.now();

    // req.body is undefined (not {}) when the request has no body/JSON
    // Content-Type at all — same fix as /login.
    const { email, password } = req.body ?? {};

    if (!isValidEmail(email) || !isValidPassword(password)) {
      return sendErrorResponse(res, 400, "registerInvalidInput");
    }

    try {
      const result = await parentService.registerParent({ email, password });

      if (result.status === "emailTaken") {
        return sendErrorResponse(res, 409, "registerEmailTaken");
      }

      res.status(201).json(toSafeParent(result.parent));
    } catch (error) {
      logError("POST /auth/register", error);
      sendErrorResponse(res, 500, "registerFailed", { cause: error });
    } finally {
      writeDebugLog({
        tag: "Route",
        label: "POST /auth/register",
        durationSeconds: Number(((Date.now() - requestStartTime) / 1000).toFixed(2)),
      });
    }
  });
});

router.post("/login", async (req, res) => {
  const requestId = crypto.randomUUID().slice(0, 8);

  return runWithRequestId(requestId, async () => {
    writeDebugLog({ tag: "Route", label: "POST /auth/login received" });
    const requestStartTime = Date.now();

    // req.body is undefined (not {}) when the request has no body/JSON
    // Content-Type at all — express.json() only ever populates req.body
    // when it actually parses something.
    const { email, password } = req.body ?? {};

    if (!isValidEmail(email) || !isNonBlankPassword(password)) {
      return sendErrorResponse(res, 400, "loginInvalidInput");
    }

    try {
      const result = await parentService.loginParent({ email, password });

      if (result.status === "invalidCredentials") {
        return sendErrorResponse(res, 401, "loginInvalidCredentials");
      }

      // The token lives only in the cookie — never in the response body,
      // so it can't end up in browser history, logs, or client-side JS.
      res.cookie(AUTH_COOKIE_NAME, result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: TOKEN_EXPIRES_IN_SECONDS * 1000,
      });
      res.status(200).json(toSafeParent(result.parent));
    } catch (error) {
      logError("POST /auth/login", error);
      sendErrorResponse(res, 500, "loginFailed", { cause: error });
    } finally {
      writeDebugLog({
        tag: "Route",
        label: "POST /auth/login",
        durationSeconds: Number(((Date.now() - requestStartTime) / 1000).toFixed(2)),
      });
    }
  });
});

// No requireAuth: logging out must succeed even with a missing, expired, or
// malformed cookie — the goal is "the browser no longer holds this cookie,"
// not "you were provably logged in." Note this only clears the cookie; the
// JWT itself is stateless and not server-side revoked (out of scope here).
router.post("/logout", (req, res) => {
  const requestId = crypto.randomUUID().slice(0, 8);

  return runWithRequestId(requestId, () => {
    writeDebugLog({ tag: "Route", label: "POST /auth/logout received" });
    const requestStartTime = Date.now();

    // Must mirror login's res.cookie options (minus maxAge) or the browser
    // won't recognize this as clearing the same cookie.
    res.clearCookie(AUTH_COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
    res.status(200).json({ success: true });

    writeDebugLog({
      tag: "Route",
      label: "POST /auth/logout",
      durationSeconds: Number(((Date.now() - requestStartTime) / 1000).toFixed(2)),
    });
  });
});

export default router;
