const request = require("supertest");
const app = require("../src/app");
const mockChildProfiles = require("../src/data/mockChildProfiles");

describe("GET /api/child-profiles", () => {
  test("returns all available child profiles, not only the first one", async () => {
    const response = await request(app).get("/api/child-profiles");

    expect(response.statusCode).toBe(200);
    expect(response.body.childProfiles).toHaveLength(mockChildProfiles.length);
    expect(mockChildProfiles.length).toBeGreaterThan(1);
  });

  test("includes the existing child profile", async () => {
    const response = await request(app).get("/api/child-profiles");

    const gaya = response.body.childProfiles.find(
      (profile) => profile.id === "mock-child-profile-gaya",
    );

    expect(gaya).toMatchObject({
      id: "mock-child-profile-gaya",
      name: "גאיה",
      grammaticalGender: "female",
      readingLevel: "beginner",
    });
  });

  test("includes the newly added Omer profile with his correct data", async () => {
    const response = await request(app).get("/api/child-profiles");

    const omer = response.body.childProfiles.find(
      (profile) => profile.id === "mock-child-profile-omer",
    );

    expect(omer).toMatchObject({
      id: "mock-child-profile-omer",
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
