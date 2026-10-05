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

export { findByChild, saveSeed };
