import MAPPER_ITEM_BANK from "../src/data/mapperItemBank.js";
import { validateMapperBank } from "../src/services/mapperItemValidation.js";
import { READABILITY_BANDS } from "../src/data/readabilityBands.js";

const problems = validateMapperBank(MAPPER_ITEM_BANK);
const itemCountsByBand = READABILITY_BANDS.map(
  (band) => `${band}: ${MAPPER_ITEM_BANK.items.filter((item) => item.band === band).length}`,
);

console.log(`Items per band — ${itemCountsByBand.join(", ")}`);
console.log(`Practice item: ${MAPPER_ITEM_BANK.practiceItem ? "present" : "missing"}`);

if (problems.length > 0) {
  console.error(`\n${problems.length} problem(s):`);
  problems.forEach((problem) => console.error(`- ${problem}`));
  process.exit(1);
}

if (MAPPER_ITEM_BANK.items.length === 0) {
  console.log("\nThe bank is empty, so there is nothing to check yet.");
} else {
  console.log("\nAll code-checkable rules pass. Answerability, ambiguity, gender and nikud still need human review.");
}
