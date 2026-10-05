import mongoose from "mongoose";

import * as lifecycle from "../../src/services/learningItemLifecycle.js";
import * as parentRepository from "../../src/repositories/parentRepository.js";
import ActiveLearningItem from "../../src/models/ActiveLearningItem.js";
import LearningAttempt from "../../src/models/LearningAttempt.js";
import * as testDb from "../support/testDb.js";
import { createAuthenticatedParentWithChild } from "../support/testAuth.js";

const T0 = new Date("2026-10-01T10:00:00Z");
const MINUTE = 60 * 1000;

function minutesAfter(date, minutes) {
  return new Date(date.getTime() + minutes * MINUTE);
}

const childFields = {
  name: "גאיה",
  grammaticalGender: "female",
  learningProfile: { readingLevel: "beginner", interests: [] },
};

function itemFields(overrides = {}) {
  return {
    missionId: "explicit-detail",
    band: "C",
    contentFingerprint: "fingerprint-1",
    variationSignature: "signature-1",
    item: { sentences: ["a", "b", "c", "d"] },
    now: T0,
    ...overrides,
  };
}

describe("learningItemLifecycle", () => {
  let owner;

  beforeAll(async () => {
    process.env.JWT_SECRET = "test-secret";
    await testDb.connect();
  }, 20000);

  beforeEach(async () => {
    owner = await createAuthenticatedParentWithChild(childFields);
  });

  afterEach(async () => {
    await testDb.clearDatabase();
  });

  afterAll(async () => {
    await testDb.disconnect();
  }, 20000);

  const scope = () => ({ parentId: owner.parentId, childId: owner.childId });

  async function startAndClaim(overrides = {}) {
    const { snapshot: started } = await lifecycle.startItem({ ...scope(), ...itemFields(overrides) });
    const { snapshot } = await lifecycle.claimItem({ ...scope(), attemptId: started.attemptId, now: T0 });

    return { snapshot };
  }

  const completion = ({ attemptId, claimToken }, overrides = {}) => ({
    ...scope(),
    attemptId,
    claimToken,
    status: "completed",
    supportLevel: "independent",
    interactiveOutcome: "correct",
    expressiveState: "confirmed",
    now: minutesAfter(T0, 5),
    ...overrides,
  });

  describe("startItem", () => {
    test("stores a new snapshot for the child", async () => {
      const { resumed, snapshot } = await lifecycle.startItem({ ...scope(), ...itemFields() });

      expect(resumed).toBe(false);
      expect(snapshot).toMatchObject({ missionId: "explicit-detail", band: "C", supportLevel: "independent", state: "active" });
      expect(await ActiveLearningItem.countDocuments()).toBe(1);
    });

    test("resumes the same item within the resume window instead of issuing a new one", async () => {
      const first = await lifecycle.startItem({ ...scope(), ...itemFields() });

      const second = await lifecycle.startItem({
        ...scope(),
        ...itemFields({ contentFingerprint: "other", now: minutesAfter(T0, 60) }),
      });

      expect(second.resumed).toBe(true);
      expect(second.snapshot.attemptId).toBe(first.snapshot.attemptId);
      expect(second.snapshot.contentFingerprint).toBe("fingerprint-1");
      expect(await ActiveLearningItem.countDocuments()).toBe(1);
    });

    test("turns an item idle past the window into one interrupted attempt and issues a new item", async () => {
      const first = await lifecycle.startItem({ ...scope(), ...itemFields() });
      const returnTime = minutesAfter(T0, 24 * 60 + 1);

      const second = await lifecycle.startItem({
        ...scope(),
        ...itemFields({ contentFingerprint: "fingerprint-2", now: returnTime }),
      });

      expect(second.resumed).toBe(false);
      expect(second.snapshot.attemptId).not.toBe(first.snapshot.attemptId);

      const attempts = await LearningAttempt.find();

      expect(attempts).toHaveLength(1);
      expect(attempts[0]).toMatchObject({
        attemptId: first.snapshot.attemptId,
        status: "interrupted",
        contentFingerprint: "fingerprint-1",
        variationSignature: "signature-1",
        interactiveOutcome: "not_attempted",
        endedAt: returnTime,
      });
      expect(await ActiveLearningItem.countDocuments()).toBe(1);
    });

    test("resuming counts as activity, so a child who returns again soon is not interrupted", async () => {
      await lifecycle.startItem({ ...scope(), ...itemFields() });
      const almostExpired = minutesAfter(T0, 24 * 60 - 1);
      await lifecycle.startItem({ ...scope(), ...itemFields({ now: almostExpired }) });

      const { resumed } = await lifecycle.startItem({ ...scope(), ...itemFields({ now: minutesAfter(almostExpired, 2) }) });

      expect(resumed).toBe(true);
      expect(await LearningAttempt.countDocuments()).toBe(0);
    });

    test("an item just inside the window is still resumed", async () => {
      await lifecycle.startItem({ ...scope(), ...itemFields() });

      const { resumed } = await lifecycle.startItem({
        ...scope(),
        ...itemFields({ now: minutesAfter(T0, 24 * 60) }),
      });

      expect(resumed).toBe(true);
      expect(await LearningAttempt.countDocuments()).toBe(0);
    });

    test("two concurrent starts leave exactly one snapshot and give both the same item", async () => {
      const [a, b] = await Promise.all([
        lifecycle.startItem({ ...scope(), ...itemFields() }),
        lifecycle.startItem({ ...scope(), ...itemFields({ contentFingerprint: "fingerprint-2" }) }),
      ]);

      expect(a.snapshot.attemptId).toBe(b.snapshot.attemptId);
      expect(await ActiveLearningItem.countDocuments()).toBe(1);
    });

    test("another child of the same parent gets an independent item", async () => {
      const parentWithSibling = await parentRepository.addChild(owner.parentId, childFields);
      const siblingId = parentWithSibling.children[1]._id;

      await lifecycle.startItem({ ...scope(), ...itemFields() });
      const sibling = await lifecycle.startItem({ parentId: owner.parentId, childId: siblingId, ...itemFields() });

      expect(sibling.resumed).toBe(false);
      expect(await ActiveLearningItem.countDocuments()).toBe(2);
    });

    test("rejects a child belonging to another parent without writing anything", async () => {
      const stranger = await createAuthenticatedParentWithChild(childFields);

      await expect(
        lifecycle.startItem({ parentId: stranger.parentId, childId: owner.childId, ...itemFields() }),
      ).rejects.toMatchObject({ reason: "child_unavailable" });
      expect(await ActiveLearningItem.countDocuments()).toBe(0);
    });

    test("rejects an archived child", async () => {
      await parentRepository.archiveChild(owner.parentId, owner.childId);

      await expect(lifecycle.startItem({ ...scope(), ...itemFields() })).rejects.toMatchObject({
        reason: "child_unavailable",
      });
    });
  });

  describe("claimItem / releaseItem", () => {
    test("only one of two concurrent claims wins", async () => {
      const { snapshot } = await lifecycle.startItem({ ...scope(), ...itemFields() });
      const claimArgs = { ...scope(), attemptId: snapshot.attemptId, now: T0 };

      const results = await Promise.all([lifecycle.claimItem(claimArgs), lifecycle.claimItem(claimArgs)]);

      expect(results.filter((result) => result.ok)).toHaveLength(1);
      expect(results.find((result) => !result.ok)).toEqual({ ok: false, reason: "conflict" });
    });

    test("a released item can be claimed again", async () => {
      const { snapshot } = await startAndClaim();

      await lifecycle.releaseItem({ ...scope(), attemptId: snapshot.attemptId, claimToken: snapshot.claimToken });
      const again = await lifecycle.claimItem({ ...scope(), attemptId: snapshot.attemptId, now: T0 });

      expect(again.ok).toBe(true);
    });

    describe("a request that outlived its lease", () => {
      async function claimExpiredAndReclaim() {
        const { snapshot: staleClaim } = await startAndClaim();
        const { snapshot: freshClaim } = await lifecycle.claimItem({
          ...scope(),
          attemptId: staleClaim.attemptId,
          now: new Date(T0.getTime() + lifecycle.CLAIM_LEASE_MS),
        });

        return { staleClaim, freshClaim };
      }

      test("cannot release the claim that replaced it", async () => {
        const { staleClaim, freshClaim } = await claimExpiredAndReclaim();

        await lifecycle.releaseItem({ ...scope(), attemptId: staleClaim.attemptId, claimToken: staleClaim.claimToken });

        const stored = await ActiveLearningItem.findOne();

        expect(stored.state).toBe("claimed");
        expect(stored.claimToken).toBe(freshClaim.claimToken);
      });

      test("cannot complete the item, which stays open for the current claim", async () => {
        const { staleClaim, freshClaim } = await claimExpiredAndReclaim();

        await expect(lifecycle.completeItem(completion(staleClaim))).rejects.toMatchObject({ reason: "conflict" });
        expect(await LearningAttempt.countDocuments()).toBe(0);

        const { alreadyCompleted } = await lifecycle.completeItem(completion(freshClaim));

        expect(alreadyCompleted).toBe(false);
      });
    });

    test("completing without a claim token is refused even while the item is claimed", async () => {
      const { snapshot } = await startAndClaim();

      await expect(lifecycle.completeItem(completion({ attemptId: snapshot.attemptId }))).rejects.toMatchObject({
        reason: "conflict",
      });
      expect(await LearningAttempt.countDocuments()).toBe(0);
    });

    test("a claim older than the lease no longer blocks, so a crashed request cannot lock the child out", async () => {
      const { snapshot } = await startAndClaim();

      const early = await lifecycle.claimItem({
        ...scope(),
        attemptId: snapshot.attemptId,
        now: new Date(T0.getTime() + lifecycle.CLAIM_LEASE_MS - 1),
      });
      const afterLease = await lifecycle.claimItem({
        ...scope(),
        attemptId: snapshot.attemptId,
        now: new Date(T0.getTime() + lifecycle.CLAIM_LEASE_MS),
      });

      expect(early).toEqual({ ok: false, reason: "conflict" });
      expect(afterLease.ok).toBe(true);
    });

    test("a missing attempt and another child's attempt are both not_found", async () => {
      const { snapshot } = await lifecycle.startItem({ ...scope(), ...itemFields() });
      const stranger = await createAuthenticatedParentWithChild(childFields);

      const missing = await lifecycle.claimItem({ ...scope(), attemptId: "no-such-attempt", now: T0 });
      const foreign = await lifecycle.claimItem({
        parentId: stranger.parentId,
        childId: stranger.childId,
        attemptId: snapshot.attemptId,
        now: T0,
      });

      expect(missing).toEqual({ ok: false, reason: "not_found" });
      expect(foreign).toEqual(missing);
    });

    test("an archived child cannot claim", async () => {
      const { snapshot } = await lifecycle.startItem({ ...scope(), ...itemFields() });
      await parentRepository.archiveChild(owner.parentId, owner.childId);

      const claim = await lifecycle.claimItem({ ...scope(), attemptId: snapshot.attemptId, now: T0 });

      expect(claim).toEqual({ ok: false, reason: "not_found" });
    });
  });

  describe("completeItem", () => {
    test("deletes the snapshot and writes one attempt carrying the snapshot's own metadata", async () => {
      const { snapshot } = await startAndClaim();

      const { attempt, alreadyCompleted } = await lifecycle.completeItem(completion(snapshot));

      expect(alreadyCompleted).toBe(false);
      expect(attempt).toMatchObject({
        attemptId: snapshot.attemptId,
        missionId: "explicit-detail",
        band: "C",
        contentFingerprint: "fingerprint-1",
        variationSignature: "signature-1",
        status: "completed",
        supportLevel: "independent",
        interactiveOutcome: "correct",
        startedAt: T0,
      });
      expect(await ActiveLearningItem.countDocuments()).toBe(0);
    });

    test("replaying a terminal request writes one canonical attempt and ignores the replay's payload", async () => {
      const { snapshot } = await startAndClaim();
      await lifecycle.completeItem(completion(snapshot));

      const replay = await lifecycle.completeItem(
        completion(snapshot, { status: "skipped", supportLevel: "guided", interactiveOutcome: "incorrect" }),
      );

      expect(replay.alreadyCompleted).toBe(true);
      expect(replay.attempt).toMatchObject({ status: "completed", supportLevel: "independent" });
      expect(await LearningAttempt.countDocuments()).toBe(1);
    });

    test("two concurrent completions produce a single attempt", async () => {
      const { snapshot } = await startAndClaim();

      const results = await Promise.all([
        lifecycle.completeItem(completion(snapshot)),
        lifecycle.completeItem(completion(snapshot)),
      ]);

      expect(await LearningAttempt.countDocuments()).toBe(1);
      expect(results.filter((result) => !result.alreadyCompleted)).toHaveLength(1);
    });

    test("an item that was never claimed cannot be completed", async () => {
      const { snapshot } = await lifecycle.startItem({ ...scope(), ...itemFields() });

      await expect(lifecycle.completeItem(completion(snapshot))).rejects.toMatchObject({
        reason: "conflict",
      });
      expect(await LearningAttempt.countDocuments()).toBe(0);
      expect(await ActiveLearningItem.countDocuments()).toBe(1);
    });

    test("an archived child cannot complete, and nothing is written", async () => {
      const { snapshot } = await startAndClaim();
      await parentRepository.archiveChild(owner.parentId, owner.childId);

      await expect(lifecycle.completeItem(completion(snapshot))).rejects.toMatchObject({
        reason: "child_unavailable",
      });
      expect(await LearningAttempt.countDocuments()).toBe(0);
    });

    test("another parent cannot complete this child's item", async () => {
      const { snapshot } = await startAndClaim();
      const stranger = await createAuthenticatedParentWithChild(childFields);

      await expect(
        lifecycle.completeItem({ ...completion(snapshot), parentId: stranger.parentId, childId: stranger.childId }),
      ).rejects.toMatchObject({ reason: "not_found" });
      expect(await LearningAttempt.countDocuments()).toBe(0);
      expect(await ActiveLearningItem.countDocuments()).toBe(1);
    });

    test("an invalid outcome rolls back and leaves the claimed snapshot in place", async () => {
      const { snapshot } = await startAndClaim();

      await expect(
        lifecycle.completeItem(completion(snapshot, { interactiveOutcome: "maybe" })),
      ).rejects.toThrow();

      expect(await LearningAttempt.countDocuments()).toBe(0);
      expect(await ActiveLearningItem.countDocuments()).toBe(1);
    });

    test("no stored document carries a raw answer field", async () => {
      const { snapshot } = await startAndClaim();
      await lifecycle.completeItem(completion(snapshot));

      const attempt = await LearningAttempt.findOne().lean();

      expect(Object.keys(attempt).sort()).toEqual(
        [
          "__v",
          "_id",
          "attemptId",
          "band",
          "childId",
          "contentFingerprint",
          "endedAt",
          "expressiveState",
          "interactiveOutcome",
          "missionId",
          "parentId",
          "startedAt",
          "status",
          "supportLevel",
          "variationSignature",
        ].sort(),
      );
    });
  });

  describe("archiveChildAndDiscardItems", () => {
    test("archives the child and removes that child's snapshot only", async () => {
      await lifecycle.startItem({ ...scope(), ...itemFields() });
      const stranger = await createAuthenticatedParentWithChild(childFields);
      await lifecycle.startItem({ parentId: stranger.parentId, childId: stranger.childId, ...itemFields() });

      const archivedChild = await lifecycle.archiveChildAndDiscardItems(scope());

      const remaining = await ActiveLearningItem.find();

      expect(archivedChild.isArchived).toBe(true);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].childId.toString()).toBe(stranger.childId);
    });

    test("returns null and leaves another parent's snapshot alone for a child it does not own", async () => {
      await lifecycle.startItem({ ...scope(), ...itemFields() });
      const stranger = await createAuthenticatedParentWithChild(childFields);

      const result = await lifecycle.archiveChildAndDiscardItems({
        parentId: stranger.parentId,
        childId: owner.childId,
      });

      expect(result).toBeNull();
      expect(await ActiveLearningItem.countDocuments()).toBe(1);
    });
  });

  test("the snapshot model keeps a TTL backstop index on last activity", async () => {
    const indexes = await mongoose.model("ActiveLearningItem").collection.indexes();

    expect(indexes).toContainEqual(
      expect.objectContaining({ key: { lastActivityAt: 1 }, expireAfterSeconds: 7 * 24 * 60 * 60 }),
    );
  });
});
