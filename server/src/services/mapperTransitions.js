import { getAdjacentBand } from "../data/readabilityBands.js";
import { FEATURE_TAGS } from "../data/mapperTemplates.js";

const SCORED_ITEM_COUNT = 4;
const SCORED_OUTCOMES = ["correct", "incorrect"];

// Items 2 and 3 probe one band away from the seed, in the direction item 1 suggests.
const FIRST_PROBE_POSITION = 1;
const LAST_PROBE_POSITION = 2;

function resolveProbeBand(seedBand, firstOutcome) {
  const probeOffsetByOutcome = { correct: 1, incorrect: -1 };
  const probeOffset = probeOffsetByOutcome[firstOutcome] ?? 0;

  return getAdjacentBand(seedBand, probeOffset) ?? seedBand;
}

function isProbePosition(position) {
  return position >= FIRST_PROBE_POSITION && position <= LAST_PROBE_POSITION;
}

function chooseNextItemBand({ seedBand, observations }) {
  const position = observations.length;

  return isProbePosition(position) ? resolveProbeBand(seedBand, observations[0].outcome) : seedBand;
}

function isPlacementComplete(observations) {
  return observations.length >= SCORED_ITEM_COUNT;
}

// A skipped, interrupted or instruction-assisted item is missing evidence, never a wrong answer.
function hasAllScoredEvidence(observations) {
  return isPlacementComplete(observations) && observations.every(({ outcome }) => SCORED_OUTCOMES.includes(outcome));
}

function isPronounDependent(observation) {
  return observation.featureTag === FEATURE_TAGS.PRONOUN_DEPENDENT;
}

// Spec 25.8: a wrong pronoun-dependent seed item is not evidence that the band's text is too heavy.
function isDownwardMoveAvailable(seedObservations) {
  return !seedObservations.some(isPronounDependent);
}

// Moves at most one band, and only when all four observations agree. Anything else keeps the parent's estimate.
function decidePlacementBand({ seedBand, observations }) {
  if (!hasAllScoredEvidence(observations)) {
    return seedBand;
  }

  const [first, firstProbe, secondProbe, last] = observations.map(({ outcome }) => outcome);
  const seedObservations = [observations[0], observations[3]];
  const atSeed = [first, last];
  const atProbe = [firstProbe, secondProbe];
  const allMatch = (outcomes, expected) => outcomes.every((outcome) => outcome === expected);

  if (allMatch(atSeed, "correct") && allMatch(atProbe, "correct")) {
    return getAdjacentBand(seedBand, 1) ?? seedBand;
  }

  if (allMatch(atSeed, "incorrect") && allMatch(atProbe, "correct") && isDownwardMoveAvailable(seedObservations)) {
    return getAdjacentBand(seedBand, -1) ?? seedBand;
  }

  return seedBand;
}

export { SCORED_ITEM_COUNT, chooseNextItemBand, isPlacementComplete, decidePlacementBand };
