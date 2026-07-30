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
- A reading-session preview endpoint
- A basic flow for selecting a child and requesting a reading exercise
- Loading and error states
- Reusable UI components
- Automated client and server tests
- Client and server linting
- GitHub Actions CI checks

Reading passages and comprehension questions are generated through a pluggable LLM provider, selected via configuration:

- `mock` (default) — deterministic, no external calls; used for local development and by every automated test
- `gemini` — real generation via the Google Gemini API, enabled locally with environment variables (see "LLM Provider Configuration" below)

Persistent child profiles and a database are not yet part of the project.

## Project Structure

- `client/` — React application built with Vite
- `server/` — Express API using CommonJS
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

Create a local environment file before starting the server:

```bash
cd server
cp .env.example .env
npm run dev
```

The server runs locally on:

```text
http://localhost:7000
```

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

## Run Client Tests

Automated client tests use Vitest and React Testing Library.

```bash
cd client
npm test
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