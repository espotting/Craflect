import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { registerChatRoutes } from "./replit_integrations/chat";
import { registerImageRoutes } from "./replit_integrations/image";
import { z } from "zod";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

function isAdmin(req: any, res: any, next: any) {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
}

async function verifyWorkspaceOwnership(req: any, res: any, next: any) {
  const workspaceId = req.params.workspaceId;
  if (!workspaceId) return next();
  const ws = await storage.getWorkspaceById(workspaceId);
  if (!ws) return res.status(404).json({ message: "Workspace not found" });
  if (ws.ownerId !== req.user.id) return res.status(403).json({ message: "Forbidden" });
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  await setupAuth(app);
  registerAuthRoutes(app);
  registerChatRoutes(app);
  registerImageRoutes(app);

  // ─── Workspaces ───
  app.get("/api/workspaces", isAuthenticated, async (req: any, res) => {
    const items = await storage.getWorkspacesByOwner(req.user.id);
    res.json(items);
  });

  app.post("/api/workspaces", isAuthenticated, async (req: any, res) => {
    try {
      const input = z.object({ name: z.string().min(1) }).parse(req.body);
      const workspace = await storage.createWorkspace(req.user.id, input);
      await storage.createEvent({ userId: req.user.id, eventName: "workspace_created", metadata: { workspaceId: workspace.id } });
      res.status(201).json(workspace);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // ─── Content Sources ───
  app.get("/api/workspaces/:workspaceId/sources", isAuthenticated, verifyWorkspaceOwnership, async (req: any, res) => {
    const items = await storage.getContentSources(req.params.workspaceId);
    res.json(items);
  });

  app.post("/api/workspaces/:workspaceId/sources", isAuthenticated, verifyWorkspaceOwnership, async (req: any, res) => {
    try {
      const input = z.object({
        title: z.string().min(1),
        type: z.enum(["text", "link", "video", "audio"]),
        rawContent: z.string().optional(),
        fileUrl: z.string().optional(),
      }).parse(req.body);

      const source = await storage.createContentSource({
        ...input,
        workspaceId: req.params.workspaceId,
        status: "pending",
      });
      await storage.createEvent({ userId: req.user.id, eventName: "content_uploaded", metadata: { sourceId: source.id, type: input.type } });
      res.status(201).json(source);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // ─── AI: Generate content from a source ───
  app.post("/api/sources/:sourceId/generate", isAuthenticated, async (req: any, res) => {
    try {
      const source = await storage.getContentSourceById(req.params.sourceId);
      if (!source) return res.status(404).json({ message: "Source not found" });

      const contentText = source.rawContent || source.transcript || "";
      if (!contentText) return res.status(400).json({ message: "Source has no content to repurpose" });

      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: `You are a content repurposing expert. Given source content, generate 3 different repurposed pieces in JSON format. Return a JSON array where each item has: "format" (one of: "post", "hook", "short"), "platform" (one of: "linkedin", "instagram", "twitter"), "hookType" (a brief label for the hook style), "content" (the actual repurposed text, well-formatted and ready to publish). Make the content engaging, actionable, and platform-appropriate.`
          },
          {
            role: "user",
            content: `Repurpose this content:\n\nTitle: ${source.title}\n\nContent:\n${contentText.substring(0, 4000)}`
          }
        ],
        max_completion_tokens: 4096,
        response_format: { type: "json_object" }
      });

      const responseText = completion.choices[0]?.message?.content || "{}";
      let parsed: any;
      try {
        parsed = JSON.parse(responseText);
      } catch {
        return res.status(500).json({ message: "AI returned invalid JSON" });
      }

      const items = Array.isArray(parsed) ? parsed : (parsed.items || parsed.content || parsed.results || [parsed]);
      const created = [];
      for (const item of items) {
        if (item.content) {
          const gen = await storage.createGeneratedContent({
            sourceId: source.id,
            workspaceId: source.workspaceId,
            format: item.format || "post",
            hookType: item.hookType || null,
            content: item.content,
            platform: item.platform || null,
            status: "ready",
          });
          created.push(gen);
        }
      }

      await storage.updateContentSourceStatus(source.id, "analyzed");
      await storage.createEvent({ userId: req.user.id, eventName: "content_generated", metadata: { sourceId: source.id, count: created.length } });
      res.json(created);
    } catch (err: any) {
      console.error("Generate error:", err);
      res.status(500).json({ message: err.message || "Generation failed" });
    }
  });

  // ─── Briefs ───
  app.get("/api/workspaces/:workspaceId/briefs", isAuthenticated, verifyWorkspaceOwnership, async (req: any, res) => {
    const items = await storage.getBriefs(req.params.workspaceId);
    res.json(items);
  });

  app.post("/api/workspaces/:workspaceId/briefs/generate", isAuthenticated, verifyWorkspaceOwnership, async (req: any, res) => {
    try {
      const workspaceId = req.params.workspaceId;
      const sources = await storage.getContentSources(workspaceId);
      const sourceContext = sources.map(s => `- ${s.title}: ${(s.rawContent || s.transcript || "").substring(0, 500)}`).join("\n");

      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: `You are a content strategist. Generate a daily content brief in JSON format with: "topic" (compelling topic title), "hook" (an engaging opening hook), "script" (a short script outline, 3-5 paragraphs), "format" (recommended format: post, short, thread, carousel). The brief should be actionable, engaging, and based on the user's existing content library. Write in the same language as the source content.`
          },
          {
            role: "user",
            content: sourceContext ? `Generate a daily brief based on these sources:\n${sourceContext}` : "Generate a creative daily content brief for a content creator who is just getting started. Suggest a universal, engaging topic."
          }
        ],
        max_completion_tokens: 2048,
        response_format: { type: "json_object" }
      });

      const responseText = completion.choices[0]?.message?.content || "{}";
      let parsed: any;
      try {
        parsed = JSON.parse(responseText);
      } catch {
        return res.status(500).json({ message: "AI returned invalid JSON" });
      }

      const brief = await storage.createBrief({
        workspaceId,
        topic: parsed.topic || "Untitled Brief",
        hook: parsed.hook || "",
        script: parsed.script || "",
        format: parsed.format || "post",
        status: "active",
      });

      await storage.createEvent({ userId: req.user.id, eventName: "brief_generated", metadata: { briefId: brief.id } });
      res.status(201).json(brief);
    } catch (err: any) {
      console.error("Brief generation error:", err);
      res.status(500).json({ message: err.message || "Brief generation failed" });
    }
  });

  app.patch("/api/briefs/:briefId/status", isAuthenticated, async (req: any, res) => {
    try {
      const { status } = z.object({ status: z.enum(["active", "saved", "archived"]) }).parse(req.body);
      const updated = await storage.updateBriefStatus(req.params.briefId, status);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // ─── AI: Generate content from a brief ───
  app.post("/api/briefs/:briefId/generate", isAuthenticated, async (req: any, res) => {
    try {
      const briefId = req.params.briefId;
      const { db } = await import("./db");
      const { briefs: briefsTable } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const [brief] = await db.select().from(briefsTable).where(eq(briefsTable.id, briefId));
      if (!brief) return res.status(404).json({ message: "Brief not found" });

      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: `You are a content creator expert. Based on a content brief, generate 3 ready-to-publish content pieces in JSON format. Return a JSON array where each item has: "format" (post, hook, short), "platform" (linkedin, instagram, twitter), "hookType" (label), "content" (full text ready to publish). Write in the same language as the brief.`
          },
          {
            role: "user",
            content: `Brief:\nTopic: ${brief.topic}\nHook: ${brief.hook}\nScript: ${brief.script}\nFormat: ${brief.format}`
          }
        ],
        max_completion_tokens: 4096,
        response_format: { type: "json_object" }
      });

      const responseText = completion.choices[0]?.message?.content || "{}";
      let parsed: any;
      try { parsed = JSON.parse(responseText); } catch { return res.status(500).json({ message: "AI returned invalid JSON" }); }

      const items = Array.isArray(parsed) ? parsed : (parsed.items || parsed.content || parsed.results || [parsed]);
      const created = [];
      for (const item of items) {
        if (item.content) {
          const gen = await storage.createGeneratedContent({
            briefId,
            workspaceId: brief.workspaceId,
            format: item.format || "post",
            hookType: item.hookType || null,
            content: item.content,
            platform: item.platform || null,
            status: "ready",
          });
          created.push(gen);
        }
      }

      await storage.createEvent({ userId: req.user.id, eventName: "content_from_brief", metadata: { briefId, count: created.length } });
      res.json(created);
    } catch (err: any) {
      console.error("Brief content generation error:", err);
      res.status(500).json({ message: err.message || "Generation failed" });
    }
  });

  // ─── Generated Content ───
  app.get("/api/workspaces/:workspaceId/generated", isAuthenticated, verifyWorkspaceOwnership, async (req: any, res) => {
    const items = await storage.getGeneratedContentByWorkspace(req.params.workspaceId);
    res.json(items);
  });

  app.get("/api/sources/:sourceId/generated", isAuthenticated, async (req: any, res) => {
    const items = await storage.getGeneratedContent(req.params.sourceId);
    res.json(items);
  });

  app.patch("/api/generated-content/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const { status } = z.object({ status: z.enum(["draft", "ready", "published", "scheduled"]) }).parse(req.body);
      const updated = await storage.updateGeneratedContentStatus(req.params.id, status);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.patch("/api/generated-content/:id/schedule", isAuthenticated, async (req: any, res) => {
    try {
      const { scheduledAt } = z.object({ scheduledAt: z.string() }).parse(req.body);
      const updated = await storage.scheduleGeneratedContent(req.params.id, new Date(scheduledAt));
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // ─── Analytics ───
  app.get("/api/workspaces/:workspaceId/analytics", isAuthenticated, verifyWorkspaceOwnership, async (req: any, res) => {
    try {
      const stats = await storage.getWorkspaceStats(req.params.workspaceId);
      const perfs = await storage.getPerformanceByWorkspace(req.params.workspaceId);
      const totalViews = perfs.reduce((sum, p) => sum + p.views, 0);
      const avgEngagement = perfs.length > 0 ? perfs.reduce((sum, p) => sum + p.engagement, 0) / perfs.length : 0;
      const avgRetention = perfs.length > 0 ? perfs.reduce((sum, p) => sum + p.retention, 0) / perfs.length : 0;
      res.json({
        ...stats,
        totalViews,
        avgEngagement: Math.round(avgEngagement * 100) / 100,
        avgRetention: Math.round(avgRetention * 100) / 100,
        performanceData: perfs,
      });
    } catch (err) {
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.post("/api/performance", isAuthenticated, async (req: any, res) => {
    try {
      const input = z.object({
        generatedContentId: z.string(),
        platform: z.string(),
        views: z.number().default(0),
        engagement: z.number().default(0),
        retention: z.number().default(0),
      }).parse(req.body);
      const perf = await storage.createPerformance(input);
      res.status(201).json(perf);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // ─── Events ───
  app.post("/api/events", isAuthenticated, async (req: any, res) => {
    try {
      const input = z.object({ eventName: z.string(), metadata: z.any().optional() }).parse(req.body);
      const event = await storage.createEvent({ userId: req.user.id, eventName: input.eventName, metadata: input.metadata || {} });
      res.status(201).json(event);
    } catch (err) {
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // ─── User Profile ───
  app.patch("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const input = z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        onboardingCompleted: z.boolean().optional(),
      }).parse(req.body);
      const updated = await storage.updateUserProfile(req.user.id, input);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // ─── Admin ───
  app.get("/api/admin/stats", isAuthenticated, isAdmin, async (req: any, res) => {
    const stats = await storage.getGlobalStats();
    res.json(stats);
  });

  app.get("/api/admin/users", isAuthenticated, isAdmin, async (req: any, res) => {
    const allUsers = await storage.getAllUsers();
    res.json(allUsers);
  });

  app.get("/api/admin/events", isAuthenticated, isAdmin, async (req: any, res) => {
    const allEvents = await storage.getEvents(100);
    res.json(allEvents);
  });

  return httpServer;
}
