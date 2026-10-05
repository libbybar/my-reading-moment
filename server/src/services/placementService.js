import * as parentRepository from "../repositories/parentRepository.js";
import * as learningJourneyRepository from "../repositories/learningJourneyRepository.js";
import MAPPER_ITEM_BANK from "../data/mapperItemBank.js";
import { getAdjacentBand } from "../data/readabilityBands.js";
import { MAPPER_SENTENCE_COUNT } from "./mapperItemValidation.js";
import { chooseNextItemBand, isPlacementComplete, decidePlacementBand } from "./mapperTransitions.js";

// Items 1 and 4 sit at the seed band and items 2 and 3 one band away.
const ITEMS_PER_PLACEMENT_BAND = 2;
const ITEMS_PER_PLACEMENT = 4;

class PlacementError extends Error {
  constructor(reason) {
    super(`Placement request rejected: ${reason}`);
    this.name = "PlacementError";
    this.reason = reason; // "child_not_found" | "estimate_missing" | "unavailable" | "invalid_input" | "no_active_placement"
  }
}

function findBankItem(bank, itemId) {
  return [bank.practiceItem, ...bank.items].find((item) => item?.itemId === itemId) ?? null;
}

function countItemsInBand(bank, band) {
  return bank.items.filter((item) => item.band === band).length;
}

// At the floor or the ceiling a probe has no neighbour to move to, so all four items can fall on the seed band.
function countItemsNeededInBand(seedBand, band) {
  const isMissingNeighbour = getAdjacentBand(seedBand, -1) === null || getAdjacentBand(seedBand, 1) === null;

  return band === seedBand && isMissingNeighbour ? ITEMS_PER_PLACEMENT : ITEMS_PER_PLACEMENT_BAND;
}

function hasEnoughItemsForPlacement(bank, seedBand) {
  const placementBands = [seedBand, getAdjacentBand(seedBand, 1), getAdjacentBand(seedBand, -1)].filter(Boolean);

  return (
    Boolean(bank.practiceItem) &&
    placementBands.every((band) => countItemsInBand(bank, band) >= countItemsNeededInBand(seedBand, band))
  );
}

function selectUnusedItem(bank, band, usedItemIds) {
  const item = bank.items.find((candidate) => candidate.band === band && !usedItemIds.includes(candidate.itemId));

  if (!item) {
    throw new PlacementError("unavailable");
  }

  return item;
}

// Never the band, the answer or the framing position: the child must not be able to read the key.
function toChildItem(bankItem, { isPractice }) {
  return { itemId: bankItem.itemId, prompt: bankItem.prompt, sentences: bankItem.sentences, isPractice };
}

function toPlacementView(journey, bank) {
  if (journey.placementStatus === "complete") {
    return { status: "complete", item: null };
  }

  const { currentItem } = journey.placement;
  const bankItem = findBankItem(bank, currentItem.itemId);

  if (!bankItem) {
    throw new PlacementError("unavailable");
  }

  return { status: "in_progress", item: toChildItem(bankItem, { isPractice: currentItem.isPractice }) };
}

async function loadJourneyForActiveChild({ parentId, childId }) {
  if (!(await parentRepository.findActiveChild(parentId, childId))) {
    throw new PlacementError("child_not_found");
  }

  const journey = await learningJourneyRepository.findByChild({ parentId, childId });

  if (!journey) {
    throw new PlacementError("estimate_missing");
  }

  return journey;
}

function isCurrentItem(journey, itemId) {
  return journey.placementStatus === "in_progress" && journey.placement.currentItem?.itemId === itemId;
}

async function startOrResumePlacement({ parentId, childId }, bank = MAPPER_ITEM_BANK) {
  const journey = await loadJourneyForActiveChild({ parentId, childId });

  if (journey.placementStatus !== "not_started") {
    return toPlacementView(journey, bank);
  }

  if (!hasEnoughItemsForPlacement(bank, journey.seedBand)) {
    throw new PlacementError("unavailable");
  }

  const started = await learningJourneyRepository.startPlacement({
    parentId,
    childId,
    practiceItemId: bank.practiceItem.itemId,
  });

  return toPlacementView(started ?? (await learningJourneyRepository.findByChild({ parentId, childId })), bank);
}

function buildPracticeStep(journey, bank) {
  const firstScoredItem = selectUnusedItem(bank, journey.seedBand, journey.placement.usedItemIds);

  return { practiceCompleted: true, nextItemId: firstScoredItem.itemId };
}

function buildScoredStep(journey, bank, observation) {
  const { seedBand } = journey;
  const observations = [...journey.placement.observations, observation];

  if (isPlacementComplete(observations)) {
    return { observation, anchorBand: decidePlacementBand({ seedBand, observations }) };
  }

  const nextBand = chooseNextItemBand({ seedBand, observations });

  return { observation, nextItemId: selectUnusedItem(bank, nextBand, journey.placement.usedItemIds).itemId };
}

// A request for anything but the current item is a replay or a stale tab: it
// changes nothing and returns where the child actually is.
async function advancePlacement({ parentId, childId, itemId }, bank, resolveOutcome) {
  const journey = await loadJourneyForActiveChild({ parentId, childId });

  if (journey.placementStatus === "not_started") {
    throw new PlacementError("no_active_placement");
  }

  if (!isCurrentItem(journey, itemId)) {
    return toPlacementView(journey, bank);
  }

  const { currentItem } = journey.placement;
  const bankItem = findBankItem(bank, itemId);

  if (!bankItem) {
    throw new PlacementError("unavailable");
  }

  const step = currentItem.isPractice
    ? buildPracticeStep(journey, bank)
    : buildScoredStep(journey, bank, { band: bankItem.band, outcome: resolveOutcome(bankItem, currentItem) });

  const updated = await learningJourneyRepository.applyPlacementStep({
    parentId,
    childId,
    expectedItemId: itemId,
    step,
  });

  return toPlacementView(updated ?? (await learningJourneyRepository.findByChild({ parentId, childId })), bank);
}

function isSentenceIndex(value) {
  return Number.isInteger(value) && value >= 0 && value < MAPPER_SENTENCE_COUNT;
}

function resolveAnswerOutcome(selectedSentenceIndex) {
  return (bankItem, currentItem) => {
    if (currentItem.instructionHelp) {
      return "dropped";
    }

    return selectedSentenceIndex === bankItem.correctSentenceIndex ? "correct" : "incorrect";
  };
}

async function submitPlacementAnswer({ parentId, childId, itemId, selectedSentenceIndex }, bank = MAPPER_ITEM_BANK) {
  if (!isSentenceIndex(selectedSentenceIndex)) {
    throw new PlacementError("invalid_input");
  }

  return advancePlacement({ parentId, childId, itemId }, bank, resolveAnswerOutcome(selectedSentenceIndex));
}

async function skipPlacementItem({ parentId, childId, itemId }, bank = MAPPER_ITEM_BANK) {
  return advancePlacement({ parentId, childId, itemId }, bank, () => "skipped");
}

async function requestInstructionHelp({ parentId, childId, itemId }, bank = MAPPER_ITEM_BANK) {
  const journey = await loadJourneyForActiveChild({ parentId, childId });

  if (!isCurrentItem(journey, itemId)) {
    return toPlacementView(journey, bank);
  }

  const updated = await learningJourneyRepository.markInstructionHelp({ parentId, childId, itemId });

  return toPlacementView(updated ?? (await learningJourneyRepository.findByChild({ parentId, childId })), bank);
}

export {
  startOrResumePlacement,
  submitPlacementAnswer,
  skipPlacementItem,
  requestInstructionHelp,
  PlacementError,
};
