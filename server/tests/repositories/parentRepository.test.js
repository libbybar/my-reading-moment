import * as testDb from "../support/testDb.js";
import * as parentRepository from "../../src/repositories/parentRepository.js";

describe("parentRepository", () => {
  beforeAll(async () => {
    await testDb.connect();
  });

  afterEach(async () => {
    await testDb.clearDatabase();
  });

  afterAll(async () => {
    await testDb.disconnect();
  });

  describe("findByEmail", () => {
    test("returns null when no parent has the given email", async () => {
      const found = await parentRepository.findByEmail("nobody@example.com");

      expect(found).toBeNull();
    });

    test("finds a parent regardless of the input's casing or surrounding whitespace", async () => {
      await parentRepository.create({ email: "parent@example.com", passwordHash: "hash" });

      const found = await parentRepository.findByEmail("  PARENT@Example.com  ");

      expect(found).not.toBeNull();
      expect(found.email).toBe("parent@example.com");
    });
  });

  describe("findByEmailWithPasswordHash", () => {
    test("includes passwordHash, unlike findByEmail", async () => {
      await parentRepository.create({ email: "parent@example.com", passwordHash: "hash" });

      const withoutHash = await parentRepository.findByEmail("parent@example.com");
      const withHash = await parentRepository.findByEmailWithPasswordHash("parent@example.com");

      expect(withoutHash.passwordHash).toBeUndefined();
      expect(withHash.passwordHash).toBe("hash");
    });

    test("returns null when no parent has the given email", async () => {
      const found = await parentRepository.findByEmailWithPasswordHash("nobody@example.com");

      expect(found).toBeNull();
    });
  });

  describe("findById", () => {
    test("returns the parent matching the given id", async () => {
      const created = await parentRepository.create({
        email: "parent@example.com",
        passwordHash: "hash",
      });

      const found = await parentRepository.findById(created._id);

      expect(found.email).toBe("parent@example.com");
    });

    test("returns null for an id that doesn't exist", async () => {
      const found = await parentRepository.findById("507f1f77bcf86cd799439011");

      expect(found).toBeNull();
    });
  });

  describe("recordLogin", () => {
    test("sets lastLoginAt on the parent", async () => {
      const created = await parentRepository.create({
        email: "parent@example.com",
        passwordHash: "hash",
      });
      expect(created.lastLoginAt).toBeUndefined();

      const updated = await parentRepository.recordLogin(created._id);

      expect(updated.lastLoginAt).toBeInstanceOf(Date);
    });
  });

  describe("applyTextCompletionProgress", () => {
    async function createChild() {
      const parent = await parentRepository.create({
        email: "parent@example.com",
        passwordHash: "hash",
        children: [
          {
            name: "גאיה",
            grammaticalGender: "female",
            learningProfile: {
              readingLevel: "beginner",
              interests: [],
              currentLevel: 2,
              currentSublevel: 2,
            },
            journeyProgress: 0,
          },
        ],
      });

      return { parent, childId: parent.children[0]._id };
    }

    test("increments journeyProgress when incrementJourneyProgress is true", async () => {
      const { parent, childId } = await createChild();

      const updatedChild = await parentRepository.applyTextCompletionProgress(parent._id, childId, {
        incrementJourneyProgress: true,
        levelUpdate: null,
      });

      expect(updatedChild.journeyProgress).toBe(1);
      expect(updatedChild.learningProfile.currentLevel).toBe(2);
      expect(updatedChild.learningProfile.currentSublevel).toBe(2);
    });

    test("does not increment journeyProgress when incrementJourneyProgress is false", async () => {
      const { parent, childId } = await createChild();

      const updatedChild = await parentRepository.applyTextCompletionProgress(parent._id, childId, {
        incrementJourneyProgress: false,
        levelUpdate: { level: 2, sublevel: 1 },
      });

      expect(updatedChild.journeyProgress).toBe(0);
      expect(updatedChild.learningProfile.currentLevel).toBe(2);
      expect(updatedChild.learningProfile.currentSublevel).toBe(1);
    });

    test("updates currentLevel/currentSublevel when levelUpdate is given", async () => {
      const { parent, childId } = await createChild();

      const updatedChild = await parentRepository.applyTextCompletionProgress(parent._id, childId, {
        incrementJourneyProgress: true,
        levelUpdate: { level: 2, sublevel: 3 },
      });

      expect(updatedChild.learningProfile.currentLevel).toBe(2);
      expect(updatedChild.learningProfile.currentSublevel).toBe(3);
      expect(updatedChild.journeyProgress).toBe(1);
    });

    test("mutates nothing but still returns the child when there is nothing to apply (null must mean 'not found', never 'no-op')", async () => {
      const { parent, childId } = await createChild();

      const result = await parentRepository.applyTextCompletionProgress(parent._id, childId, {
        incrementJourneyProgress: false,
        levelUpdate: null,
      });

      expect(result).not.toBeNull();
      expect(result.journeyProgress).toBe(0);
    });

    test("returns null when the child does not belong to the given parent, even with something to apply", async () => {
      const { childId } = await createChild();
      const otherParent = await parentRepository.create({ email: "other@example.com", passwordHash: "hash" });

      const result = await parentRepository.applyTextCompletionProgress(otherParent._id, childId, {
        incrementJourneyProgress: true,
        levelUpdate: null,
      });

      expect(result).toBeNull();
    });

    test("returns null when the child does not belong to the given parent and there is nothing to apply", async () => {
      const { childId } = await createChild();
      const otherParent = await parentRepository.create({ email: "other@example.com", passwordHash: "hash" });

      const result = await parentRepository.applyTextCompletionProgress(otherParent._id, childId, {
        incrementJourneyProgress: false,
        levelUpdate: null,
      });

      expect(result).toBeNull();
    });
  });

  describe("addLearningEvent", () => {
    test("appends the event to the matching child's learningEvents", async () => {
      const parent = await parentRepository.create({
        email: "parent@example.com",
        passwordHash: "hash",
        children: [
          {
            name: "גאיה",
            grammaticalGender: "female",
            learningProfile: { readingLevel: "beginner", interests: [] },
          },
        ],
      });
      const childId = parent.children[0]._id;

      const updatedChild = await parentRepository.addLearningEvent(parent._id, childId, {
        type: "answer_attempt",
        source: "system",
        payload: { questionId: "q1", isCorrect: true },
      });

      expect(updatedChild.learningEvents).toHaveLength(1);
      expect(updatedChild.learningEvents[0]).toMatchObject({
        type: "answer_attempt",
        source: "system",
        payload: { questionId: "q1", isCorrect: true },
      });
    });

    test("returns null when the child does not belong to the given parent", async () => {
      const parent = await parentRepository.create({
        email: "parent@example.com",
        passwordHash: "hash",
        children: [
          {
            name: "גאיה",
            grammaticalGender: "female",
            learningProfile: { readingLevel: "beginner", interests: [] },
          },
        ],
      });
      const otherParent = await parentRepository.create({
        email: "other@example.com",
        passwordHash: "hash",
      });
      const childId = parent.children[0]._id;

      const result = await parentRepository.addLearningEvent(otherParent._id, childId, {
        type: "answer_attempt",
        source: "system",
      });

      expect(result).toBeNull();
    });
  });

  describe("writes to an archived child", () => {
    async function createArchivedChild() {
      const parent = await parentRepository.create({
        email: "parent@example.com",
        passwordHash: "hash",
        children: [
          {
            name: "גאיה",
            grammaticalGender: "female",
            learningProfile: { readingLevel: "beginner", interests: [] },
            isArchived: true,
          },
        ],
      });

      return { parent, childId: parent.children[0]._id };
    }

    test("addLearningEvent returns null and appends nothing", async () => {
      const { parent, childId } = await createArchivedChild();

      const result = await parentRepository.addLearningEvent(parent._id, childId, {
        type: "answer_attempt",
        source: "system",
      });

      const stored = (await parentRepository.findById(parent._id)).children.id(childId);

      expect(result).toBeNull();
      expect(stored.learningEvents).toHaveLength(0);
    });

    test("applyTextCompletionProgress returns null and changes nothing when there is something to write", async () => {
      const { parent, childId } = await createArchivedChild();

      const result = await parentRepository.applyTextCompletionProgress(parent._id, childId, {
        incrementJourneyProgress: true,
        levelUpdate: { level: 2, sublevel: 1 },
      });

      const stored = (await parentRepository.findById(parent._id)).children.id(childId);

      expect(result).toBeNull();
      expect(stored.journeyProgress).toBe(0);
    });

    test("applyTextCompletionProgress returns null even when there is nothing to write", async () => {
      const { parent, childId } = await createArchivedChild();

      const result = await parentRepository.applyTextCompletionProgress(parent._id, childId, {
        incrementJourneyProgress: false,
        levelUpdate: null,
      });

      expect(result).toBeNull();
    });
  });

  describe("updateChild", () => {
    async function createChild(overrides = {}) {
      const parent = await parentRepository.create({
        email: "parent@example.com",
        passwordHash: "hash",
        children: [
          {
            name: "גאיה",
            grammaticalGender: "female",
            learningProfile: { readingLevel: "beginner", interests: [] },
            ...overrides,
          },
        ],
      });

      return { parent, childId: parent.children[0]._id };
    }

    test("applies the given field updates and returns the updated child", async () => {
      const { parent, childId } = await createChild();

      const updatedChild = await parentRepository.updateChild(parent._id, childId, {
        name: "שם חדש",
      });

      expect(updatedChild.name).toBe("שם חדש");
    });

    test("returns null for an archived child, exactly as for a non-owned one", async () => {
      const { parent, childId } = await createChild({ isArchived: true });

      const result = await parentRepository.updateChild(parent._id, childId, {
        name: "ניסיון עדכון",
      });

      expect(result).toBeNull();
    });
  });

  describe("archiveChild", () => {
    async function createChild() {
      const parent = await parentRepository.create({
        email: "parent@example.com",
        passwordHash: "hash",
        children: [
          {
            name: "גאיה",
            grammaticalGender: "female",
            learningProfile: { readingLevel: "beginner", interests: [] },
          },
        ],
      });

      return { parent, childId: parent.children[0]._id };
    }

    test("sets isArchived to true and returns the child", async () => {
      const { parent, childId } = await createChild();

      const archivedChild = await parentRepository.archiveChild(parent._id, childId);

      expect(archivedChild.isArchived).toBe(true);
    });

    test("does not remove the child from the parent's children array", async () => {
      const { parent, childId } = await createChild();

      await parentRepository.archiveChild(parent._id, childId);

      const found = await parentRepository.findById(parent._id);
      expect(found.children).toHaveLength(1);
      expect(found.children.id(childId)).not.toBeNull();
    });

    test("returns null when the child does not belong to the given parent", async () => {
      const { childId } = await createChild();
      const otherParent = await parentRepository.create({ email: "other@example.com", passwordHash: "hash" });

      const result = await parentRepository.archiveChild(otherParent._id, childId);

      expect(result).toBeNull();
    });

    test("returns null when the child is already archived", async () => {
      const { parent, childId } = await createChild();
      await parentRepository.archiveChild(parent._id, childId);

      const result = await parentRepository.archiveChild(parent._id, childId);

      expect(result).toBeNull();
    });

    test("returns null for a childId that doesn't exist", async () => {
      const { parent } = await createChild();

      const result = await parentRepository.archiveChild(parent._id, "507f1f77bcf86cd799439011");

      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    test("persists a parent with a normalized (trimmed, lowercased) email", async () => {
      const parent = await parentRepository.create({
        email: "  Parent@Example.com  ",
        passwordHash: "hash",
      });

      expect(parent.email).toBe("parent@example.com");
    });

    test("throws DuplicateEmailError when the email is already registered, regardless of casing", async () => {
      await parentRepository.create({ email: "parent@example.com", passwordHash: "hash" });

      await expect(
        parentRepository.create({ email: "PARENT@example.com", passwordHash: "another-hash" }),
      ).rejects.toThrow(parentRepository.DuplicateEmailError);
    });
  });
});
