import { buildErrorResponseBody } from "../../src/http/errorResponses.js";

const ORIGINAL_ENV = process.env;

describe("errorResponses", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  test("returns the centralized public message and stable errorCode without debug details by default", () => {
    process.env.NODE_ENV = "production";

    expect(buildErrorResponseBody("readingSessionAnswerFailed", { cause: new Error("provider exploded") })).toEqual({
      error: "Failed to evaluate the answer",
      errorCode: "reading_session_answer_failed",
    });
  });

  test("adds development-only details without changing the public message contract", () => {
    process.env.NODE_ENV = "development";

    expect(buildErrorResponseBody("readingSessionAnswerFailed", { cause: new Error("provider exploded") })).toEqual({
      error: "Failed to evaluate the answer",
      errorCode: "reading_session_answer_failed",
      debug: {
        message: "The answer could not be evaluated.",
        causeName: "Error",
        causeMessage: "provider exploded",
      },
    });
  });
});
