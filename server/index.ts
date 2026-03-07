import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { storage } from "./storage";
import { authStorage } from "./replit_integrations/auth";
import bcrypt from "bcryptjs";

const app = express();
const httpServer = createServer(app);

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

async function seedNiches() {
  const SEED_NICHES = [
    { name: "personal_branding", description: "Personal branding & solopreneur content strategies" },
    { name: "real_estate", description: "Real estate creator content patterns" },
    { name: "fitness", description: "Fitness coaching short-form content" },
    { name: "Influencer / Creator Economy", description: "Content patterns for influencers and creator economy professionals." },
  ];
  for (const niche of SEED_NICHES) {
    const existing = await storage.getNicheByName(niche.name);
    if (!existing) {
      await storage.createNiche({ name: niche.name, description: niche.description, isPublic: true });
      log(`Seeded niche: ${niche.name}`);
    }
  }
}

async function seedDefaultUsers() {
  const adminEmail = "admin@craflect.com";
  const demoEmail = "demo@craflect.com";

  const existingAdmin = await authStorage.getUserByEmail(adminEmail);
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash("Admin1234!", 12);
    await authStorage.upsertUser({
      id: crypto.randomUUID(),
      email: adminEmail,
      firstName: "Admin",
      lastName: "Craflect",
      password: hashedPassword,
      emailVerified: true,
      isAdmin: true,
    });
    log(`Seeded admin user: ${adminEmail}`);
  }

  const existingDemo = await authStorage.getUserByEmail(demoEmail);
  if (!existingDemo) {
    const hashedPassword = await bcrypt.hash("Demo1234!", 12);
    await authStorage.upsertUser({
      id: crypto.randomUUID(),
      email: demoEmail,
      firstName: "Demo",
      lastName: "User",
      password: hashedPassword,
      emailVerified: true,
      isAdmin: false,
    });
    log(`Seeded demo user: ${demoEmail}`);
  }
}

(async () => {
  await registerRoutes(httpServer, app);
  await seedNiches();
  await seedDefaultUsers();

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
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
