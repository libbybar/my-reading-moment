# רק רגע לקרוא

## My Reading Moment

## Description

My Reading Moment is a parent-facing application for creating short, personalized Hebrew reading exercises for children.

The project is designed to support focused reading practice through simple exercises that can be adapted to each child's reading level and interests.

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

The reading exercise content is currently based on mock data. Dynamic exercise generation and persistent child profiles will be added in later stages.

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