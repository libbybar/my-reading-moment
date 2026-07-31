import geminiProvider from "./geminiProvider.js";
import mockProvider from "./mockProvider.js";

const SUPPORTED_PROVIDERS = ["mock", "gemini"];

function loadProvider(providerName) {
  if (providerName === "mock") {
    return mockProvider;
  }

  if (providerName === "gemini") {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.trim().length === 0) {
      throw new Error("GEMINI_API_KEY is required when LLM_PROVIDER=gemini");
    }

    return geminiProvider;
  }

  throw new Error(
    `Unsupported LLM_PROVIDER: "${providerName}". Supported providers: ${SUPPORTED_PROVIDERS.join(", ")}`,
  );
}

const llmProvider = loadProvider(process.env.LLM_PROVIDER || "mock");

export { loadProvider };

export default llmProvider;
