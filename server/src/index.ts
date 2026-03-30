import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes.js";
import clientsRoutes from "./routes/clients.routes.js";
import projectsRoutes from "./routes/projects.routes.js";
import tasksRoutes from "./routes/tasks.routes.js";
import timeEntriesRoutes from "./routes/time-entries.routes.js";
import invoicesRoutes from "./routes/invoices.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.set("trust proxy", 1);
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Rate limiting:
// - In production: schützt gegen Brute-Force / Spam
// - In development: deaktiviert, damit du beim Testen nicht dauernd 429 bekommst
if (process.env.NODE_ENV === "production") {
  // Strenger Limiter für Auth-Routen (Brute-Force-Schutz)
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Zu viele Versuche, bitte später erneut versuchen." },
  });

  // Lockerer Limiter für alle anderen API-Routen
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 500,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  });

  app.use("/api/auth", authLimiter);
  app.use("/api", apiLimiter);
}

app.use("/api/auth", authRoutes);
app.use("/api/clients", clientsRoutes);
app.use("/api/projects", projectsRoutes);
app.use("/api/tasks", tasksRoutes);
app.use("/api/time-entries", timeEntriesRoutes);
app.use("/api/invoices", invoicesRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
