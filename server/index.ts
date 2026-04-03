import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { ensureTables } from "./migrate";
import { migrateAvatar } from "./migrate-avatar";
import { backfillAvatarTags } from "./avatar-routes";
import { ensureAgentMemoryTable } from "./agent-memory";
import { initializeDefaultSubscriptions } from "./event-bus";
import { pruneExpiredMemories } from "./agent-memory";
import { startTelegramBot } from "./telegram-bot";
import { startDiscordBot } from "./discord-bot";
import { initZhihuiTiBridge } from "./zhihuiti-bridge";
import { runSleepTokenCycle } from "./smart-engine";

const app = express();
app.set("trust proxy", 1);
const httpServer = createServer(app);

// Security headers (inline — avoids helmet ESBuild bundling issues)
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "0");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-DNS-Prefetch-Control", "off");
  res.setHeader("X-Download-Options", "noopen");
  res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
  next();
});

// CORS (inline — avoids cors package ESBuild bundling issues)
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  const allowed = process.env.ALLOWED_ORIGINS?.split(",").map(s => s.trim());
  if (!allowed || (origin && allowed.includes(origin))) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-API-Key,X-Admin-Secret");
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Create database tables if they don't exist
  await ensureTables();
  await migrateAvatar();
  await ensureAgentMemoryTable();
  await backfillAvatarTags().then(r => r.updated > 0 && log(`Backfilled tags for ${r.updated} avatars`)).catch(err => console.error("[startup] Avatar tag backfill failed:", err));

  // Initialize event bus subscriptions for cross-agent collaboration
  initializeDefaultSubscriptions();
  log("Agent event bus initialized", "event-bus");

  // Periodic cleanup of expired agent memories (every 6 hours)
  const MEMORY_PRUNE_INTERVAL_MS = 6 * 3600_000; // 6 hours
  setInterval(() => pruneExpiredMemories().catch(err => console.error("[memory] Prune expired memories failed:", err)), MEMORY_PRUNE_INTERVAL_MS);

  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10) || 5000;
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);

      // Start chat bots after server is listening (fire-and-forget)
      startTelegramBot().catch(err => log(`Telegram bot failed to start: ${err.message}`, "telegram"));
      startDiscordBot().catch(err => log(`Discord bot failed to start: ${err.message}`, "discord"));

      // Initialize zhihuiti multi-agent bridge
      initZhihuiTiBridge().catch(err => log(`zhihuiti bridge: ${err.message}`, "zhihuiti"));

      // Sleep Tokens: autonomous value creation (runs every 4 hours)
      (async () => {
        try {
          const { storage: st } = await import("./storage");
          let bot = await st.getUserByUsername("agent_GuanXing-Bot");
          if (bot) {
            // First run after 10 min warmup, then every 4 hours
            setTimeout(() => {
              runSleepTokenCycle(bot!.id).catch(err => log(`sleep-tokens: ${err.message}`, "smart-engine"));
              setInterval(() => {
                runSleepTokenCycle(bot!.id).catch(err => log(`sleep-tokens: ${err.message}`, "smart-engine"));
              }, 4 * 60 * 60_000).unref();
            }, 10 * 60_000);
            log("Sleep token engine scheduled (every 4h)", "smart-engine");
          }
        } catch (err) {
          log(`sleep-tokens init: ${(err as any).message}`, "smart-engine");
        }
      })();
    },
  );
})();
