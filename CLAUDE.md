# רק רגע לקרוא — Project Context

This file exists to preserve architectural decisions and their reasoning across sessions — update it when a decision here changes, not just when code changes.

## Product overview

My Reading Moment is a Hebrew reading-practice application for children aged 6–10.

The child reads a short passage and answers a free-text comprehension question. Answers may contain reasonable spelling mistakes, so correctness is evaluated semantically rather than through exact string comparison.

If the answer is not accepted, the child receives supportive feedback and may request a different question about the same passage and at the same reading level.

A future task may expand the flow to approximately three questions from different angles per passage. That is not part of the current task.

`client/` is Vite + React + styled-components; `server/` is Express (CommonJS).

## Current milestone: Task 4.2 — answer-and-feedback cycle UI

Server-side foundation (4.1) is done: `/preview`, `/answers`, `/next-question` all exist and are fully tested.

### In scope

- storing the child's answer in client state
- submitting the answer through `submitAnswer`
- explicit `answering`, `checking`, `correct`, `retry`, `generating`, and `error` states
- preventing duplicate submissions while a request is pending
- displaying feedback selected through semantic text keys
- requiring an explicit child action before requesting a replacement question
- requesting a replacement question through the existing session-based server flow
- replacing only the current question while keeping the same passage
- clearing the answer input when a new question is displayed
- resolving child-facing text according to language and grammatical gender
- automated tests for the full answer-and-feedback cycle

### Out of scope (this task)

- connecting a real LLM
- success animation
- transition to the next learning stage
- a three-question flow for each passage
- question or attempt limits
- database persistence
- progress summaries
- parent feedback
- parent-facing progress tables
- session-completion screens

### Not yet done

`QuestionStep` still uses the old index-array model (`exercise.questions[i]`, `onNext`) — it needs a full rewrite to the canonical single-`question` + answer-submission model, blocked on the grammatical-gender prerequisite below.

## Grammatical-gender rule

`grammaticalGender` must come only from the selected child profile. Supported values:

```js
"female"
"male"
```

There is no default grammatical gender. Missing or unsupported grammatical gender is a **data-contract failure** — do not guess, silently fall back, or hardcode a gender in the client.

**Current prerequisite before wiring the answer-cycle UI:** expose validated `grammaticalGender` through `/preview`. This includes server-side validation and automated tests, not only adding a response field. (`grammaticalGender` today exists only in `server/src/data/mockChildProfiles.js`; the `child` object is already loaded in the `/preview` handler for the 404 check, so returning it is a small addition — but it must be validated and tested as a real contract field, not just appended.)

## Core architectural decisions (and why)

**The reading session is the source of truth, not `mockPassages`.** `server/src/services/readingSessionStore.js` stores a *snapshot* of the passage (`{id, title, text, readingLevel}` — no `questions` array) plus the exact `currentQuestion` and `askedQuestionIds` at session-creation time. `/answers` and `/next-question` read from the session, never re-look-up `mockPassages`. Why: a real LLM-generated question won't exist in any static seed list, and the passage text itself could differ per generation — the session must be self-contained.

**`expectedMeaning` never crosses HTTP.** The provider's `generateQuestion` returns it (server needs it later for `evaluateAnswer`), but every route response is built through an explicit whitelist (`toSafeQuestion`) — never a raw pass-through.

**Evaluation contract is data, not presentation.** `evaluateAnswer` returns exactly `{ questionId, isCorrect, feedbackType: "correct"|"retry" }` — no message, no tone/color. The client picks child-facing wording itself. This keeps the LLM boundary purely semantic.

**`"exhausted"` is a mock artifact, not a product state.** The current mock has a finite seeded question list per passage and can run out; a real LLM wouldn't. It's handled as a graceful fallback (`{question: null}` from `/next-question`), explicitly *not* one of the UI's named states. Session/question-count limits (a real product concept) will be designed separately later — don't conflate the two.

**Provider contract is intentionally minimal and mock-agnostic.** `generateQuestion({passage, askedQuestionIds})` only requires `passage.id/text/readingLevel` (what a real generator actually needs) — the mock's own lookup into `mockPassages` by `id` is an internal implementation detail, asserted nowhere in the shared contract tests (`tests/support/llmProviderContract.js`). That shared suite is written to be re-runnable against a future real provider unchanged. Routes never branch on mock-vs-real — proven by tests that stub the provider module and check the route only forwards its output.

