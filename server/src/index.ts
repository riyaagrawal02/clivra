import express, { type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import env from "./config/env";
import { connectDb } from "./config/db";
import authRoutes from "./routes/auth";
import profileRoutes from "./routes/profile";
import examsRoutes from "./routes/exams";
import subjectsRoutes from "./routes/subjects";
import topicsRoutes from "./routes/topics";
import studySessionsRoutes from "./routes/study-sessions";
import dailyProgressRoutes from "./routes/daily-progress";
import statsRoutes from "./routes/stats";
import revisionsRoutes from "./routes/revisions";
import youtubeRoutes from "./routes/youtube";
import scheduleRoutes from "./routes/schedule";

const app = express();

app.set("trust proxy", env.NODE_ENV === "production");

app.use(helmet());
app.use(compression());
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

app.use(
  cors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin || env.ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
  }),
);
app.use(express.json({ limit: "1mb" }));

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: env.NODE_ENV === "production" ? 300 : 1000,
});

app.use("/api", apiLimiter);

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/exams", examsRoutes);
app.use("/api/subjects", subjectsRoutes);
app.use("/api/topics", topicsRoutes);
app.use("/api/study-sessions", studySessionsRoutes);
app.use("/api/daily-progress", dailyProgressRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/revisions", revisionsRoutes);
app.use("/api/youtube", youtubeRoutes);
app.use("/api/schedule", scheduleRoutes);

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    void _next;
    console.error(err);
    const status =
      (err as { status?: number }).status ??
      (err.message.includes("CORS") ? 403 : 500);
    const message =
      env.NODE_ENV === "production" ? "Server error" : err.message;
    res.status(status).json({ error: message });
  },
);

connectDb()
  .then(() => {
    app.listen(env.PORT, () => {
      console.log(`API listening on port ${env.PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start server", error);
    process.exit(1);
  });
