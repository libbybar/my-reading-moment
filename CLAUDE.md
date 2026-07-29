# רק רגע לקרוא — Project Context

This file exists to preserve architectural decisions and their reasoning across sessions — update it when a decision here changes, not just when code changes.

## Product overview

My Reading Moment is a Hebrew reading-practice application for children aged 6–10.

The child reads a short passage and answers a free-text comprehension question. Answers may contain reasonable spelling mistakes, so correctness is intended to be evaluated semantically (by a real LLM) rather than through exact string comparison. The current mock `evaluateAnswer` does not do this yet — it uses deterministic normalized-text matching as a temporary stand-in (see "Mock `evaluateAnswer` is deterministic, not semantic" below).

If the answer is not accepted, the child receives supportive feedback and may request a different question about the same passage and at the same reading level.

A future task may expand the flow to approximately three questions from different angles per passage. That is not part of the current task.

`client/` is Vite + React + styled-components; `server/` is Express (CommonJS).

## Current milestone: Task 6 — child-home learning path (in progress)

Task 4 (answer-and-feedback cycle UI) is done. Server-side foundation (4.1) is done: `/preview`, `/answers`, `/next-question` all exist and are fully tested. 4.2 is also done: `QuestionStep` and `ReadingSessionPage` were fully rewritten to the canonical single-`question` + answer-submission model, the `grammaticalGender` prerequisite was implemented, and the full answer-and-feedback cycle is tested end to end.

Since 4.2 closed, two more focused fixes landed on the same branch:
- `/preview` selects the passage by the child's `readingLevel` instead of always using `mockPassages[0]` (see "Passage selection by reading level" below).
- The mock `evaluateAnswer` does deterministic normalized-text matching against `expectedMeaning` instead of accepting any non-blank answer (see "Mock `evaluateAnswer` is deterministic, not semantic" below).
- A responsive/typography pass was done on `ReadingSessionPageStyle.js` and the shared `components/ui` styles (see "Responsive & typography" below).

Task 5 (child-selection screen) is done and merged: `/children` is a dedicated route rendering `ChildSelectionPage`, which loads every child profile through the existing `fetchChildProfiles()` service and renders each as a circular `AvatarButton` (avatar + name). Selecting a profile establishes `activeChildId` at application level and navigates to `/child-home` (see "Active-child identity lives in `ActiveChildProvider`" below). Removing `ReadingSessionPage`'s own child-selection dropdown was originally going to close out Task 5, but was deliberately rolled into Task 6 instead — it did not ship with Task 5 and `ReadingSessionPage` is unchanged so far.

Task 6 so far (first bite):
- `/child-home` is the child's real personal-world screen now, not a placeholder (see "`/child-home` is now the real first version..." below).
- It resolves the active child's full profile itself (fetch-all + find by `activeChildId`, see "Active profile resolution" below), then shows that child's avatar + name and a gendered welcome heading.
- Shows a simple vertical path of numbered stations: one active/clickable (step 1), a couple of locked/non-interactive ones (steps 2–3) — see "Stations are numbered..." below.
- Clicking the active station navigates to `/` (`ReadingSessionPage`) as a temporary bridge; a "switch child" action navigates back to `/children`.

Remaining Task 6 scope: wiring `ReadingSessionPage` to the active child and retiring its own dropdown (the follow-up to the temporary `/` bridge above), the real content behind the locked stations, and broader visual/manual verification.

Planned direction beyond this point:
- Task 7: reading game

### Implemented in 4.2

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

## Grammatical-gender rule

`grammaticalGender` must come only from the selected child profile. Supported values:

```js
"female"
"male"
```

There is no default grammatical gender. Missing or unsupported grammatical gender is a **data-contract failure** — do not guess, silently fall back, or hardcode a gender in the client.

