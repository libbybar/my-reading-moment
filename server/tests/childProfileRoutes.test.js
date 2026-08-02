import request from "supertest";
import app from "../src/app.js";
import * as testDb from "./support/testDb.js";
import Parent from "../src/models/Parent.js";

const ORIGINAL_JWT_SECRET = process.env.JWT_SECRET;

describe("GET /api/child-profiles", () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = "test-secret";
    await testDb.connect();
  });

  afterEach(async () => {
    await testDb.clearDatabase();
  });

  afterAll(async () => {
    process.env.JWT_SECRET = ORIGINAL_JWT_SECRET;
    await testDb.disconnect();
  });

  async function registerAndLogin(email, password) {
    await request(app).post("/api/auth/register").send({ email, password });
    const loginResponse = await request(app).post("/api/auth/login").send({ email, password });

    return loginResponse.headers["set-cookie"];
  }

  test("returns 401 without a valid auth cookie", async () => {
    const response = await request(app).get("/api/child-profiles");

    expect(response.statusCode).toBe(401);
  });

  test("returns an empty list for a freshly registered parent with no children", async () => {
    const cookie = await registerAndLogin("parent@example.com", "correct-horse");

    const response = await request(app).get("/api/child-profiles").set("Cookie", cookie);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ childProfiles: [] });
  });

  test("returns an empty list if the authenticated parent no longer exists", async () => {
    const cookie = await registerAndLogin("parent@example.com", "correct-horse");
    await Parent.deleteMany({});

    const response = await request(app).get("/api/child-profiles").set("Cookie", cookie);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ childProfiles: [] });
  });

  describe("when the authenticated parent has children", () => {
    let cookie;
    let parent;

    beforeEach(async () => {
      cookie = await registerAndLogin("parent@example.com", "correct-horse");
      parent = await Parent.findOneAndUpdate(
        { email: "parent@example.com" },
        {
          children: [
            {
              name: "גאיה",
              grammaticalGender: "female",
              learningProfile: { readingLevel: "beginner", interests: [], completedStepCount: 0 },
            },
            {
              name: "עומר",
              grammaticalGender: "male",
              learningProfile: {
                readingLevel: "intermediate",
                interests: [],
                completedStepCount: 0,
              },
            },
          ],
        },
        { returnDocument: "after", runValidators: true },
      );
    });

    test("returns all available child profiles, not only the first one", async () => {
      const response = await request(app).get("/api/child-profiles").set("Cookie", cookie);

      expect(response.statusCode).toBe(200);
      expect(response.body.childProfiles).toHaveLength(2);
    });

    test("includes the existing child profile", async () => {
      const response = await request(app).get("/api/child-profiles").set("Cookie", cookie);

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
      const response = await request(app).get("/api/child-profiles").set("Cookie", cookie);

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
      const response = await request(app).get("/api/child-profiles").set("Cookie", cookie);

      const ids = response.body.childProfiles.map((profile) => profile.id);

      expect(new Set(ids).size).toBe(ids.length);
    });

    test("only returns the authenticated parent's own children, not another parent's", async () => {
      const otherCookie = await registerAndLogin("other-parent@example.com", "another-password");
      await Parent.findOneAndUpdate(
        { email: "other-parent@example.com" },
        {
          children: [
            {
              name: "דני",
              grammaticalGender: "male",
              learningProfile: { readingLevel: "beginner", interests: [], completedStepCount: 0 },
            },
          ],
        },
      );

      const response = await request(app).get("/api/child-profiles").set("Cookie", otherCookie);

      expect(response.body.childProfiles).toHaveLength(1);
      expect(response.body.childProfiles[0].name).toBe("דני");
    });

  });
});
