import mockLearningItemsByMissionId from "../../src/data/mockLearningItems.js";
import { getMissionBlueprint } from "../../src/data/learningMissions.js";
import {
  parseLearningItemRequest,
  buildValidatedLearningItem,
} from "../../src/services/learningItemContract.js";

const MISSION_IDS = Object.keys(mockLearningItemsByMissionId);

function buildRawItem({ missionId = "explicit-detail", index = 0, mutate = () => {} } = {}) {
  const rawItem = structuredClone(mockLearningItemsByMissionId[missionId][index]);
  mutate(rawItem);

  return rawItem;
}

function validate(rawItem, { missionId = "explicit-detail", recentItems = [] } = {}) {
  return buildValidatedLearningItem(rawItem, {
    blueprint: getMissionBlueprint(missionId),
    recentItems,
  });
}

const [multipleChoice, shortAnswer] = [0, 1];

describe("buildValidatedLearningItem", () => {
  describe("accepted items", () => {
    test.each(MISSION_IDS)("accepts every %s fixture and assigns server-owned fields", (missionId) => {
      mockLearningItemsByMissionId[missionId].forEach((_, index) => {
        const item = validate(buildRawItem({ missionId, index }), { missionId });

        expect(item.missionId).toBe(missionId);
        expect(item.itemId).toMatch(/^[0-9a-f-]{36}$/);
        expect(item.contentFingerprint).toMatch(/^[0-9a-f]{64}$/);
        expect(item.activities).toHaveLength(2);
      });
    });

    test("ignores an itemId, fingerprint or extra field supplied by the model", () => {
      const item = validate(
        buildRawItem({
          mutate: (raw) => {
            raw.itemId = "model-chosen-id";
            raw.contentFingerprint = "model-chosen-fingerprint";
            raw.secretField = "leak";
            raw.activities[0].expectedMeaning = "leak";
          },
        }),
      );

      expect(item.itemId).not.toBe("model-chosen-id");
      expect(item.contentFingerprint).not.toBe("model-chosen-fingerprint");
      expect(item).not.toHaveProperty("secretField");
      expect(item.activities[0]).not.toHaveProperty("expectedMeaning");
    });

    test("gives the same content a new itemId but the same fingerprint", () => {
      const first = validate(buildRawItem());
      const second = validate(buildRawItem());

      expect(second.itemId).not.toBe(first.itemId);
      expect(second.contentFingerprint).toBe(first.contentFingerprint);
    });

    test("gives different stories different fingerprints", () => {
      const first = validate(buildRawItem({ index: 0 }));
      const second = validate(buildRawItem({ index: 1 }));

      expect(second.contentFingerprint).not.toBe(first.contentFingerprint);
    });

    test("fingerprints a passage identically with or without nikud and punctuation", () => {
      const plain = validate(buildRawItem());
      const decorated = validate(
        buildRawItem({ mutate: (raw) => (raw.text = "נוֹעָה הָלְכָה לַגַּן! הִיא לָקְחָה כַּדּוּר אָדוֹם. הַכֶּלֶב שֶׁלָּהּ רָץ אַחֲרֶיהָ.") }),
      );

      expect(decorated.contentFingerprint).toBe(plain.contentFingerprint);
    });

    test("accepts an evidence quote that differs from the passage only in nikud and punctuation", () => {
      const item = validate(
        buildRawItem({
          mutate: (raw) => (raw.activities[multipleChoice].evidenceQuote = "הִיא, לָקְחָה כדור אדום!"),
        }),
      );

      expect(item.activities[multipleChoice].evidenceQuote).toContain("לָקְחָה");
    });

    test("accepts a hint that contains an answer only as part of a longer word", () => {
      const item = validate(
        buildRawItem({ mutate: (raw) => (raw.strategyHint = "כדאי לחפש צבעים בקטע, כמו אדומים או כחולים.") }),
      );

      expect(item.strategyHint).toContain("אדומים");
    });
  });

  describe("rejected items", () => {
    const malformedItems = {
      "a missing title": (raw) => delete raw.title,
      "a blank passage text": (raw) => (raw.text = "  "),
      "a missing strategy hint": (raw) => delete raw.strategyHint,
      "a missing variation signature": (raw) => delete raw.variationSignature,
      "a multi-line variation signature": (raw) => (raw.variationSignature = "דמות: נועה\nמקום: גן"),
      "an over-long variation signature": (raw) => (raw.variationSignature = "א".repeat(121)),
      "activities that are not an array": (raw) => (raw.activities = "none"),
      "a single activity": (raw) => raw.activities.pop(),
      "three activities": (raw) => raw.activities.push(structuredClone(raw.activities[0])),
      "an unsupported activity type": (raw) => (raw.activities[shortAnswer].type = "drag-and-drop"),
      "two activities of the same type": (raw) =>
        (raw.activities[shortAnswer] = {
          ...structuredClone(raw.activities[multipleChoice]),
          prompt: "איזה כדור נועה לקחה, שוב?",
        }),
      "a blank activity prompt": (raw) => (raw.activities[multipleChoice].prompt = ""),
      "a missing canonical answer": (raw) => delete raw.activities[shortAnswer].canonicalAnswer,
      "a missing evidence quote": (raw) => delete raw.activities[multipleChoice].evidenceQuote,
      "an evidence quote absent from the passage": (raw) =>
        (raw.activities[shortAnswer].evidenceQuote = "הכלב אכל את הכדור"),
      "duplicate multiple-choice options": (raw) =>
        (raw.activities[multipleChoice].options = ["אדום", "אדום", "כחול"]),
      "multiple-choice options that differ only in nikud": (raw) =>
        (raw.activities[multipleChoice].options = ["אדום", "אָדוֹם", "כחול"]),
      "too few multiple-choice options": (raw) => (raw.activities[multipleChoice].options = ["אדום", "כחול"]),
      "too many multiple-choice options": (raw) =>
        (raw.activities[multipleChoice].options = ["אדום", "כחול", "ירוק", "צהוב", "לבן"]),
      "a canonical answer that is not one of the options": (raw) =>
        (raw.activities[multipleChoice].canonicalAnswer = "סגול"),
      "options on a short-answer activity": (raw) => (raw.activities[shortAnswer].options = ["הכלב שלה"]),
      "a hint that repeats a canonical answer": (raw) =>
        (raw.strategyHint = "כדאי לחפש את הצבע אדום בקטע."),
      "a hint that repeats an evidence quote": (raw) =>
        (raw.strategyHint = "כדאי לקרוא שוב: הכלב שלה רץ אחריה."),
    };

    test.each(Object.entries(malformedItems))("rejects %s", (_name, mutate) => {
      expect(() => validate(buildRawItem({ mutate }))).toThrow();
    });

    test.each([null, undefined, "text"])("rejects a non-object item: %p", (rawItem) => {
      expect(() => validate(rawItem)).toThrow();
    });

    test("rejects a passage shorter than the mission's minimum sentence count", () => {
      const rawItem = buildRawItem({
        missionId: "event-sequence",
        mutate: (raw) => (raw.text = "דנה התעוררה בבוקר. אחרי זה היא אכלה ארוחת בוקר."),
      });

      expect(() => validate(rawItem, { missionId: "event-sequence" })).toThrow();
    });

    test("rejects an activity type the mission's blueprint does not support", () => {
      const restrictedBlueprint = {
        ...getMissionBlueprint("explicit-detail"),
        activityTypes: ["multiple-choice"],
      };

      expect(() =>
        buildValidatedLearningItem(buildRawItem(), { blueprint: restrictedBlueprint, recentItems: [] }),
      ).toThrow();
    });
  });

  describe("repetition", () => {
    test("rejects an item whose fingerprint matches a recent item, even under a new signature", () => {
      const previous = validate(buildRawItem());
      const repeatedContent = buildRawItem({ mutate: (raw) => (raw.variationSignature = "חתימה חדשה לגמרי") });

      expect(() =>
        validate(repeatedContent, {
          recentItems: [{ variationSignature: "חתימה ישנה", contentFingerprint: previous.contentFingerprint }],
        }),
      ).toThrow();
    });

    test("rejects an item whose signature matches a recent one, ignoring punctuation and nikud", () => {
      const previous = validate(buildRawItem({ index: 0 }));
      const sameSignatureNewStory = buildRawItem({
        index: 1,
        mutate: (raw) => (raw.variationSignature = previous.variationSignature.replace(":", "!")),
      });

      expect(() =>
        validate(sameSignatureNewStory, {
          recentItems: [
            { variationSignature: previous.variationSignature, contentFingerprint: "unrelated-fingerprint" },
          ],
        }),
      ).toThrow();
    });

    test("accepts a different story when only another one is recent", () => {
      const previous = validate(buildRawItem({ index: 0 }));

      const next = validate(buildRawItem({ index: 1 }), {
        recentItems: [
          { variationSignature: previous.variationSignature, contentFingerprint: previous.contentFingerprint },
        ],
      });

      expect(next.contentFingerprint).not.toBe(previous.contentFingerprint);
    });
  });
});

