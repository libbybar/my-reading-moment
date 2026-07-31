import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";

import healthRoutes from "./routes/healthRoutes.js";
import readingSessionRoutes from "./routes/readingSessionRoutes.js";
import childProfileRoutes from "./routes/childProfileRoutes.js";
import authRoutes from "./routes/authRoutes.js";

const app = express();

app.use(helmet());
// `credentials: true` + an explicit origin (not the default wildcard) are
// both required for the browser to send/store the HttpOnly auth cookie —
// credentialed requests are rejected outright against a wildcard origin.
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

app.use("/api/health", healthRoutes);
app.use("/api/reading-sessions", readingSessionRoutes);
app.use("/api/child-profiles", childProfileRoutes);
app.use("/api/auth", authRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
  });
});

export default app;
