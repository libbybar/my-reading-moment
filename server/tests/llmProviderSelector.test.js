const ORIGINAL_ENV = process.env;

// Isolates @google/genai entirely: the selector's job is choosing a module,
// not talking to Gemini, and geminiClient.js throws at require-time if
// GEMINI_API_KEY is missing — automocking it would require the real module
// first and defeat the point, so every case here uses this manual factory.
jest.mock("@google/genai", () => ({
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

  test("defaults to the mock provider when LLM_PROVIDER is unset", () => {
    delete process.env.LLM_PROVIDER;

    const provider = require("../src/services/llmProvider");
    const mockProvider = require("../src/services/llmProvider/mockProvider");

    expect(provider).toBe(mockProvider);
  });

  test("selects the mock provider when LLM_PROVIDER=mock", () => {
    process.env.LLM_PROVIDER = "mock";

    const provider = require("../src/services/llmProvider");
    const mockProvider = require("../src/services/llmProvider/mockProvider");

    expect(provider).toBe(mockProvider);
  });

  test("selects the gemini provider when LLM_PROVIDER=gemini", () => {
    process.env.LLM_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "test-key";

    const provider = require("../src/services/llmProvider");
    const geminiProvider = require("../src/services/llmProvider/geminiProvider");

    expect(provider).toBe(geminiProvider);
  });

  test("throws when LLM_PROVIDER is set to an unsupported value", () => {
    process.env.LLM_PROVIDER = "chatgpt";

    expect(() => require("../src/services/llmProvider")).toThrow();
  });

  test("throws when LLM_PROVIDER=gemini and GEMINI_API_KEY is missing", () => {
    process.env.LLM_PROVIDER = "gemini";
    delete process.env.GEMINI_API_KEY;

    expect(() => require("../src/services/llmProvider")).toThrow();
  });
});
