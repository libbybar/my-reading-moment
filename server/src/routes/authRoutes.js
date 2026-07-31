import crypto from "crypto";
import express from "express";

import * as parentService from "../services/parentService.js";
import { writeDebugLog, runWithRequestId } from "../services/debugLogger.js";

const router = express.Router();

const MIN_PASSWORD_LENGTH = 8;
// Deliberately lenient; stricter email patterns reject too many real addresses.
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

function isValidEmail(value) {
  return typeof value === "string" && EMAIL_PATTERN.test(value.trim());
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

    const { email, password } = req.body;

    if (!isValidEmail(email) || !isValidPassword(password)) {
      return res.status(400).json({
        error: `email must be a valid address and password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      });
    }

    try {
      const result = await parentService.registerParent({ email, password });

      if (result.status === "emailTaken") {
        return res.status(409).json({
          error: "A parent account with this email already exists",
        });
      }

      res.status(201).json(toSafeParent(result.parent));
    } catch (error) {
      logError("POST /auth/register", error);
      res.status(500).json({
        error: "Failed to register parent account",
      });
    } finally {
      writeDebugLog({
        tag: "Route",
        label: "POST /auth/register",
        durationSeconds: Number(((Date.now() - requestStartTime) / 1000).toFixed(2)),
      });
    }
  });
});

export default router;