`grammaticalGender` is validated server-side in `/preview` (`isValidGrammaticalGender`, `readingSessionRoutes.js`) and returned in the response; an invalid/missing value on the child profile is treated as an internal data-contract failure and returns the same stable preview-failure response as any other `/preview` error — never a partial response, never which field was invalid.

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

**Passage selection by reading level.** `/preview` selects a passage with `passage.readingLevel === child.readingLevel` — never by array position, interests, name, or id. If no passage matches, it returns the same stable preview-failure response as any other `/preview` failure, and never calls `generateQuestion` or `createSession` (see `readingSessionRoutes.js`). This was a bug fix: it previously always used `mockPassages[0]`.

**Mock `evaluateAnswer` is deterministic, not semantic.** The mock normalizes (trim, lowercase, strip common punctuation, collapse whitespace) both `answerText` and the session's own `question.expectedMeaning`, then checks whether the normalized expected meaning contains the normalized answer (minimum 2 normalized characters, to reject trivial single-letter matches). This lets the current build be exercised manually without a real LLM — it is explicitly *not* the future semantic evaluator, and it never trusts an `expectedMeaning` sent by the client (that field is server-only and never crosses HTTP, per the `expectedMeaning` decision above).

**Active-child identity lives in `ActiveChildProvider`, not the URL.** `/children` (child selection) and `/child-home` (temporary destination) both read/write `activeChildId` through `client/src/context/useActiveChild.js`. The backing `ActiveChildProvider` is mounted once in `App.jsx`, inside `BrowserRouter` but wrapping `Routes`, so the same instance persists across navigation instead of remounting per route. The id is only ever a value in memory — it's never put in the URL and never rendered in the UI, and it does not survive a reload. (`activeChildContext.js`/`ActiveChildProvider.jsx`/`useActiveChild.js` are three separate files, not one, because a file mixing a component export with a hook export trips the `react-refresh/only-export-components` lint rule — don't recombine them.)

**`/child-home` is now the real first version of the child's personal-world screen.** Selecting a profile on `/children` calls `selectActiveChild(profile.id)` then navigates to `/child-home`, which resolves and renders that child's own screen (see "Active profile resolution" and the Task 6 bullets above) — it's no longer a bare placeholder. If `/child-home` is reached with no active child set (a direct visit or a reload, since the provider holds no persisted state), it redirects back to `/children` via `<Navigate replace>` rather than rendering anything. What's still temporary is only the bridge onward from here to reading practice (see "The reading-practice bridge is temporary..." below).

**Avatar rendering is centralized in one function.** `client/src/constants/childAvatars.jsx` exports `getChildAvatar(childProfile)` — the single source every avatar-consuming component calls. It currently always returns the same placeholder icon regardless of the profile, but returns a ready-to-render node rather than a component reference, so a real per-child avatar (image, SVG, URL) later only changes this function's body, not `AvatarButton` or any call site.

**Active profile resolution reuses the existing profile list, not a new endpoint.** `ChildHomePage` resolves the active child by calling the same `fetchChildProfiles()` `ChildSelectionPage` already uses, then finding the profile whose `id` matches `activeChildId`, client-side. No `GET /api/child-profiles/:id` was added — the dataset is small and already fully fetched elsewhere, so a dedicated endpoint now would be premature. An `activeChildId` that matches no fetched profile (stale/unknown id) is treated exactly like "no active child" — redirect to `/children` — rather than a separate error state.

**`ActiveChildProvider` accepts an optional `initialActiveChildId`, for tests only.** It seeds the very first render, the same way `MemoryRouter`'s `initialEntries` do — it is not a controlled prop, `selectActiveChild` is still the only way to change the value after mount, and `App.jsx` never passes it, so production behavior is unchanged. This exists because seeding the context from a wrapping test component's effect races with `ChildHomePage`'s own `<Navigate>` effect, and mutating a different component's state during another component's render is unsafe.

