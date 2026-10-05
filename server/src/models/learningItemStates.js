const SUPPORT_LEVELS = ["independent", "prompted", "guided"];

const INTERACTIVE_OUTCOMES = ["not_attempted", "correct", "incorrect"];

// A skipped written answer is its own non-punitive signal, not a wrong one.
const EXPRESSIVE_STATES = ["not_reached", "confirmed", "not_confirmed", "skipped"];

export { SUPPORT_LEVELS, INTERACTIVE_OUTCOMES, EXPRESSIVE_STATES };
