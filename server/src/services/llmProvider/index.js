const SUPPORTED_PROVIDERS = ["mock", "gemini"];

function loadProvider(providerName) {
  if (providerName === "mock") {
    return require("./mockProvider");
  }

  if (providerName === "gemini") {
    return require("./geminiProvider");
  }

  throw new Error(
    `Unsupported LLM_PROVIDER: "${providerName}". Supported providers: ${SUPPORTED_PROVIDERS.join(", ")}`,
  );
}

// Resolved once, at require-time, from the environment. Re-exports the
// active provider's own exports object (not a copy), so callers that
// require("../services/llmProvider") never know or care which provider is
// active, and jest.spyOn(llmProvider, ...) in existing tests keeps working —
// it mutates the same object routes read from.
module.exports = loadProvider(process.env.LLM_PROVIDER || "mock");
