import {
  ACTIVITY_TYPES,
  STORY_DETECTIVES_MISSIONS,
  getMissionBlueprint,
} from "../../src/data/learningMissions.js";

const EXPECTED_MISSION_ORDER = [
  "explicit-detail",
  "event-sequence",
  "cause-and-effect",
  "word-from-context",
  "simple-inference",
];

// Fields that would turn a blueprint into reusable content.
const FORBIDDEN_CONTENT_FIELDS = ["question", "prompt", "answer", "passage", "text", "options"];

describe("story detectives mission catalog", () => {
  test("lists the five skills in their teaching order", () => {
    expect(STORY_DETECTIVES_MISSIONS.map((mission) => mission.missionId)).toEqual(
      EXPECTED_MISSION_ORDER,
    );
  });

  test("gives every mission the fields a generator and a parent explanation need", () => {
    STORY_DETECTIVES_MISSIONS.forEach((mission) => {
      expect(mission.skillFocus.trim().length).toBeGreaterThan(0);
      expect(mission.parentExplanation.trim().length).toBeGreaterThan(0);
      expect(mission.generationConstraints.length).toBeGreaterThan(0);
      expect(mission.readabilityConstraints.minSentences).toBeGreaterThan(0);
    });
  });

  test("supports only known activity types, and at least two so an item can carry two activities", () => {
    const knownTypes = Object.values(ACTIVITY_TYPES);

    STORY_DETECTIVES_MISSIONS.forEach((mission) => {
      expect(mission.activityTypes.length).toBeGreaterThanOrEqual(2);
      mission.activityTypes.forEach((type) => expect(knownTypes).toContain(type));
    });
  });

  test("requires two evidence quotes for inference and at least one for every other mission", () => {
    STORY_DETECTIVES_MISSIONS.forEach((mission) => {
      const expectedMinimum = mission.missionId === "simple-inference" ? 2 : 1;

      expect(mission.minEvidenceQuotesPerActivity).toBeGreaterThanOrEqual(expectedMinimum);
    });
  });

  test("stores no reusable child-facing question, passage or answer", () => {
    STORY_DETECTIVES_MISSIONS.forEach((mission) => {
      FORBIDDEN_CONTENT_FIELDS.forEach((field) => expect(mission).not.toHaveProperty(field));
    });
  });
});

describe("getMissionBlueprint", () => {
  test("returns the blueprint matching the mission id", () => {
    expect(getMissionBlueprint("cause-and-effect").missionId).toBe("cause-and-effect");
  });

  test.each([undefined, "", "unknown-mission"])("throws for %p", (missionId) => {
    expect(() => getMissionBlueprint(missionId)).toThrow();
  });
});
