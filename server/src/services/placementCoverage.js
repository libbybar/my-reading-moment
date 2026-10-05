import {
  STARTING_SIGNALS,
  STARTING_SIGNAL_BANDS,
  getAdjacentBand,
} from "../data/readabilityBands.js";
import { MAPPER_TEMPLATES, FEATURE_TAGS, FEATURE_TAGGED_BANDS } from "../data/mapperTemplates.js";

// After a skipped first item every scored item stays at the seed band, so two
// different structures keep four items from repeating one pattern.
// At seed E only one of those can be non-pronoun-dependent, so after a skipped first item three of
// the four items may repeat a structure; this rule does not guarantee variety.
const MIN_TEMPLATES_AT_SEED_BAND = 2;
const MIN_TEMPLATES_AT_PROBE_BAND = 1;

function listReachableBands(seedBand) {
  return [seedBand, getAdjacentBand(seedBand, -1), getAdjacentBand(seedBand, 1)].filter(Boolean);
}

function listTemplatesAtBand(templates, band) {
  return templates.filter((template) => template.band === band);
}

// At D to F a band needs one template that is not pronoun-dependent, or a
// placement could be forced to build its seed-band evidence on pronoun items alone.
function hasNonPronounDependentTemplate(bandTemplates) {
  return bandTemplates.some((template) => template.featureTag !== FEATURE_TAGS.PRONOUN_DEPENDENT);
}

function canServeBand(templates, band, minTemplates) {
  const bandTemplates = listTemplatesAtBand(templates, band);
  const hasEnoughTemplates = bandTemplates.length >= minTemplates;

  return hasEnoughTemplates && (!FEATURE_TAGGED_BANDS.includes(band) || hasNonPronounDependentTemplate(bandTemplates));
}

function canServePlacementFromSeed(templates, seedBand) {
  return listReachableBands(seedBand).every((band) =>
    canServeBand(templates, band, band === seedBand ? MIN_TEMPLATES_AT_SEED_BAND : MIN_TEMPLATES_AT_PROBE_BAND),
  );
}

// A parent may only choose a signal whose whole placement the catalog can serve (spec 24.2, decision 3).
function getAvailableStartingSignals(templates = MAPPER_TEMPLATES) {
  return STARTING_SIGNALS.filter((signal) => canServePlacementFromSeed(templates, STARTING_SIGNAL_BANDS[signal]));
}

export { getAvailableStartingSignals };
