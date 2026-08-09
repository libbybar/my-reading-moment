import mongoose from "mongoose";

import * as textResultRepository from "../repositories/textResultRepository.js";
import * as parentRepository from "../repositories/parentRepository.js";
import { computeProgression } from "./progression.js";
import { READING_LEVEL_SPEC_VERSION } from "../data/readingLevelSpec.js";

const SUCCESS_WINDOW_SIZE = 4;
const SKIP_STREAK_SIZE = 2;
const DUPLICATE_KEY_ERROR_CODE = 11000;

// Atomic text completion: terminal LearningEvent (if any), TextResult,
// progression, and journeyProgress commit together.
// Progression reads the just-created TextResult inside the same transaction.
async function completeText({
  sessionId,
  parentId,
  childId,
  level,
  sublevel,
  result,
  startedAt,
  evidence,
  learningEvent,
}) {
  const session = await mongoose.startSession();
  let progressionOutcome;

  try {
    await session.withTransaction(async () => {
      await textResultRepository.create(
        {
          sessionId,
          parentId,
          childId,
          level,
          sublevel,
          specVersion: READING_LEVEL_SPEC_VERSION,
          result,
          startedAt,
          completedAt: new Date(),
          evidence,
        },
        { session },
      );

      if (learningEvent) {
        const updatedChild = await parentRepository.addLearningEvent(parentId, childId, learningEvent, {
          session,
        });

        if (!updatedChild) {
          // Abort the transaction rather than orphaning a TextResult.
          throw new Error(`completeText: no child ${childId} for parent ${parentId} (addLearningEvent)`);
        }
      }

      // Sequential, not Promise.all: a MongoDB ClientSession does not support
      // concurrent operations sharing it — two reads racing on the same
      // transaction session is a real driver hazard, not just a style choice.
      const recentRaw = await textResultRepository.findRecentRaw(
        { parentId, childId, level, sublevel, limit: SKIP_STREAK_SIZE },
        { session },
      );
      const recentNonSkipped = await textResultRepository.findRecentNonSkipped(
        { parentId, childId, level, sublevel, limit: SUCCESS_WINDOW_SIZE },
        { session },
      );

      progressionOutcome = computeProgression({ level, sublevel, recentRaw, recentNonSkipped });

      const updatedChild = await parentRepository.applyTextCompletionProgress(
        parentId,
        childId,
        {
          incrementJourneyProgress: result === "success",
          levelUpdate: progressionOutcome.changed
            ? { level: progressionOutcome.level, sublevel: progressionOutcome.sublevel }
            : null,
        },
        { session },
      );

      if (!updatedChild) {
        throw new Error(
          `completeText: no child ${childId} for parent ${parentId} (applyTextCompletionProgress)`,
        );
      }
    });
  } catch (error) {
    if (error.code !== DUPLICATE_KEY_ERROR_CODE) {
      throw error;
    }

    // Duplicate sessionId means this text was already finalized; recover from
    // the canonical TextResult outside the aborted transaction.
    const existingResult = await textResultRepository.findBySessionId(sessionId);

    if (!existingResult) {
      throw error;
    }

    return { result: existingResult.result, progressionOutcome: null, alreadyCompleted: true };
  } finally {
    await session.endSession();
  }

  return { result, progressionOutcome };
}

export { completeText };