**Stations are numbered, not iconified, and carry no visible caption.** `StationNode` shows a plain step number inside each circle (1 = active, 2/3 = locked) instead of an icon or a caption underneath. The active station relies on the page's own greeting heading to state the action; locked stations need no "coming soon"-style caption, since reaching them is just the natural next step after the active one. Accessibility is carried entirely by composed `aria-label`s instead: the active station's button gets one (e.g. "שלב 1, התחלת תרגול קריאה"); each locked station is a non-interactive `role="group"` with its own (e.g. "שלב 2, נעול") — both built from the shared `stepLabelPrefix`/`lockedStepStatusLabel` text keys.

**`AvatarDisplay` vs `AvatarButton`: a passive display and a clickable control are different components.** `ChildHomePage` shows the active child's avatar via `AvatarDisplay` (a plain, non-interactive wrapper), not `AvatarButton` (a real `<button>`) — reusing a clickable button for something that does nothing on click would be the wrong semantics. Both share the same `AvatarCircle`/`AvatarLabel` styles from `AvatarButtonStyle.js`.

**The reading-practice bridge is temporary and explicitly scoped, not a design decision.** The active station currently just calls `navigate('/')`; `ReadingSessionPage` and its own child-selection dropdown are untouched. Wiring that page to `activeChildId` and retiring its dropdown is a known, tracked Task 6 follow-up bite — the flow should feel like a path to practice rather than a return to a form once that lands.

**The child's name and the welcome heading stay two separate elements.** `ChildHomePage` shows the name via `AvatarDisplay` (raw profile data, same as `ChildSelectionPage` already does) and a fully self-contained, gendered heading via `resolveText('childHome.heading', ...)` — never one sentence with the name interpolated into it. This avoids adding string-interpolation support to `resolveText`/`text.js`, which today only resolves plain strings or `{female,male}` variants.

**`ChildHomeGreeting` is a semantic `<h1>`, styled to look the same as before.** It was originally a styled `<p>`; `font-weight: normal` is set explicitly to counteract the browser's default bold heading weight, so only the semantic tag changed, not the visual design.

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

## Responsive & typography

- Breakpoints used across `ReadingSessionPageStyle.js` and `styles/components/*Style.js`: `768px` (no rule needed yet — the `480px`-max-width `Card` already fits comfortably), `480px`, `360px`. Each step down reduces `PageShell`/`Card`/`SectionCard` horizontal padding and bumps `Button`/`TextField`/`SelectField` padding up slightly for tap-target size.
- `AnswerPanel` (`ReadingSessionPageStyle.js`) is a flex-column, stretch-aligned wrapper — the same pattern `SelectionPanel` already used — so `QuestionStep`'s answer input and buttons stretch to the card's full width instead of shrinking to content width. Reuse this pattern for any new full-width control group; don't invent a second one.
- The reading passage (`StoryText`) uses `line-height: 2.2` specifically for pointed-Hebrew (niqqud) readability — vowel points need more vertical room than plain text. Don't reduce this without checking niqqud rendering again. `theme.js` currently defines only one font (`'Varela Round'`); a different font was deliberately not introduced since the line-height fix was sufficient.

## Component conventions

- `components/ui/*` — fully dumb, reusable, controlled components (`Button`, `TextField`, `SelectField`, `Card`, `PageShell`, `FeedbackMessage`, `AvatarButton`, `AvatarDisplay`, `StationNode`). No app/session knowledge, no text-key resolution, no hardcoded text. Matching styles live in `styles/components/*Style.js`.
- `pages/*` — page-level composition (`ReadingSessionPage`, `QuestionStep`, `ChildSelectionPage`, `ChildHomePage`) — these *do* know about the domain, own state, and call services, but delegate all HTTP calls to `services/readingSessionService.js`.
- `styles/<PageName>Style.js` — page-specific styled-components (not reused elsewhere).
- `context/*` — application-level state that must survive route navigation (currently `ActiveChildProvider`/`useActiveChild`), as opposed to page-local `useState`.

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
feature/child-home-learning-path
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
