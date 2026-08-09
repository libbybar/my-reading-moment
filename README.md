# רק רגע לקרוא

## My Reading Moment

## Description

My Reading Moment is a parent-facing application for creating short, personalized Hebrew reading exercises for children.

The project is designed to support focused reading practice through simple exercises that can be adapted to each child's reading level and interests.

## Naming conventions

Use intention-revealing names, following the Clean Code principle that names should explain what the code does without requiring the reader to inspect the implementation.

Prefer names that describe:

- the responsibility of a function
- the meaning of a value
- the state or transition being represented
- the domain concept, rather than the technical mechanism

Use short names only when the meaning is obvious from a very small local scope.


## Current Status

The project currently includes:

- A React client built with Vite
- An Express API
- Parent registration and login (`POST /api/auth/register`, `POST /api/auth/login`), issuing a JWT stored in an httpOnly cookie
- Child profile management per parent account: add, edit, and select a child profile
- A reading-session preview endpoint
- A basic flow for selecting a child and requesting a reading exercise
- Adaptive reading practice: each child has a `currentLevel`/`currentSublevel` (16 rungs total) that a server-owned Progression engine advances or lowers based on the outcome of recent texts
- Per-child journey progress (a motivational, uncapped station path — separate from the reading-level Progression above) and a durable, canonical record of each completed text, persisted in MongoDB
- Loading and error states
- Reusable UI components
- Automated client and server tests
- Client and server linting
- GitHub Actions CI checks
- Docker support for a local, production-style build and run (see "Run with Docker" below)

Reading passages and comprehension questions are generated through a pluggable LLM provider, selected via configuration:

- `mock` (default) — deterministic, no external calls; used for local development and by every automated test
- `gemini` — real generation via the Google Gemini API, enabled locally with environment variables (see "LLM Provider Configuration" below)

MongoDB persistence covers parent accounts, their child profiles (including `learningProfile.currentLevel`/`currentSublevel` and `journeyProgress`), a raw per-answer event log (`learningEvents`), and — in its own collection — a `TextResult` per completed text: the canonical, durable outcome (`success`/`failure`/`skipped`) that the Progression engine reads back to decide whether a child's reading level should change. None of this is mocked/in-memory. The reading passage/question content itself is not stored — it's generated fresh per request by the LLM provider (mock or Gemini) — and the in-progress reading session (current question, asked-question history, attempt count) lives in a short-lived, single-process in-memory store, not MongoDB. Finishing a text (a correct/final-incorrect answer, or an explicit skip) is one real MongoDB transaction spanning the learning-history write, the canonical result, and the derived progress fields — never a partial update.

## Project Structure

- `client/` — React application built with Vite
- `server/` — Express API using ES modules (ESM)
- `.github/workflows/` — GitHub Actions CI configuration

## Prerequisites

The project was developed and tested with:

- Node.js 24
- npm 11

## Install Client Dependencies

```bash
cd client
npm install
```

## Install Server Dependencies

```bash
cd server
npm install
```

## Run the Client

```bash
cd client
npm run dev
```

The client runs locally on:

```text
http://localhost:5173
```

## Run the Server

Create a local environment file before starting the server, and set `MONGODB_URI` in `server/.env` to a running MongoDB instance — the server connects to it on startup and won't start without it. Also set `JWT_SECRET` to a real random value — it signs/verifies the parent auth cookie, and must never be a committed or shared value:

```bash
cd server
cp .env.example .env
npm run dev
```

The server runs locally on:

```text
http://localhost:7000
```

## Run with Docker

An alternative, production-style way to build and run the whole application in containers. This does not replace the npm-based development workflow above — use it when you want to build/run the app the way it would actually be deployed, not for day-to-day development.

Prerequisites: Docker Engine with the Compose plugin, and `server/.env` already created (same as "Run the Server" above) with a real `MONGODB_URI`. Compose does not run its own MongoDB container — `MONGODB_URI` must point to your existing Atlas (or other remote) MongoDB instance, the same one used by local development. A `localhost`-based `MONGODB_URI` will not work here: inside the server container, `localhost` refers to the container itself, not your machine. Running MongoDB locally in a container is intentionally out of scope for this project.

```bash
docker compose up --build
```

The client is served by nginx and reachable at:

```text
http://localhost:8080
```

nginx serves the built client and reverse-proxies `/api` requests to the server container over the internal Compose network; the server's own port is not published to the host, so it's only reachable through the client.

This is a local Dockerized build/runtime setup, not a hardened production deployment — there's no TLS. `NODE_ENV` is deliberately left unset inside the server container, because the auth cookie's `secure` flag (`secure: NODE_ENV === "production"` in `authRoutes.js`) would otherwise stop the browser from storing it over plain HTTP.

## LLM Provider Configuration

Reading content generation is configured through `server/.env` (created above from `.env.example`):

- `LLM_PROVIDER` — `mock` (default, no external calls) or `gemini` (real generation via the Google Gemini API)
- `GEMINI_API_KEY` — required only when `LLM_PROVIDER=gemini`; set it locally in `server/.env` and never commit it
- `GEMINI_MODEL` — optional; defaults to a current Gemini model if unset
- `TIMING_LOG_ENABLED` — optional; set to `true` to write local JSON Lines debug/timing logs to `server/logs/`

`server/.env` and `server/logs/` are both git-ignored.

Automated tests never call the real Gemini API — they run against the mock provider, or against a stubbed Gemini client.

## Run Server Tests

Automated server tests use Jest and Supertest.

```bash
cd server
npm test
```

## Run Server Coverage

```bash
cd server
npm run test:coverage
```

## Run Client Tests

Automated client tests use Vitest and React Testing Library.

```bash
cd client
npm test
```

## Run Client Coverage

```bash
cd client
npm run test:coverage
```

## Run Server Lint

```bash
cd server
npm run lint
```

## Run Client Lint

```bash
cd client
npm run lint
```

## Build the Client

```bash
cd client
npm run build
```