describe("parseLearningItemRequest", () => {
  const validRequest = {
    missionId: "cause-and-effect",
    readabilityBand: { level: 2, sublevel: 3 },
    interest: "space",
    recentItems: [{ variationSignature: "דמות: נועה", contentFingerprint: "abc" }],
  };

  test("resolves the blueprint from the server-owned catalog", () => {
    const parsed = parseLearningItemRequest(validRequest);

    expect(parsed.blueprint).toBe(getMissionBlueprint("cause-and-effect"));
    expect(parsed.interest).toBe("space");
  });

  test("defaults to no interest and no recent items", () => {
    const parsed = parseLearningItemRequest({
      missionId: "cause-and-effect",
      readabilityBand: { level: 1, sublevel: 1 },
    });

    expect(parsed.interest).toBeNull();
    expect(parsed.recentItems).toEqual([]);
  });

  test("keeps only the known fields of the band and of each recent item", () => {
    const parsed = parseLearningItemRequest({
      ...validRequest,
      readabilityBand: { level: 2, sublevel: 3, childName: "נועה" },
      recentItems: [{ variationSignature: "דמות: נועה", contentFingerprint: "abc", childAnswer: "טקסט" }],
    });

    expect(parsed.readabilityBand).toEqual({ level: 2, sublevel: 3 });
    expect(parsed.recentItems[0]).toEqual({ variationSignature: "דמות: נועה", contentFingerprint: "abc" });
  });

  const invalidRequests = {
    "an unknown mission": { ...validRequest, missionId: "not-a-mission" },
    "a missing mission": { ...validRequest, missionId: undefined },
    "a missing band": { ...validRequest, readabilityBand: undefined },
    "an out-of-range level": { ...validRequest, readabilityBand: { level: 5, sublevel: 1 } },
    "a non-integer sublevel": { ...validRequest, readabilityBand: { level: 1, sublevel: 1.5 } },
    "an interest outside the allow-list": { ...validRequest, interest: "free text from a child" },
    "recent items that are not an array": { ...validRequest, recentItems: "none" },
    "a recent item without a fingerprint": {
      ...validRequest,
      recentItems: [{ variationSignature: "דמות: נועה" }],
    },
  };

  test.each(Object.entries(invalidRequests))("rejects %s", (_name, request) => {
    expect(() => parseLearningItemRequest(request)).toThrow();
  });
});
