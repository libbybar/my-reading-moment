import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import * as textResultRepository from "../../src/repositories/textResultRepository.js";
import * as parentRepository from "../../src/repositories/parentRepository.js";
import TextResult from "../../src/models/TextResult.js";
import Parent from "../../src/models/Parent.js";
import * as testDb from "../support/testDb.js";

// Proves the test infra (MongoMemoryReplSet) actually supports multi-document
// transactions across two collections, before any real feature relies on it.
describe("Mongo transaction infra", () => {
  beforeAll(async () => {
    await testDb.connect();
  }, 20000);

  afterEach(async () => {
    await testDb.clearDatabase();
  });

  afterAll(async () => {
    await testDb.disconnect();
  }, 20000);

  test("commits both writes together when the transaction succeeds", async () => {
    const parent = await parentRepository.create({
      email: "txn-success@example.com",
      passwordHash: "hash",
      children: [
        {
          name: "Test Child",
          grammaticalGender: "female",
          learningProfile: { readingLevel: "beginner", interests: [] },
        },
      ],
    });
    const childId = parent.children[0]._id;

    const session = await mongoose.startSession();

    await session.withTransaction(async () => {
      await textResultRepository.create(
        {
          sessionId: randomUUID(),
          parentId: parent._id,
          childId,
          level: 2,
          sublevel: 3,
          specVersion: 1,
          result: "success",
          startedAt: new Date(),
          completedAt: new Date(),
        },
        { session },
      );

      await Parent.findOneAndUpdate(
        { _id: parent._id, "children._id": childId },
        { $inc: { "children.$.journeyProgress": 1 } },
        { session },
      );
    });

    await session.endSession();

    const storedResults = await TextResult.find({ parentId: parent._id, childId });
    const storedParent = await Parent.findById(parent._id);

    expect(storedResults).toHaveLength(1);
    expect(storedParent.children[0].journeyProgress).toBe(1);
  });

  test("persists neither write when the transaction is aborted mid-way", async () => {
    const parent = await parentRepository.create({
      email: "txn-abort@example.com",
      passwordHash: "hash",
      children: [
        {
          name: "Test Child",
          grammaticalGender: "female",
          learningProfile: { readingLevel: "beginner", interests: [] },
        },
      ],
    });
    const childId = parent.children[0]._id;

    const session = await mongoose.startSession();

    await expect(
      session.withTransaction(async () => {
        await textResultRepository.create(
          {
            sessionId: randomUUID(),
            parentId: parent._id,
            childId,
            level: 2,
            sublevel: 3,
            specVersion: 1,
            result: "success",
            startedAt: new Date(),
            completedAt: new Date(),
          },
          { session },
        );

        throw new Error("simulated failure after the first write");
      }),
    ).rejects.toThrow("simulated failure after the first write");

    await session.endSession();

    const storedResults = await TextResult.find({ parentId: parent._id, childId });
    const storedParent = await Parent.findById(parent._id);

    expect(storedResults).toHaveLength(0);
    expect(storedParent.children[0].journeyProgress).toBe(0);
  });

  test("a write made without passing {session} is NOT protected by the transaction", async () => {
    const parent = await parentRepository.create({
      email: "txn-forgot-session@example.com",
      passwordHash: "hash",
      children: [
        {
          name: "Test Child",
          grammaticalGender: "female",
          learningProfile: { readingLevel: "beginner", interests: [] },
        },
      ],
    });
    const childId = parent.children[0]._id;

    const session = await mongoose.startSession();

    await expect(
      session.withTransaction(async () => {
        // Deliberately omits { session } to prove this pitfall is real and catchable by a test.
        await textResultRepository.create({
          sessionId: randomUUID(),
          parentId: parent._id,
          childId,
          level: 2,
          sublevel: 3,
          specVersion: 1,
          result: "success",
          startedAt: new Date(),
          completedAt: new Date(),
        });

        throw new Error("simulated failure after the unprotected write");
      }),
    ).rejects.toThrow("simulated failure after the unprotected write");

    await session.endSession();

    const storedResults = await TextResult.find({ parentId: parent._id, childId });

    // This write survives the abort precisely because it ran outside the transaction.
    expect(storedResults).toHaveLength(1);
  });
});