**Session store stays minimal on purpose.** Only `createSession`, `getSession`, `replaceCurrentQuestion`, and a test-only `clearSessions`. No generic `updateSession(id, patch)` — that would permit arbitrary mutations before the retry/next-question transition rules are even defined. Add focused, named mutations only, as new flows need them.

**Routes validate before mutating.** E.g. `/next-question` validates the provider's returned question (non-blank `id`/`prompt`/`expectedMeaning`, matching `passageId`, not already in `askedQuestionIds`) *before* calling `replaceCurrentQuestion` — a malformed provider result must never leave the session half-mutated.

**Answer-cycle flow:**
```
answering → checking → correct                (checkpoint, NOT session completion —
                                                 a future task adds an animation + stage
                                                 transition here; don't treat it as terminal)
answering → checking → retry → [user clicks "another question"] → generating → answering
any request failure → error
```
`retry` is a real waiting state with an explicit user action — the client does *not* auto-fetch the next question.

## UI text rule

Do not hardcode child-facing UI text inside:

- React components
- event handlers
- conditional branches
- services
- routes

All UI text must be stored under stable semantic keys in the localized text source (`client/src/constants/text.js`).

- Gender-neutral messages remain plain strings.
- Messages that require grammatical-gender variation use explicit variants: `{ female: "...", male: "..." }`.
- New gender-aware UI code must resolve text through `resolveText(key, {language, grammaticalGender})` (`client/src/constants/resolveText.js`), which throws (never falls back) on an unsupported language, missing key, malformed entry, or missing/invalid `grammaticalGender`.
- The transitional `TEXT` compatibility export is only for existing neutral-string consumers and must not be used for new gender-aware text — it actively throws if code touches a gendered key through it (via a getter), so it can never silently leak a `{female,male}` object.
- No i18n library — plain JS objects + one small resolver, deliberately.

## Component conventions

- `components/ui/*` — fully dumb, reusable, controlled components (`Button`, `TextField`, `SelectField`, `Card`, `PageShell`, `FeedbackMessage`). No app/session knowledge, no text-key resolution, no hardcoded text. Matching styles live in `styles/components/*Style.js`.
- `pages/*` — page-level composition (`ReadingSessionPage`, `QuestionStep`) — these *do* know about the domain, own state, and call services, but delegate all HTTP calls to `services/readingSessionService.js`.
- `styles/<PageName>Style.js` — page-specific styled-components (not reused elsewhere).

## Testing conventions

- Server: Jest, globals not imported (`describe`/`test`/`expect` are ambient). `tests/support/llmProviderContract.js` is a shared, parameterized suite — not a test file itself (no `.test.js` suffix) — invoked by both real and mocked provider test files.
- Client: Vitest, everything explicitly imported (`describe`/`it`/`expect`/`vi` from `'vitest'`) since `globals: true` isn't set. Always `afterEach(cleanup)` in component tests (state leaks across tests otherwise).
- Every provider-facing route has two test files: one exercising the real mock end-to-end, one mocking the provider module to test error handling and prove the route doesn't branch on mock-vs-real.
- `readingSessionService.js` errors are a structured `ReadingSessionServiceError` (`status`, `body`, `message`) — assert on shape, not just `.toThrow()`.

## Review workflow

Each completed implementation step is followed by an independent focused code review. Libby decides which findings are approved. Only approved corrections should be implemented before continuing to the next step.

Do not treat review suggestions as permission to make unrelated refactors or broaden the task scope.

## Git workflow

Active branch:

```text
feature/reading-session-page
```

Create commits only when a step is:

- complete
- reviewed
- covered by the relevant tests
- passing the full test suites
- lint-clean

Keep unrelated changes out of the same commit.

## Working style for this project

- Work in small, single-concern steps: propose → get explicit go-ahead → implement (including its tests) → run the *full* client and server suites + lint for both → stop for review. Don't bundle unrelated changes into one step.
- When implementing a step surfaces a contract/architecture gap (e.g. a validation missing, two fields that should be one source of truth), stop and propose the fix before continuing — don't silently patch around it.
- Respond in English in conversation (the user is practicing work-English) even when the user writes in Hebrew — this is a standing preference, unrelated to the app itself, which stays Hebrew/RTL throughout.
