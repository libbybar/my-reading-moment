import { jest } from "@jest/globals";

const ORIGINAL_ENV = process.env;

// Avoid requiring the real Gemini client while testing require-time provider selection.
jest.unstable_mockModule("@google/genai", () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: { generateContent: jest.fn() },
  })),
  Type: { OBJECT: "OBJECT", STRING: "STRING", BOOLEAN: "BOOLEAN" },
}));

describe("llmProvider/index (provider selection)", () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  test("defaults to the mock provider when LLM_PROVIDER is unset", async () => {
    delete process.env.LLM_PROVIDER;

    const { default: provider } = await import("../../src/services/llmProvider/index.js");
    const { default: mockProvider } = await import("../../src/services/llmProvider/mockProvider.js");

    expect(provider).toBe(mockProvider);
  });

  test("selects the mock provider when LLM_PROVIDER=mock", async () => {
    process.env.LLM_PROVIDER = "mock";

    const { default: provider } = await import("../../src/services/llmProvider/index.js");
    const { default: mockProvider } = await import("../../src/services/llmProvider/mockProvider.js");

    expect(provider).toBe(mockProvider);
  });

  test("selects the gemini provider when LLM_PROVIDER=gemini", async () => {
    process.env.LLM_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "test-key";

    const { default: provider } = await import("../../src/services/llmProvider/index.js");
    const { default: geminiProvider } = await import("../../src/services/llmProvider/geminiProvider.js");

    expect(provider).toBe(geminiProvider);
  });

  test("throws when LLM_PROVIDER is set to an unsupported value", async () => {
    process.env.LLM_PROVIDER = "chatgpt";

    await expect(import("../../src/services/llmProvider/index.js")).rejects.toThrow();
  });

  test("throws when LLM_PROVIDER=gemini and GEMINI_API_KEY is missing", async () => {
    process.env.LLM_PROVIDER = "gemini";
    delete process.env.GEMINI_API_KEY;

    await expect(import("../../src/services/llmProvider/index.js")).rejects.toThrow();
  });
});
