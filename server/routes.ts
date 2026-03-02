import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { registerChatRoutes } from "./replit_integrations/chat";
import { registerImageRoutes } from "./replit_integrations/image";
import { z } from "zod";
import OpenAI from "openai";
import { scrapePublicMetadata, detectPlatform, extractCreatorHandle } from "./utils/scraper";
import { ingestVideoForNiche } from "./intelligence/ingestion-pipeline";
import { updateNichePatterns, updateNicheStatistics } from "./intelligence/pattern-aggregator";
import { generateNicheProfile } from "./intelligence/profile-generator";

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
        type: z.enum(["text", "link", "video", "audio", "url"]),
        rawContent: z.string().optional(),
        fileUrl: z.string().optional(),
        url: z.string().optional(),
      }).parse(req.body);

      const platform = input.url ? detectPlatform(input.url) : undefined;
      const creatorHandle = input.url ? extractCreatorHandle(input.url) : undefined;

      const source = await storage.createContentSource({
        ...input,
        workspaceId: req.params.workspaceId,
        status: "pending",
        platform: platform || null,
        creatorHandle: creatorHandle || null,
        ingestionStatus: "pending",
      });
      await storage.createEvent({ userId: req.user.id, eventName: "content_ingested", metadata: { sourceId: source.id, type: input.type, platform } });
      res.status(201).json(source);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // ─── URL Ingestion (batch) ───
  app.post("/api/workspaces/:workspaceId/sources/ingest", isAuthenticated, verifyWorkspaceOwnership, async (req: any, res) => {
    try {
      const input = z.object({
        urls: z.array(z.string().url()).min(1, "At least one URL is required"),
      }).parse(req.body);

      const created = [];
      for (const url of input.urls) {
        const platform = detectPlatform(url);
        const creatorHandle = extractCreatorHandle(url);
        const source = await storage.createContentSource({
          workspaceId: req.params.workspaceId,
          type: "url",
          title: `${platform} content from ${creatorHandle || "unknown"}`,
          url,
          platform,
          creatorHandle,
          status: "pending",
          ingestionStatus: "pending",
        });
        created.push(source);
      }

      await storage.createEvent({ userId: req.user.id, eventName: "urls_ingested", metadata: { count: created.length } });
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // ─── AI: Analyze content source (feature extraction) ───
  app.post("/api/sources/:sourceId/analyze", isAuthenticated, async (req: any, res) => {
    try {
      const source = await storage.getContentSourceById(req.params.sourceId);
      if (!source) return res.status(404).json({ message: "Source not found" });

      await storage.updateContentSource(source.id, { ingestionStatus: "processing" });

      const scrapedMeta = source.url ? await scrapePublicMetadata(source.url) : {};
      console.log(`Scraped metadata for ${source.url}:`, Object.keys(scrapedMeta).filter(k => (scrapedMeta as any)[k] !== undefined).join(", ") || "none");

      const metadataUpdate: any = {};
      if (scrapedMeta.views !== undefined) metadataUpdate.views = scrapedMeta.views;
      if (scrapedMeta.likes !== undefined) metadataUpdate.likes = scrapedMeta.likes;
      if (scrapedMeta.commentsCount !== undefined) metadataUpdate.commentsCount = scrapedMeta.commentsCount;
      if (scrapedMeta.duration !== undefined) metadataUpdate.duration = scrapedMeta.duration;
      if (scrapedMeta.thumbnailUrl) metadataUpdate.thumbnailUrl = scrapedMeta.thumbnailUrl;
      if (scrapedMeta.publishedAt) metadataUpdate.publishedAt = scrapedMeta.publishedAt;
      if (scrapedMeta.creatorHandle && !source.creatorHandle) metadataUpdate.creatorHandle = scrapedMeta.creatorHandle;

      if (Object.keys(metadataUpdate).length > 0) {
        await storage.updateContentSource(source.id, metadataUpdate);
      }

      const contextParts = [];
      if (source.url) contextParts.push(`URL: ${source.url}`);
      if (source.platform) contextParts.push(`Platform: ${source.platform}`);
      if (source.creatorHandle || scrapedMeta.creatorHandle) contextParts.push(`Creator: @${source.creatorHandle || scrapedMeta.creatorHandle}`);
      if (scrapedMeta.title) contextParts.push(`Page title: ${scrapedMeta.title}`);
      if (scrapedMeta.description) contextParts.push(`Page description: ${scrapedMeta.description}`);
      if (scrapedMeta.views) contextParts.push(`Real views: ${scrapedMeta.views}`);
      if (scrapedMeta.likes) contextParts.push(`Real likes: ${scrapedMeta.likes}`);
      if (scrapedMeta.duration) contextParts.push(`Duration: ${scrapedMeta.duration}s`);
      if (source.rawContent) contextParts.push(`Content: ${source.rawContent.substring(0, 3000)}`);
      if (source.transcript) contextParts.push(`Transcript: ${source.transcript.substring(0, 3000)}`);
      if (source.title && !scrapedMeta.title) contextParts.push(`Title: ${source.title}`);

      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: `You are a content performance analyst specializing in short-form video content (TikTok, Instagram Reels, YouTube Shorts). Analyze the given content and extract performance pattern features.

IMPORTANT: Focus ONLY on pattern analysis. Do NOT estimate or simulate metrics (views, likes, comments, duration). Those are retrieved separately from real data.

Return a JSON object with these exact fields:
- "title": a descriptive title for this content (string)
- "hookType": the type of hook used (one of: "question", "statement", "shock", "story", "statistic", "challenge", "tutorial", "behind_the_scenes", "controversy", "listicle")
- "narrativeStructure": the narrative structure (one of: "storytelling", "list", "tutorial", "vlog", "review", "comparison", "transformation", "day_in_life", "tips", "reaction")
- "contentAngle": the content angle (one of: "educational", "entertainment", "inspirational", "controversial", "personal", "news", "how_to", "motivational")
- "contentFormat": the visual format (one of: "face_cam", "b_roll", "text_overlay", "screencast", "animation", "mixed", "voiceover", "interview", "montage")
- "nicheCategory": the niche category (string, e.g. "fitness", "tech", "cooking", "finance", "lifestyle")
- "performanceScore": content quality score 0-100 based ONLY on structural signals (hook strength, narrative clarity, format effectiveness). If real metrics are provided, factor them in.
- "description": a brief description of the content and why the patterns work (string)
- "hashtags": relevant hashtags for this content (array of strings, without #)

Be analytical. Score based on content structure quality, not estimated popularity.`
          },
          {
            role: "user",
            content: `Analyze this content:\n${contextParts.join("\n")}`
          }
        ],
        max_completion_tokens: 2048,
        response_format: { type: "json_object" }
      });

      const responseText = completion.choices[0]?.message?.content || "{}";
      let parsed: any;
      try { parsed = JSON.parse(responseText); } catch { 
        await storage.updateContentSource(source.id, { ingestionStatus: "failed", ingestionError: "AI returned invalid JSON" });
        return res.status(500).json({ message: "AI returned invalid JSON" }); 
      }

      const updated = await storage.updateContentSource(source.id, {
        title: scrapedMeta.title || parsed.title || source.title,
        hookType: parsed.hookType || null,
        narrativeStructure: parsed.narrativeStructure || null,
        contentAngle: parsed.contentAngle || null,
        contentFormat: parsed.contentFormat || null,
        nicheCategory: parsed.nicheCategory || null,
        performanceScore: parsed.performanceScore || null,
        description: scrapedMeta.description || parsed.description || null,
        hashtags: parsed.hashtags || null,
        ingestionStatus: "analyzed",
        status: "analyzed",
      });

      await storage.createEvent({ userId: req.user.id, eventName: "content_analyzed", metadata: { sourceId: source.id, performanceScore: parsed.performanceScore, metricsAvailable: Object.keys(metadataUpdate).length > 0 } });
      res.json(updated);
    } catch (err: any) {
      console.error("Analysis error:", err);
      await storage.updateContentSource(req.params.sourceId, { ingestionStatus: "failed", ingestionError: err.message });
      res.status(500).json({ message: err.message || "Analysis failed" });
    }
  });

  // ─── AI: Generate content from a source (repurpose based on analysis) ───
  app.post("/api/sources/:sourceId/generate", isAuthenticated, async (req: any, res) => {
    try {
      const source = await storage.getContentSourceById(req.params.sourceId);
      if (!source) return res.status(404).json({ message: "Source not found" });

      const contextParts = [];
      if (source.title) contextParts.push(`Title: ${source.title}`);
      if (source.hookType) contextParts.push(`Hook type: ${source.hookType}`);
      if (source.narrativeStructure) contextParts.push(`Narrative: ${source.narrativeStructure}`);
      if (source.contentAngle) contextParts.push(`Angle: ${source.contentAngle}`);
      if (source.contentFormat) contextParts.push(`Format: ${source.contentFormat}`);
      if (source.performanceScore) contextParts.push(`Performance score: ${source.performanceScore}/100`);
      if (source.rawContent) contextParts.push(`Content: ${source.rawContent.substring(0, 3000)}`);
      if (source.transcript) contextParts.push(`Transcript: ${source.transcript.substring(0, 3000)}`);
      if (source.description) contextParts.push(`Description: ${source.description}`);

      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: `You are a content performance strategist. Based on analyzed content and its performance patterns, generate 3 optimized content pieces that reproduce the winning patterns found.

Return a JSON object with a "items" array where each item has:
- "format" (one of: "post", "hook", "short", "script", "thread")
- "platform" (one of: "tiktok", "instagram", "linkedin", "twitter", "youtube")
- "hookType" (the hook style used)
- "content" (the full text, ready to use — script, post text, or hook)

The content should reproduce the winning patterns (hook type, structure, angle) from the analyzed source but with fresh, original content. Write in the same language as the source.`
          },
          {
            role: "user",
            content: `Generate optimized content based on this analyzed source:\n${contextParts.join("\n")}`
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

  // ─── Performance Insights (replaces Briefs) ───
  app.get("/api/workspaces/:workspaceId/briefs", isAuthenticated, verifyWorkspaceOwnership, async (req: any, res) => {
    const items = await storage.getBriefs(req.params.workspaceId);
    res.json(items);
  });

  app.post("/api/workspaces/:workspaceId/briefs/generate", isAuthenticated, verifyWorkspaceOwnership, async (req: any, res) => {
    try {
      const workspaceId = req.params.workspaceId;
      const sources = await storage.getContentSources(workspaceId);
      
      const analyzedSources = sources.filter(s => s.ingestionStatus === "analyzed" || s.hookType || s.performanceScore);
      
      const sourceContext = sources.map(s => {
        const parts = [`- ${s.title}`];
        if (s.platform) parts.push(`  Platform: ${s.platform}`);
        if (s.hookType) parts.push(`  Hook: ${s.hookType}`);
        if (s.narrativeStructure) parts.push(`  Structure: ${s.narrativeStructure}`);
        if (s.contentAngle) parts.push(`  Angle: ${s.contentAngle}`);
        if (s.contentFormat) parts.push(`  Format: ${s.contentFormat}`);
        if (s.performanceScore) parts.push(`  Score: ${s.performanceScore}/100`);
        if (s.views) parts.push(`  Views: ${s.views}`);
        if (s.nicheCategory) parts.push(`  Niche: ${s.nicheCategory}`);
        if (s.rawContent) parts.push(`  Content preview: ${s.rawContent.substring(0, 300)}`);
        return parts.join("\n");
      }).join("\n\n");

      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: `You are a content performance intelligence analyst. Analyze the user's content library to identify winning patterns and generate actionable insights.

Return a JSON object with:
- "topic": a compelling title for this insight report (string)
- "hook": the key finding / headline insight (string, 1-2 sentences)
- "script": detailed analysis with specific patterns found (string, 3-5 paragraphs covering: top performing patterns, hook analysis, format recommendations, content angle insights, timing suggestions)
- "format": the dominant recommended format (string)
- "insights": a JSON string containing an object with:
  - "topHooks": array of {type, score, description} for the best performing hook styles
  - "winningFormats": array of {format, percentage, description}
  - "contentAngles": array of {angle, performance, description}
  - "nichePatterns": array of {pattern, frequency, impact}
- "recommendations": a JSON string containing an array of {action, reason, priority} objects

If no analyzed sources exist, provide general niche recommendations based on any available context. Be specific and data-driven.`
          },
          {
            role: "user",
            content: analyzedSources.length > 0 
              ? `Generate performance insights based on these ${analyzedSources.length} analyzed contents:\n\n${sourceContext}` 
              : sources.length > 0
              ? `Generate initial insights based on these sources (not yet fully analyzed):\n\n${sourceContext}`
              : "Generate starter insights for a content creator who is just beginning. Provide general best practices for short-form video content."
          }
        ],
        max_completion_tokens: 3000,
        response_format: { type: "json_object" }
      });

      const responseText = completion.choices[0]?.message?.content || "{}";
      let parsed: any;
      try { parsed = JSON.parse(responseText); } catch { return res.status(500).json({ message: "AI returned invalid JSON" }); }

      const brief = await storage.createBrief({
        workspaceId,
        topic: parsed.topic || "Performance Insights",
        hook: parsed.hook || "",
        script: parsed.script || "",
        format: parsed.format || "insight",
        status: "active",
        insights: typeof parsed.insights === "string" ? parsed.insights : JSON.stringify(parsed.insights || {}),
        recommendations: typeof parsed.recommendations === "string" ? parsed.recommendations : JSON.stringify(parsed.recommendations || []),
      });

      await storage.createEvent({ userId: req.user.id, eventName: "insights_generated", metadata: { briefId: brief.id, sourcesAnalyzed: analyzedSources.length } });
      res.status(201).json(brief);
    } catch (err: any) {
      console.error("Insights generation error:", err);
      res.status(500).json({ message: err.message || "Insights generation failed" });
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

  // ─── AI: Generate recommended content from insights ───
  app.post("/api/briefs/:briefId/generate", isAuthenticated, async (req: any, res) => {
    try {
      const briefId = req.params.briefId;
      const { db } = await import("./db");
      const { briefs: briefsTable } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const [brief] = await db.select().from(briefsTable).where(eq(briefsTable.id, briefId));
      if (!brief) return res.status(404).json({ message: "Insight report not found" });

      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: `You are a content strategist. Based on performance insights and recommendations, generate 3 optimized content pieces that follow the winning patterns identified.

Return a JSON object with an "items" array where each item has:
- "format" (post, hook, short, script, thread)
- "platform" (tiktok, instagram, linkedin, twitter, youtube)  
- "hookType" (the hook style used, based on the top performing hooks from insights)
- "content" (full text ready to publish — incorporate the winning patterns, hooks, and structures identified in the insights)

The content should directly apply the recommendations from the insight report. Write in the same language as the insights.`
          },
          {
            role: "user",
            content: `Generate recommended content based on these insights:\n\nTopic: ${brief.topic}\nKey Finding: ${brief.hook}\nAnalysis: ${brief.script}\nRecommended Format: ${brief.format}\n${brief.insights ? `\nInsights: ${brief.insights}` : ""}${brief.recommendations ? `\nRecommendations: ${brief.recommendations}` : ""}`
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

      await storage.createEvent({ userId: req.user.id, eventName: "content_from_insights", metadata: { briefId, count: created.length } });
      res.json(created);
    } catch (err: any) {
      console.error("Insight content generation error:", err);
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

  // ─── Subscription / Plan ───
  app.get("/api/subscription", isAuthenticated, async (req: any, res) => {
    try {
      const sub = await storage.getOrCreateSubscription(req.user.id);
      res.json(sub);
    } catch (err) {
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
      const { password: _, ...safeUser } = updated as any;
      res.json(safeUser);
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
    res.json(allUsers.map((u: any) => { const { password: _, ...safe } = u; return safe; }));
  });

  app.get("/api/admin/events", isAuthenticated, isAdmin, async (req: any, res) => {
    const allEvents = await storage.getEvents(100);
    res.json(allEvents);
  });

  // ─── Intelligence Layer ───

  app.get("/api/intelligence/niches", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const items = await storage.getNiches();
      const enriched = await Promise.all(items.map(async (n) => ({
        ...n,
        videoCount: await storage.getVideoPrimitiveCount(n.id),
      })));
      res.json(enriched);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/intelligence/niches", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { name, description } = req.body;
      if (!name) return res.status(400).json({ message: "Name is required" });
      const niche = await storage.createNiche({ name, description: description || null });
      res.json(niche);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/intelligence/niches/:nicheId", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { nicheId } = req.params;
      const niche = await storage.getNicheById(nicheId);
      if (!niche) return res.status(404).json({ message: "Niche not found" });
      const [patterns, statistics, profile, videoCount] = await Promise.all([
        storage.getNichePatterns(nicheId),
        storage.getNicheStatistics(nicheId),
        storage.getNicheProfile(nicheId),
        storage.getVideoPrimitiveCount(nicheId),
      ]);
      res.json({ niche, patterns, statistics, profile, videoCount });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/intelligence/niches/:nicheId/ingest", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { nicheId } = req.params;
      const { url } = req.body;
      if (!url) return res.status(400).json({ message: "URL is required" });
      const primitive = await ingestVideoForNiche(url, nicheId);
      res.json(primitive);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/intelligence/niches/:nicheId/primitives", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const primitives = await storage.getVideoPrimitivesByNiche(req.params.nicheId);
      res.json(primitives);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/intelligence/niches/:nicheId/patterns", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const patterns = await storage.getNichePatterns(req.params.nicheId);
      res.json(patterns || {});
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/intelligence/niches/:nicheId/statistics", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const stats = await storage.getNicheStatistics(req.params.nicheId);
      res.json(stats || {});
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/intelligence/niches/:nicheId/profile", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const profile = await storage.getNicheProfile(req.params.nicheId);
      res.json(profile || {});
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/intelligence/niches/:nicheId/profile/generate", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const profile = await generateNicheProfile(req.params.nicheId);
      res.json(profile);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  return httpServer;
}
