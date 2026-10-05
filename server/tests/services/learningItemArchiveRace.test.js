// Archiving can land between a "child is active" check and the write that
// follows it. These tests hold the request at exactly that point.
import { jest } from "@jest/globals";

const realParentRepository = await import("../../src/repositories/parentRepository.js");
const hooks = { afterActiveCheckInTransaction: null, afterActiveCheckOutsideTransaction: null };

jest.unstable_mockModule("../../src/repositories/parentRepository.js", () => ({
  ...realParentRepository,
  findActiveChild: async (parentId, childId, options) => {
    const child = await realParentRepository.findActiveChild(parentId, childId, options);

    const hook = options?.session ? hooks.afterActiveCheckInTransaction : hooks.afterActiveCheckOutsideTransaction;

    await hook?.();

    return child;
  },
}));

const lifecycle = await import("../../src/services/learningItemLifecycle.js");
const { default: LearningAttempt } = await import("../../src/models/LearningAttempt.js");
const { default: ActiveLearningItem } = await import("../../src/models/ActiveLearningItem.js");
const testDb = await import("../support/testDb.js");
const { createAuthenticatedParentWithChild } = await import("../support/testAuth.js");

const NOW = new Date("2026-10-01T10:00:00Z");

describe("archiving a child while an item request is in flight", () => {
  let scope;

  beforeAll(async () => {
    process.env.JWT_SECRET = "test-secret";
    await testDb.connect();
  }, 20000);

  beforeEach(async () => {
    const { parentId, childId } = await createAuthenticatedParentWithChild({
      name: "גאיה",
      grammaticalGender: "female",
      learningProfile: { readingLevel: "beginner", interests: [] },
    });

    scope = { parentId, childId };
  });

  afterEach(async () => {
    hooks.afterActiveCheckInTransaction = null;
    hooks.afterActiveCheckOutsideTransaction = null;
    await testDb.clearDatabase();
  });

  afterAll(async () => {
    await testDb.disconnect();
  }, 20000);

  async function startClaimedItem() {
    const { snapshot: started } = await lifecycle.startItem({
      ...scope,
      missionId: "explicit-detail",
      band: "C",
      contentFingerprint: "fingerprint",
      variationSignature: "signature",
      item: {},
      now: NOW,
    });
    const { snapshot } = await lifecycle.claimItem({ ...scope, attemptId: started.attemptId, now: NOW });

    return snapshot;
  }

  test("an archive that lands after startItem's active check leaves no snapshot behind", async () => {
    hooks.afterActiveCheckOutsideTransaction = async () => {
      hooks.afterActiveCheckOutsideTransaction = null;
      await lifecycle.archiveChildAndDiscardItems(scope);
    };

    await expect(
      lifecycle.startItem({
        ...scope,
        missionId: "explicit-detail",
        band: "C",
        contentFingerprint: "fingerprint",
        variationSignature: "signature",
        item: {},
        now: NOW,
      }),
    ).rejects.toMatchObject({ reason: "child_unavailable" });

    expect(await ActiveLearningItem.countDocuments()).toBe(0);
  });

  test("an archive that commits after the active check makes the completion fail and write no attempt", async () => {
    const claimed = await startClaimedItem();
    let archiving;

    hooks.afterActiveCheckInTransaction = async () => {
      if (!archiving) {
        archiving = lifecycle.archiveChildAndDiscardItems(scope);
        await archiving;
      }
    };

    await expect(
      lifecycle.completeItem({
        ...scope,
        attemptId: claimed.attemptId,
        claimToken: claimed.claimToken,
        status: "completed",
        supportLevel: "independent",
        interactiveOutcome: "correct",
        expressiveState: "confirmed",
        now: NOW,
      }),
    ).rejects.toMatchObject({ reason: "child_unavailable" });

    expect(await LearningAttempt.countDocuments()).toBe(0);
    expect(await ActiveLearningItem.countDocuments()).toBe(0);
  });
});
