import LearningJourney from "../models/LearningJourney.js";

const DUPLICATE_KEY_ERROR_CODE = 11000;

async function findByChild({ parentId, childId }) {
  return LearningJourney.findOne({ parentId, childId });
}

function updateSeedBeforePlacement({ parentId, childId, startingSignal, seedBand }, { upsert }) {
  return LearningJourney.findOneAndUpdate(
    { parentId, childId, placementStatus: "not_started" },
    { $set: { startingSignal, seedBand } },
    { upsert, returnDocument: "after", runValidators: true },
  );
}

// The parent's estimate may change only before placement starts. The filter
// requires "not_started", so a journey in any other state misses the match and
// the upsert's insert is rejected by the unique index. A duplicate key also
// happens when a concurrent first save won the insert, so it only means
// "placement started" if the retry without upsert still finds nothing to update.
async function saveSeed(seed) {
  try {
    return { ok: true, journey: await updateSeedBeforePlacement(seed, { upsert: true }) };
  } catch (error) {
    if (error.code !== DUPLICATE_KEY_ERROR_CODE) {
      throw error;
    }

    const journey = await updateSeedBeforePlacement(seed, { upsert: false });

    return journey ? { ok: true, journey } : { ok: false, reason: "placement_started" };
  }
}

// Null when placement already started, which lets a racing start fall back to reading the journey.
async function startPlacement({ parentId, childId, practiceItemId }) {
  return LearningJourney.findOneAndUpdate(
    { parentId, childId, placementStatus: "not_started" },
    {
      $set: {
        placementStatus: "in_progress",
        "placement.currentItem": { itemId: practiceItemId, isPractice: true, instructionHelp: false },
      },
    },
    { returnDocument: "after" },
  );
}

function buildPlacementStepUpdate({ practiceCompleted, observation, nextItemId, anchorBand }) {
  const update = { $set: { "placement.currentItem": null } };

  if (practiceCompleted) {
    update.$set["placement.practiceCompleted"] = true;
  }

  if (observation) {
    update.$push = { "placement.observations": observation };
  }

  if (nextItemId) {
    update.$set["placement.currentItem"] = { itemId: nextItemId, isPractice: false, instructionHelp: false };
    update.$addToSet = { "placement.usedItemIds": nextItemId };
  }

  if (anchorBand) {
    update.$set.provisionalAnchorBand = anchorBand;
    update.$set.placementStatus = "complete";
  }

  return update;
}

// Compare-and-swap on the item being answered: a duplicate or stale submit
// matches nothing, so it can never be counted twice. Null means "not the current item".
async function applyPlacementStep({ parentId, childId, expectedItemId, step }) {
  return LearningJourney.findOneAndUpdate(
    { parentId, childId, placementStatus: "in_progress", "placement.currentItem.itemId": expectedItemId },
    buildPlacementStepUpdate(step),
    { returnDocument: "after", runValidators: true },
  );
}

async function markInstructionHelp({ parentId, childId, itemId }) {
  return LearningJourney.findOneAndUpdate(
    { parentId, childId, placementStatus: "in_progress", "placement.currentItem.itemId": itemId },
    { $set: { "placement.currentItem.instructionHelp": true } },
    { returnDocument: "after" },
  );
}

export { findByChild, saveSeed, startPlacement, applyPlacementStep, markInstructionHelp };
