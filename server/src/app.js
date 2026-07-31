import express from "express";
import cors from "cors";
import helmet from "helmet";

import healthRoutes from "./routes/healthRoutes.js";
import readingSessionRoutes from "./routes/readingSessionRoutes.js";
import childProfileRoutes from "./routes/childProfileRoutes.js";
import authRoutes from "./routes/authRoutes.js";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

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
