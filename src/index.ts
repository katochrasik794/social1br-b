import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import routes from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { testConnection } from "./lib/db.js";

const app = express();

app.use(helmet({
  contentSecurityPolicy: env.NODE_ENV === "production",
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use(express.json({ limit: "32kb" }));

app.use("/api", routes);

app.use(errorHandler);

async function start() {
  try {
    await testConnection();
    console.log("[db] Connected to PostgreSQL");
  } catch (err) {
    console.error("[db] Connection failed:", err);
    process.exit(1);
  }

  app.listen(env.PORT, () => {
    console.log(`[server] Running on http://localhost:${env.PORT}`);
  });
}

start();

export default app;
