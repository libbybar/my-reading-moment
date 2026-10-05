import { FEATURE_TAGS, FEATURE_TAGGED_BANDS } from "../../src/data/mapperTemplates.js";

// A template that satisfies every integrity rule for its band; tests override only what they exercise.
function buildMapperTemplate({ id = "template", band = "A", ...overrides } = {}) {
  return {
    id,
    band,
    structure: "structure",
    questionKind: "explicit-detail",
    storyShape: "story shape",
    ...(FEATURE_TAGGED_BANDS.includes(band) ? { featureTag: FEATURE_TAGS.NONE } : {}),
    ...overrides,
  };
}

function buildTemplatesAtBand(band, count, overrides = {}) {
  return Array.from({ length: count }, (_, number) => buildMapperTemplate({ id: `${band}${number + 1}`, band, ...overrides }));
}

export { buildMapperTemplate, buildTemplatesAtBand };
