import { jest } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";

const { default: app } = await import("../src/app.js");
const { default: readingSessionStore } = await import("../src/services/readingSessionStore.js");
const { default: llmProvider } = await import("../src/services/llmProvider/index.js");
const testDb = await import("./support/testDb.js");
const { createAuthenticatedParent, createAuthenticatedParentWithChild } = await import(
  "./support/testAuth.js"
);

const ORIGINAL_JWT_SECRET = process.env.JWT_SECRET;

describe("POST /api/reading-sessions/preview (child profile grammaticalGender)", () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = "test-secret";
    await testDb.connect();
  }, 20000);

  afterEach(async () => {
    readingSessionStore.clearSessions();
    jest.restoreAllMocks();
    await testDb.clearDatabase();
  });

  afterAll(async () => {
    process.env.JWT_SECRET = ORIGINAL_JWT_SECRET;
    await testDb.disconnect();
  }, 20000);

  function createChildWithGender(grammaticalGender) {
    return createAuthenticatedParentWithChild({
      name: "Test Child",
      grammaticalGender,
      learningProfile: { readingLevel: "beginner", interests: [] },
    });
  }

  // grammaticalGender is required + enum-validated on the schema now, so a
  // missing/invalid value can no longer be created through the normal
  // repository path. This simulates the data-contract failure the same way
  // a stale pre-schema document or a manual DB edit still could in
  // production: writing straight to the collection, bypassing Mongoose
  // validation. /preview must still treat it as an internal failure, not crash.
  async function createChildWithMalformedGender(grammaticalGenderValue) {
    const { parent, cookie } = await createAuthenticatedParent();
    const childId = new mongoose.Types.ObjectId();

    const child = {
      _id: childId,
      name: "Test Malformed Gender",
      learningProfile: { readingLevel: "beginner", interests: [], completedStepCount: 0 },
    };

    if (grammaticalGenderValue !== undefined) {
      child.grammaticalGender = grammaticalGenderValue;
    }

    await mongoose.connection
      .collection("parents")
      .updateOne({ _id: parent._id }, { $push: { children: child } });

    return { childId: childId.toString(), cookie };
  }

  test("returns grammaticalGender sourced from the selected child profile (male)", async () => {
    const { childId, cookie } = await createChildWithGender("male");

    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .set("Cookie", [cookie])
      .send({ childId });

    expect(response.statusCode).toBe(200);
    expect(response.body.grammaticalGender).toBe("male");
  });

  test("returns grammaticalGender sourced from the selected child profile (female)", async () => {
    const { childId, cookie } = await createChildWithGender("female");

    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .set("Cookie", [cookie])
      .send({ childId });

    expect(response.statusCode).toBe(200);
    expect(response.body.grammaticalGender).toBe("female");
  });

  test("returns 500 when the selected child profile is missing grammaticalGender, without touching the provider or session store", async () => {
    const { childId, cookie } = await createChildWithMalformedGender(undefined);
    const generateQuestionSpy = jest.spyOn(llmProvider, "generateQuestion");
    const createSessionSpy = jest.spyOn(readingSessionStore, "createSession");

    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .set("Cookie", [cookie])
      .send({ childId });

    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual({ error: "Failed to generate a reading question" });
    expect(generateQuestionSpy).not.toHaveBeenCalled();
    expect(createSessionSpy).not.toHaveBeenCalled();
  });

  test("returns 500 when the selected child profile has an unsupported grammaticalGender, without touching the provider or session store", async () => {
    const { childId, cookie } = await createChildWithMalformedGender("other");
    const generateQuestionSpy = jest.spyOn(llmProvider, "generateQuestion");
    const createSessionSpy = jest.spyOn(readingSessionStore, "createSession");

    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .set("Cookie", [cookie])
      .send({ childId });

    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual({ error: "Failed to generate a reading question" });
    expect(generateQuestionSpy).not.toHaveBeenCalled();
    expect(createSessionSpy).not.toHaveBeenCalled();
  });

  test("never leaks invalid grammatical-gender data to the client", async () => {
    const { childId, cookie } = await createChildWithMalformedGender("other");

    const response = await request(app)
      .post("/api/reading-sessions/preview")
      .set("Cookie", [cookie])
      .send({ childId });

    expect(response.body).not.toHaveProperty("grammaticalGender");
    expect(JSON.stringify(response.body)).not.toContain("other");
  });
});
