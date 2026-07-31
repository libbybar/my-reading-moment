import request from "supertest";
import app from "../src/app.js";
import * as testDb from "./support/testDb.js";
import Parent from "../src/models/Parent.js";

describe("GET /api/child-profiles", () => {
  beforeAll(async () => {
    await testDb.connect();
  });

  afterEach(async () => {
    await testDb.clearDatabase();
  });

  afterAll(async () => {
    await testDb.disconnect();
  });

  test("returns an empty list when no parent exists", async () => {
    const response = await request(app).get("/api/child-profiles");

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ childProfiles: [] });
  });

  describe("when a parent with children exists", () => {
    let parent;

    beforeEach(async () => {
      parent = await Parent.create({
        email: "parent@example.com",
        passwordHash: "hash",
        children: [
          {
            name: "גאיה",
            grammaticalGender: "female",
            learningProfile: { readingLevel: "beginner", interests: [], completedStepCount: 0 },
          },
          {
            name: "עומר",
            grammaticalGender: "male",
            learningProfile: { readingLevel: "intermediate", interests: [], completedStepCount: 0 },
          },
        ],
      });
    });

    test("returns all available child profiles, not only the first one", async () => {
      const response = await request(app).get("/api/child-profiles");

      expect(response.statusCode).toBe(200);
      expect(response.body.childProfiles).toHaveLength(2);
    });

    test("includes the existing child profile", async () => {
      const response = await request(app).get("/api/child-profiles");

      const [gayaChild] = parent.children;
      const gaya = response.body.childProfiles.find(
        (profile) => profile.id === gayaChild._id.toString(),
      );

      expect(gaya).toMatchObject({
        name: "גאיה",
        grammaticalGender: "female",
        readingLevel: "beginner",
      });
    });

    test("includes the newly added Omer profile with his correct data", async () => {
      const response = await request(app).get("/api/child-profiles");

      const [, omerChild] = parent.children;
      const omer = response.body.childProfiles.find(
        (profile) => profile.id === omerChild._id.toString(),
      );

      expect(omer).toMatchObject({
        name: "עומר",
        grammaticalGender: "male",
        readingLevel: "intermediate",
      });
    });

    test("returns unique profile ids", async () => {
      const response = await request(app).get("/api/child-profiles");

      const ids = response.body.childProfiles.map((profile) => profile.id);

      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});
