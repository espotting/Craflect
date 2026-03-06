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
import { computeNicheScoring } from "./intelligence/scoring";
import { computeWorkspaceIntelligence, updateWorkspaceIntelligence } from "./intelligence/workspace-scoring";
import { computePatterns, isPatternEngineReady, computeAndStorePatterns } from "./intelligence/pattern-engine";
import { isPatternEngineV1Ready, computePatternsV1, computeAndStorePatternsV1 } from "./intelligence/pattern-engine-v1";
import { stripe, getOrCreateStripeCustomer, createCheckoutSession, createBillingPortalSession, getCustomerInvoices, ensureStripePrices, PLANS, listPaymentMethods, createSetupIntent, detachPaymentMethod, setDefaultPaymentMethod } from "./stripe";
import {
  VP_HOOK_TYPES, STRUCTURE_MODELS, ANGLE_CATEGORIES, FORMAT_TYPES,
  HOOK_MECHANISMS, HOOK_FORMATS, EMOTIONAL_TRIGGERS, CONTENT_STRUCTURES,
  CONTENT_FORMATS, VISUAL_STYLES, STORYTELLING_PRESENCES, CONTENT_PACES,
  CREATOR_ARCHETYPES, TOPIC_CATEGORIES, CTA_TYPES, CONTROVERSY_LEVELS,
  INFORMATION_DENSITIES, DURATION_BUCKETS, HOOK_TOPICS, CONTENT_GOALS,
  HOOK_TYPES, STRUCTURE_TYPES, EMOTION_VALUES,
  normalizeTopicCluster, deriveHookMechanismPrimary,
} from "@shared/schema";

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
      const input = z.object({ name: z.string().min(1), nicheId: z.string().min(1, "A niche must be selected") }).parse(req.body);
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
    const nicheId = req.query.nicheId as string | undefined;
    const ws = await storage.getWorkspaceById(req.params.workspaceId);
    const effectiveNicheId = nicheId || ws?.nicheId || undefined;
    const items = await storage.getContentSources(req.params.workspaceId, effectiveNicheId);
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

      const ws = await storage.getWorkspaceById(req.params.workspaceId);
      const source = await storage.createContentSource({
        ...input,
        workspaceId: req.params.workspaceId,
        nicheId: ws?.nicheId || null,
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

      const ws = await storage.getWorkspaceById(req.params.workspaceId);
      const created = [];
      for (const url of input.urls) {
        const platform = detectPlatform(url);
        const creatorHandle = extractCreatorHandle(url);
        const source = await storage.createContentSource({
          workspaceId: req.params.workspaceId,
          nicheId: ws?.nicheId || null,
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

      const ws = await storage.getWorkspaceById(source.workspaceId);
      if (!ws || ws.ownerId !== req.user.id) return res.status(403).json({ message: "Forbidden" });

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
        nicheId: ws?.nicheId || source.nicheId || null,
        ingestionStatus: "analyzed",
        status: "analyzed",
      });

      if (ws.nicheId && (parsed.hookType || parsed.narrativeStructure || parsed.contentAngle || parsed.contentFormat)) {
        try {
          const mapHook = (v: string): string => {
            const map: Record<string, string> = { question: "Question", statement: "Direct_Statement", shock: "Shock", story: "Story_Start", statistic: "Statistic", challenge: "Bold_Claim", tutorial: "Tutorial_Intro", behind_the_scenes: "Relatable", controversy: "Controversial", listicle: "Direct_Statement" };
            return map[v?.toLowerCase()] || "Direct_Statement";
          };
          const mapStructure = (v: string): string => {
            const map: Record<string, string> = { storytelling: "Story_Lesson", list: "List_Format", tutorial: "Tutorial_Step", vlog: "Hook_Value_CTA", review: "Authority_Breakdown", comparison: "Before_After_Transformation", transformation: "Before_After_Transformation", day_in_life: "Emotional_Arc", tips: "Quick_Tip", reaction: "Hook_Value_CTA" };
            return map[v?.toLowerCase()] || "Quick_Tip";
          };
          const mapAngle = (v: string): string => {
            const map: Record<string, string> = { educational: "Educational", entertainment: "Relatable", inspirational: "Inspirational", controversial: "Controversial", personal: "Emotional", news: "Analytical", how_to: "Tactical", motivational: "Aspirational" };
            return map[v?.toLowerCase()] || "Educational";
          };
          const mapFormat = (v: string): string => {
            const map: Record<string, string> = { face_cam: "Talking_Head", b_roll: "B_Roll_Voiceover", text_overlay: "Text_Overlay", screencast: "Text_Overlay", animation: "Montage", mixed: "Mixed_Format", voiceover: "B_Roll_Voiceover", interview: "Interview", montage: "Montage" };
            return map[v?.toLowerCase()] || "Mixed_Format";
          };

          const creatorHandle = source.creatorHandle || scrapedMeta.creatorHandle || "unknown";
          const platform = source.platform || detectPlatform(source.url || "") || "unknown";

          let creator = await storage.getCreatorByUsername(platform, creatorHandle);
          if (!creator) {
            creator = await storage.createCreator({ nicheId: ws.nicheId, platform, username: creatorHandle });
          }

          await storage.createVideoPrimitive({
            nicheId: ws.nicheId,
            creatorId: creator.id,
            workspaceId: ws.id,
            sourceType: "user",
            platform,
            publishDate: scrapedMeta.publishedAt ? new Date(scrapedMeta.publishedAt) : null,
            durationSeconds: scrapedMeta.duration || source.duration || null,
            engagementRatio: null,
            hookText: null,
            hookType: mapHook(parsed.hookType),
            hookLengthSeconds: null,
            structureModel: mapStructure(parsed.narrativeStructure),
            formatType: mapFormat(parsed.contentFormat),
            angleCategory: mapAngle(parsed.contentAngle),
            topicCluster: parsed.nicheCategory || null,
            ctaPresent: false,
            pacingScore: null,
            authorityScore: null,
            emotionalIntensityScore: null,
          });

          updateWorkspaceIntelligence(ws.id).catch(err => console.error("Workspace intelligence update error:", err));
        } catch (convErr: any) {
          console.error("Content source → video_primitive conversion error:", convErr.message);
        }
      }

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

      const ws = await storage.getWorkspaceById(source.workspaceId);
      if (!ws || ws.ownerId !== req.user.id) return res.status(403).json({ message: "Forbidden" });

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

RULES FOR RECOMMENDATIONS:
- Always reference numeric differences when available.
- Compare dominant vs secondary patterns.
- Provide concrete execution guidance.
- Maximum 2 sentences per recommendation.
- Avoid generic advice.
- Maximum 3 recommendations total.

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
- "recommendations": a JSON string containing an array of max 3 {action, reason, priority} objects. Each action must be 2 sentences max with a numeric comparison.

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

  app.get("/api/workspaces/:workspaceId/intelligence", isAuthenticated, verifyWorkspaceOwnership, async (req: any, res) => {
    try {
      const scoring = await computeWorkspaceIntelligence(req.params.workspaceId);
      const notReady = scoring.totalVideos < 3;
      res.json({ scoring, notReady });
    } catch (err) {
      console.error("Workspace intelligence error:", err);
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

  // ─── Public Niche Intelligence (user-facing) ───

  app.get("/api/niches/available", isAuthenticated, async (req: any, res) => {
    try {
      const allNiches = await storage.getNiches();
      const enriched = await Promise.all(allNiches.map(async (n) => {
        const scoring = await computeNicheScoring(n.id);
        const isReady = scoring.totalVideos >= n.minRequiredVideos
          && scoring.confidence >= 0.5;
        return {
          id: n.id,
          name: n.name,
          description: n.description,
          isPublic: n.isPublic,
          isReady,
          videoCount: scoring.totalVideos,
          confidence: scoring.confidence,
          confidencePercent: scoring.confidencePercent,
          signalStrength: scoring.signalStrength,
          signalStrengthPercent: scoring.signalStrengthPercent,
          intelligenceStatus: scoring.intelligenceStatus,
        };
      }));
      res.json(enriched);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/niches/:nicheId/snapshot", isAuthenticated, async (req: any, res) => {
    try {
      const { nicheId } = req.params;
      const niche = await storage.getNicheById(nicheId);
      if (!niche) return res.status(404).json({ message: "Niche not found" });
      const [patterns, profile, scoring] = await Promise.all([
        storage.getNichePatterns(nicheId),
        storage.getNicheProfile(nicheId),
        computeNicheScoring(nicheId),
      ]);
      const notReady = scoring.totalVideos < 3;
      res.json({
        niche: { id: niche.id, name: niche.name, description: niche.description },
        scoring,
        notReady,
        recommendation: profile ? {
          intelligenceSummary: profile.intelligenceSummary,
          strategicRecommendation: profile.strategicRecommendation,
          nicheShiftSignal: profile.nicheShiftSignal,
        } : null,
        distributions: patterns ? {
          hookDistribution: patterns.hookDistribution,
          structureDistribution: patterns.structureDistribution,
          angleDistribution: patterns.angleDistribution,
          formatDistribution: patterns.formatDistribution,
          avgDuration: patterns.avgDuration,
          medianDuration: patterns.medianDuration,
        } : null,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── Stripe Billing ───

  app.post("/api/billing/checkout", isAuthenticated, async (req: any, res) => {
    try {
      const { plan } = z.object({ plan: z.enum(["starter", "pro", "studio"]) }).parse(req.body);
      const sub = await storage.getOrCreateSubscription(req.user.id);
      const customerId = await getOrCreateStripeCustomer(
        req.user.email,
        `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim() || req.user.email,
        sub.stripeCustomerId
      );
      if (!sub.stripeCustomerId) {
        await storage.updateSubscription(req.user.id, { stripeCustomerId: customerId });
      }
      const protocol = req.headers["x-forwarded-proto"] || "https";
      const host = req.headers.host;
      const baseUrl = `${protocol}://${host}`;
      const url = await createCheckoutSession(
        customerId,
        plan,
        `${baseUrl}/plan-billing?success=true`,
        `${baseUrl}/plan-billing?canceled=true`
      );
      res.json({ url });
    } catch (err: any) {
      console.error("Checkout session error:", err);
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/billing/portal", isAuthenticated, async (req: any, res) => {
    try {
      const sub = await storage.getOrCreateSubscription(req.user.id);
      if (!sub.stripeCustomerId) {
        return res.status(400).json({ message: "No billing account found. Subscribe to a plan first." });
      }
      const protocol = req.headers["x-forwarded-proto"] || "https";
      const host = req.headers.host;
      const baseUrl = `${protocol}://${host}`;
      const url = await createBillingPortalSession(sub.stripeCustomerId, `${baseUrl}/plan-billing`);
      res.json({ url });
    } catch (err: any) {
      console.error("Portal session error:", err);
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/billing/invoices", isAuthenticated, async (req: any, res) => {
    try {
      const sub = await storage.getOrCreateSubscription(req.user.id);
      if (!sub.stripeCustomerId) {
        return res.json([]);
      }
      const invoices = await getCustomerInvoices(sub.stripeCustomerId);
      res.json(invoices);
    } catch (err: any) {
      console.error("Invoice listing error:", err);
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/billing/config", (req: any, res) => {
    res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "" });
  });

  app.get("/api/billing/payment-methods", isAuthenticated, async (req: any, res) => {
    try {
      const sub = await storage.getOrCreateSubscription(req.user.id);
      if (!sub.stripeCustomerId) {
        return res.json([]);
      }
      const methods = await listPaymentMethods(sub.stripeCustomerId);
      res.json(methods);
    } catch (err: any) {
      console.error("List payment methods error:", err);
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/billing/setup-intent", isAuthenticated, async (req: any, res) => {
    try {
      const sub = await storage.getOrCreateSubscription(req.user.id);
      const customerId = await getOrCreateStripeCustomer(
        req.user.email,
        `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim() || req.user.email,
        sub.stripeCustomerId
      );
      if (!sub.stripeCustomerId) {
        await storage.updateSubscription(req.user.id, { stripeCustomerId: customerId });
      }
      const intent = await createSetupIntent(customerId);
      res.json(intent);
    } catch (err: any) {
      console.error("Setup intent error:", err);
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/billing/payment-methods/:id", isAuthenticated, async (req: any, res) => {
    try {
      const sub = await storage.getOrCreateSubscription(req.user.id);
      if (!sub.stripeCustomerId) {
        return res.status(400).json({ message: "No billing account found." });
      }
      const pm = await stripe.paymentMethods.retrieve(req.params.id);
      if (pm.customer !== sub.stripeCustomerId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      if (sub.stripeSubscriptionId && sub.billingStatus === "active") {
        const methods = await listPaymentMethods(sub.stripeCustomerId);
        if (methods.length <= 1) {
          return res.status(400).json({ message: "Cannot remove the last payment method while you have an active subscription." });
        }
      }
      await detachPaymentMethod(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      console.error("Detach payment method error:", err);
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/billing/payment-methods/:id/default", isAuthenticated, async (req: any, res) => {
    try {
      const sub = await storage.getOrCreateSubscription(req.user.id);
      if (!sub.stripeCustomerId) {
        return res.status(400).json({ message: "No billing account found." });
      }
      const pm = await stripe.paymentMethods.retrieve(req.params.id);
      if (pm.customer !== sub.stripeCustomerId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      await setDefaultPaymentMethod(sub.stripeCustomerId, req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      console.error("Set default payment method error:", err);
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/billing/webhook", async (req: any, res) => {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: any;
    if (webhookSecret && sig) {
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch (err: any) {
        console.error("Webhook signature verification failed:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }
    } else {
      event = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object;
          if (session.mode === "subscription" && session.customer) {
            const sub = await storage.getSubscriptionByStripeCustomerId(session.customer);
            if (sub) {
              await storage.updateSubscription(sub.userId, {
                stripeSubscriptionId: session.subscription,
                billingStatus: "active",
              });
            }
          }
          break;
        }
        case "invoice.paid": {
          const invoice = event.data.object;
          if (invoice.subscription) {
            const sub = await storage.getSubscriptionByStripeSubscriptionId(invoice.subscription);
            if (sub) {
              await storage.updateSubscription(sub.userId, {
                billingStatus: "active",
                renewalDate: new Date((invoice.lines?.data?.[0]?.period?.end || Math.floor(Date.now() / 1000) + 30 * 86400) * 1000),
              });
            }
          }
          break;
        }
        case "customer.subscription.updated": {
          const subscription = event.data.object;
          const sub = await storage.getSubscriptionByStripeSubscriptionId(subscription.id);
          if (sub) {
            const planItem = subscription.items?.data?.[0];
            const planLookup: Record<number, { plan: string; limit: number; nichesLimit: number }> = {
              2900: { plan: "starter", limit: 20, nichesLimit: 1 },
              6900: { plan: "pro", limit: 100, nichesLimit: 3 },
              19900: { plan: "studio", limit: 300, nichesLimit: 999 },
            };
            const amount = planItem?.price?.unit_amount || 0;
            const planInfo = planLookup[amount] || { plan: sub.plan, limit: sub.analysesLimit, nichesLimit: sub.nichesLimit };

            let billingStatus = "active";
            if (subscription.status === "past_due") billingStatus = "past_due";
            else if (subscription.status === "canceled" || subscription.status === "unpaid") billingStatus = "canceled";
            else if (subscription.status === "trialing") billingStatus = "trial";

            await storage.updateSubscription(sub.userId, {
              plan: planInfo.plan,
              analysesLimit: planInfo.limit,
              nichesLimit: planInfo.nichesLimit,
              billingStatus,
              renewalDate: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : sub.renewalDate,
            });
          }
          break;
        }
        case "customer.subscription.deleted": {
          const subscription = event.data.object;
          const sub = await storage.getSubscriptionByStripeSubscriptionId(subscription.id);
          if (sub) {
            await storage.updateSubscription(sub.userId, {
              billingStatus: "canceled",
              stripeSubscriptionId: null,
            });
          }
          break;
        }
      }
      res.json({ received: true });
    } catch (err: any) {
      console.error("Webhook processing error:", err);
      res.status(500).json({ message: err.message });
    }
  });

  // ─── Dashboard V2 — Trend Radar ───

  app.get("/api/trends/radar", isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      const niche = req.query.niche as string | undefined;

      let nicheFilter = sql``;
      if (niche) nicheFilter = sql` AND topic_cluster = ${niche}`;

      const [totalVideos] = (await db.execute(sql`SELECT COUNT(*) as count FROM videos WHERE classification_status = 'completed'${nicheFilter}`)).rows;
      const [todayVideos] = (await db.execute(sql`SELECT COUNT(*) as count FROM videos WHERE classification_status = 'completed' AND classified_at >= NOW() - INTERVAL '24 hours'${nicheFilter}`)).rows;
      const activeNiches = await db.execute(sql`SELECT DISTINCT topic_cluster FROM videos WHERE classification_status = 'completed' AND topic_cluster IS NOT NULL`);
      const creatorsDetected = await db.execute(sql`SELECT COUNT(DISTINCT creator_name) as count FROM videos WHERE classification_status = 'completed' AND creator_name IS NOT NULL${nicheFilter}`);

      const trendingHooks = await db.execute(sql`
        SELECT hook_text, hook_mechanism_primary, COUNT(*) as count, ROUND(AVG(virality_score)::numeric, 2) as avg_virality
        FROM videos WHERE classification_status = 'completed' AND hook_text IS NOT NULL${nicheFilter}
        GROUP BY hook_text, hook_mechanism_primary ORDER BY count DESC, avg_virality DESC NULLS LAST LIMIT 10
      `);

      const trendingFormats = await db.execute(sql`
        SELECT structure_type, COUNT(*) as count, ROUND(AVG(virality_score)::numeric, 2) as avg_virality
        FROM videos WHERE classification_status = 'completed' AND structure_type IS NOT NULL${nicheFilter}
        GROUP BY structure_type ORDER BY count DESC LIMIT 10
      `);

      const topVideos = await db.execute(sql`
        SELECT id, caption, platform, creator_name, views, likes, comments, engagement_rate, virality_score, topic_cluster, structure_type, hook_mechanism_primary, classified_at
        FROM videos WHERE classification_status = 'completed'${nicheFilter}
        ORDER BY virality_score DESC NULLS LAST LIMIT 10
      `);

      const emergingCreators = await db.execute(sql`
        SELECT creator_name, platform, COUNT(*) as video_count, SUM(views) as total_views,
          ROUND(AVG(virality_score)::numeric, 2) as avg_virality, MAX(topic_cluster) as niche
        FROM videos WHERE classification_status = 'completed' AND creator_name IS NOT NULL${nicheFilter}
        GROUP BY creator_name, platform ORDER BY avg_virality DESC NULLS LAST LIMIT 10
      `);

      res.json({
        metrics: {
          total_videos: parseInt(totalVideos.count as string),
          videos_today: parseInt(todayVideos.count as string),
          active_niches: activeNiches.rows.length,
          creators_detected: parseInt((creatorsDetected.rows[0] as any).count),
        },
        trending_hooks: trendingHooks.rows,
        trending_formats: trendingFormats.rows,
        top_videos: topVideos.rows,
        emerging_creators: emergingCreators.rows,
      });
    } catch (err: any) {
      console.error("Trend radar error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // ─── Dashboard V2 — Daily Viral Opportunities ───

  app.get("/api/trends/opportunities", isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      const userNiches = req.user.selectedNiches as string[] | null;

      let nicheFilter = sql``;
      if (userNiches && userNiches.length > 0) {
        nicheFilter = sql` AND topic_cluster = ANY(${userNiches})`;
      }

      const topPatterns = await db.execute(sql`
        SELECT topic_cluster, hook_text, hook_mechanism_primary, structure_type, duration_bucket,
          ROUND(AVG(virality_score)::numeric, 2) as trend_score, COUNT(*) as video_count
        FROM videos
        WHERE classification_status = 'completed'
          AND topic_cluster IS NOT NULL
          AND hook_text IS NOT NULL
          AND structure_type IS NOT NULL
          ${nicheFilter}
        GROUP BY topic_cluster, hook_text, hook_mechanism_primary, structure_type, duration_bucket
        HAVING COUNT(*) >= 2
        ORDER BY trend_score DESC NULLS LAST
        LIMIT 5
      `);

      const opportunities = topPatterns.rows.map((p: any) => ({
        niche: p.topic_cluster,
        hook: p.hook_text,
        hook_mechanism: p.hook_mechanism_primary,
        format: p.structure_type,
        recommended_duration: p.duration_bucket || "30-60s",
        trend_score: parseFloat(p.trend_score) || 0,
        video_count: parseInt(p.video_count),
      }));

      res.json({ opportunities });
    } catch (err: any) {
      console.error("Opportunities error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // ─── Dashboard V2 — Creators ───

  app.get("/api/creators", isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      const niche = req.query.niche as string | undefined;

      let nicheFilter = sql``;
      if (niche) nicheFilter = sql` AND topic_cluster = ${niche}`;

      const creators = await db.execute(sql`
        SELECT creator_name, platform,
          COUNT(*) as video_count,
          SUM(views) as views_total,
          ROUND(AVG(views)::numeric, 0) as avg_views,
          ROUND(AVG(virality_score)::numeric, 2) as avg_virality,
          ROUND(AVG(engagement_rate)::numeric, 4) as avg_engagement,
          MAX(topic_cluster) as niche,
          SUM(CASE WHEN virality_score > 50 THEN 1 ELSE 0 END) as viral_videos
        FROM videos
        WHERE classification_status = 'completed' AND creator_name IS NOT NULL${nicheFilter}
        GROUP BY creator_name, platform
        ORDER BY avg_virality DESC NULLS LAST
        LIMIT 50
      `);

      res.json({ creators: creators.rows });
    } catch (err: any) {
      console.error("Creators error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // ─── Dashboard V2 — Videos Browse ───

  app.get("/api/videos/browse", isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      const niche = req.query.niche as string | undefined;
      const platform = req.query.platform as string | undefined;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
      const offset = (page - 1) * limit;

      let filters = sql`WHERE classification_status = 'completed'`;
      if (niche) filters = sql`${filters} AND topic_cluster = ${niche}`;
      if (platform) filters = sql`${filters} AND platform = ${platform}`;

      const [countRow] = (await db.execute(sql`SELECT COUNT(*) as count FROM videos ${filters}`)).rows;
      const videos = await db.execute(sql`
        SELECT id, caption, platform, creator_name, views, likes, comments, shares,
          engagement_rate, virality_score, topic_cluster, structure_type,
          hook_mechanism_primary, hook_text, duration_bucket, classified_at
        FROM videos ${filters}
        ORDER BY virality_score DESC NULLS LAST
        LIMIT ${limit} OFFSET ${offset}
      `);

      res.json({
        videos: videos.rows,
        total: parseInt(countRow.count as string),
        page,
        pages: Math.ceil(parseInt(countRow.count as string) / limit),
      });
    } catch (err: any) {
      console.error("Videos browse error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // ─── Dashboard V2 — Patterns Browse ───

  app.get("/api/patterns/browse", isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      const niche = req.query.niche as string | undefined;

      let nicheFilter = sql``;
      if (niche) nicheFilter = sql` AND v.topic_cluster = ${niche}`;

      const patterns = await db.execute(sql`
        SELECT v.hook_mechanism_primary as pattern_hook, v.structure_type as content_format,
          v.topic_cluster as niche, v.platform,
          COUNT(*) as video_count,
          ROUND(AVG(v.virality_score)::numeric, 2) as growth_score,
          ROUND(AVG(v.engagement_rate)::numeric, 4) as avg_engagement,
          json_agg(json_build_object('id', v.id, 'caption', LEFT(v.caption, 100), 'views', v.views, 'virality_score', v.virality_score) ORDER BY v.virality_score DESC NULLS LAST) FILTER (WHERE v.virality_score IS NOT NULL) as example_videos
        FROM videos v
        WHERE v.classification_status = 'completed'
          AND v.hook_mechanism_primary IS NOT NULL
          AND v.structure_type IS NOT NULL
          ${nicheFilter}
        GROUP BY v.hook_mechanism_primary, v.structure_type, v.topic_cluster, v.platform
        HAVING COUNT(*) >= 2
        ORDER BY growth_score DESC NULLS LAST
        LIMIT 30
      `);

      const result = patterns.rows.map((p: any) => ({
        ...p,
        example_videos: (p.example_videos || []).slice(0, 3),
      }));

      res.json({ patterns: result });
    } catch (err: any) {
      console.error("Patterns browse error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // ─── Dashboard V2 — User Preferences ───

  app.patch("/api/user/preferences", isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      const input = z.object({
        selectedNiches: z.array(z.string()).max(10).optional(),
        userGoal: z.enum(["content_creator", "marketer", "business", "trend_explorer"]).optional(),
        onboardingCompleted: z.boolean().optional(),
      }).parse(req.body);

      const updates: string[] = [];
      if (input.selectedNiches !== undefined) {
        await db.execute(sql`UPDATE users SET selected_niches = ${input.selectedNiches} WHERE id = ${req.user.id}`);
      }
      if (input.userGoal !== undefined) {
        await db.execute(sql`UPDATE users SET user_goal = ${input.userGoal} WHERE id = ${req.user.id}`);
      }
      if (input.onboardingCompleted !== undefined) {
        await db.execute(sql`UPDATE users SET onboarding_completed = ${input.onboardingCompleted} WHERE id = ${req.user.id}`);
      }

      res.json({ success: true });
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      console.error("Preferences error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // ─── Dashboard V2 — Niches Overview ───

  app.get("/api/niches/overview", isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");

      const niches = await db.execute(sql`
        SELECT topic_cluster,
          COUNT(*) as video_count,
          ROUND(AVG(virality_score)::numeric, 2) as avg_virality,
          ROUND(AVG(engagement_rate)::numeric, 4) as avg_engagement
        FROM videos
        WHERE classification_status = 'completed' AND topic_cluster IS NOT NULL
        GROUP BY topic_cluster
        ORDER BY video_count DESC
      `);

      const nicheDetails = [];
      for (const n of niches.rows) {
        const niche = n.topic_cluster as string;

        const topHooks = await db.execute(sql`
          SELECT hook_mechanism_primary, COUNT(*) as count
          FROM videos WHERE classification_status = 'completed' AND topic_cluster = ${niche} AND hook_mechanism_primary IS NOT NULL
          GROUP BY hook_mechanism_primary ORDER BY count DESC LIMIT 5
        `);

        const topFormats = await db.execute(sql`
          SELECT structure_type, COUNT(*) as count
          FROM videos WHERE classification_status = 'completed' AND topic_cluster = ${niche} AND structure_type IS NOT NULL
          GROUP BY structure_type ORDER BY count DESC LIMIT 5
        `);

        const topCreators = await db.execute(sql`
          SELECT creator_name, COUNT(*) as video_count, ROUND(AVG(virality_score)::numeric, 2) as avg_virality
          FROM videos WHERE classification_status = 'completed' AND topic_cluster = ${niche} AND creator_name IS NOT NULL
          GROUP BY creator_name ORDER BY avg_virality DESC NULLS LAST LIMIT 5
        `);

        nicheDetails.push({
          niche,
          video_count: parseInt(n.count as string),
          avg_virality: parseFloat(n.avg_virality as string) || 0,
          avg_engagement: parseFloat(n.avg_engagement as string) || 0,
          top_hooks: topHooks.rows,
          top_formats: topFormats.rows,
          top_creators: topCreators.rows,
        });
      }

      res.json({ niches: nicheDetails });
    } catch (err: any) {
      console.error("Niches overview error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // ─── Classifier API (external agent) ───
  function verifyClassifierApiKey(req: any, res: any, next: any) {
    const apiKey = req.headers["x-api-key"];
    const expectedKey = process.env.CLASSIFIER_API_KEY;
    if (!expectedKey || apiKey !== expectedKey) {
      return res.status(401).json({ message: "Invalid or missing API key" });
    }
    next();
  }

  function validateEnum<T extends string>(value: unknown, allowed: readonly T[]): T | null {
    if (!value || typeof value !== "string") return null;
    const lower = value.toLowerCase().replace(/[\s-]+/g, "_");
    for (const item of allowed) {
      if (item === value || item === lower || item.toLowerCase() === lower) return item as T;
    }
    return null;
  }

  function validateEnumArray<T extends string>(values: unknown, allowed: readonly T[]): T[] | null {
    if (!Array.isArray(values)) return null;
    const result: T[] = [];
    for (const v of values) {
      const valid = validateEnum(v, allowed);
      if (valid) result.push(valid);
    }
    return result.length > 0 ? result : null;
  }

  app.post("/api/videos/ingest", verifyClassifierApiKey, async (req: any, res) => {
    try {
      const input = z.object({
        videos: z.array(z.object({
          platform: z.string().optional(),
          platform_video_id: z.string().optional(),
          video_url: z.string().optional(),
          caption: z.string().optional(),
          transcript: z.string().optional(),
          hashtags: z.array(z.string()).optional(),
          duration_seconds: z.number().optional(),
          views: z.number().optional(),
          likes: z.number().optional(),
          comments: z.number().optional(),
          shares: z.number().optional(),
          creator_name: z.string().optional(),
          creator_id: z.string().optional(),
          creator_niche: z.string().optional(),
          published_at: z.string().optional(),
        })).min(1).max(100),
      }).parse(req.body);

      const created = [];
      const skipped = [];
      for (const v of input.videos) {
        const pvId = v.platform_video_id || (v.platform && v.video_url ? `${v.platform}_${v.video_url}` : null);

        if (pvId) {
          const existing = await storage.getVideoByPlatformVideoId(pvId);
          if (existing) {
            skipped.push({ platform_video_id: pvId, reason: "duplicate" });
            continue;
          }
        }

        const video = await storage.createVideo({
          platform: v.platform || null,
          platformVideoId: pvId,
          videoUrl: v.video_url || null,
          caption: v.caption || null,
          transcript: v.transcript || null,
          hashtags: v.hashtags || null,
          durationSeconds: v.duration_seconds || null,
          durationBucket: v.duration_seconds
            ? v.duration_seconds <= 15 ? "0-15s"
            : v.duration_seconds <= 30 ? "15-30s"
            : v.duration_seconds <= 60 ? "30-60s"
            : v.duration_seconds <= 90 ? "60-90s"
            : v.duration_seconds <= 180 ? "90-180s"
            : "180s+"
            : null,
          views: v.views ?? null,
          likes: v.likes ?? null,
          comments: v.comments ?? null,
          shares: v.shares ?? null,
          creatorName: v.creator_name || null,
          creatorId: v.creator_id || null,
          creatorNiche: v.creator_niche || null,
          publishedAt: v.published_at ? new Date(v.published_at) : null,
        } as any);
        created.push({ id: video.id, platform_video_id: pvId, status: video.classificationStatus });
      }

      res.json({ success: true, ingested: created.length, skipped: skipped.length, videos: created, skipped_details: skipped });
    } catch (err: any) {
      if (err.name === "ZodError") {
        return res.status(400).json({ message: "Invalid request body", errors: err.errors });
      }
      console.error("Video ingestion error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.get("/api/videos/unclassified", verifyClassifierApiKey, async (req: any, res) => {
    try {
      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100);
      const batch = await storage.getUnclassifiedVideos(limit);
      const result = batch.map(v => ({
        id: v.id,
        caption: v.caption,
        transcript: v.transcript,
        hashtags: v.hashtags,
        duration_seconds: v.durationSeconds,
        platform: v.platform,
        views: v.views,
        likes: v.likes,
        comments: v.comments,
        shares: v.shares,
        creator_name: v.creatorName,
        creator_niche: v.creatorNiche,
      }));
      res.json({ videos: result, count: result.length });
    } catch (err: any) {
      console.error("Unclassified videos error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.post("/api/videos/classify", verifyClassifierApiKey, async (req: any, res) => {
    try {
      const input = z.object({
        video_id: z.string().min(1),
        classification: z.object({
          hook_mechanism: z.array(z.string()).optional(),
          hook_format: z.string().optional(),
          hook_text: z.string().nullable().optional(),
          hook_topic: z.string().optional(),
          emotional_trigger: z.array(z.string()).optional(),
          content_structure: z.array(z.string()).optional(),
          content_format: z.string().optional(),
          content_goal: z.string().optional(),
          visual_style: z.array(z.string()).optional(),
          storytelling_presence: z.string().optional(),
          content_pace: z.string().optional(),
          creator_archetype: z.string().optional(),
          topic_category: z.string().optional(),
          topic_cluster: z.string().optional(),
          topic_subcluster: z.string().optional(),
          call_to_action: z.string().optional(),
          controversy_level: z.string().optional(),
          information_density: z.string().optional(),
          platform: z.string().optional(),
          duration_bucket: z.string().optional(),
          pattern_notes: z.string().nullable().optional(),
        }),
      }).parse(req.body);

      const video = await storage.getVideoById(input.video_id);
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }

      if (video.classificationStatus === "completed") {
        return res.status(409).json({ message: "Video already classified" });
      }

      const c = input.classification;
      const updateData: Record<string, unknown> = {};

      if (c.hook_mechanism) {
        const val = validateEnumArray(c.hook_mechanism, HOOK_MECHANISMS);
        if (val) updateData.hookMechanism = val;
      }
      if (c.hook_format) {
        const val = validateEnum(c.hook_format, HOOK_FORMATS);
        if (val) updateData.hookFormat = val;
      }
      if (c.hook_text !== undefined) updateData.hookText = c.hook_text;
      if (c.hook_topic) {
        const val = validateEnum(c.hook_topic, HOOK_TOPICS);
        if (val) updateData.hookTopic = val;
      }
      if (c.emotional_trigger) {
        const val = validateEnumArray(c.emotional_trigger, EMOTIONAL_TRIGGERS);
        if (val) updateData.emotionalTrigger = val;
      }
      if (c.content_structure) {
        const val = validateEnumArray(c.content_structure, CONTENT_STRUCTURES);
        if (val) updateData.contentStructure = val;
      }
      if (c.content_format) {
        const val = validateEnum(c.content_format, CONTENT_FORMATS);
        if (val) updateData.contentFormat = val;
      }
      if (c.content_goal) {
        const val = validateEnum(c.content_goal, CONTENT_GOALS);
        if (val) updateData.contentGoal = val;
      }
      if (c.visual_style) {
        const val = validateEnumArray(c.visual_style, VISUAL_STYLES);
        if (val) updateData.visualStyle = val;
      }
      if (c.storytelling_presence) {
        const val = validateEnum(c.storytelling_presence, STORYTELLING_PRESENCES);
        if (val) updateData.storytellingPresence = val;
      }
      if (c.content_pace) {
        const val = validateEnum(c.content_pace, CONTENT_PACES);
        if (val) updateData.contentPace = val;
      }
      if (c.creator_archetype) {
        const val = validateEnum(c.creator_archetype, CREATOR_ARCHETYPES);
        if (val) updateData.creatorArchetype = val;
      }
      if (c.topic_category) {
        const val = validateEnum(c.topic_category, TOPIC_CATEGORIES);
        if (val) updateData.topicCategory = val;
      }
      if (c.topic_cluster) {
        const normalized = normalizeTopicCluster(c.topic_cluster);
        if (normalized) updateData.topicCluster = normalized;
      }
      if (c.topic_subcluster) {
        updateData.topicSubcluster = c.topic_subcluster;
      }
      if (c.call_to_action) {
        const val = validateEnum(c.call_to_action, CTA_TYPES);
        if (val) updateData.callToAction = val;
      }
      if (c.controversy_level) {
        const val = validateEnum(c.controversy_level, CONTROVERSY_LEVELS);
        if (val) updateData.controversyLevel = val;
      }
      if (c.information_density) {
        const val = validateEnum(c.information_density, INFORMATION_DENSITIES);
        if (val) updateData.informationDensity = val;
      }
      if (c.platform) updateData.platform = c.platform;
      if (c.duration_bucket) {
        const val = validateEnum(c.duration_bucket, DURATION_BUCKETS);
        if (val) updateData.durationBucket = val;
      }
      if (c.pattern_notes !== undefined) updateData.patternNotes = c.pattern_notes;

      updateData.classifiedBy = "twin-classifier";

      const hookMechanismArr = (updateData.hookMechanism as string[] | undefined) || video.hookMechanism;
      const hookPatternVal = (c as any).hook_pattern || video.hookPattern;
      const derivedPrimary = deriveHookMechanismPrimary(hookMechanismArr, hookPatternVal);
      if (derivedPrimary) updateData.hookMechanismPrimary = derivedPrimary;

      const MAX_CLASSIFICATION_ATTEMPTS = 3;
      const currentAttempts = (video.classificationAttempts || 0) + 1;

      if (!updateData.topicCluster) {
        if (currentAttempts >= MAX_CLASSIFICATION_ATTEMPTS) {
          updateData.classificationStatus = "classification_failed";
          updateData.classificationAttempts = currentAttempts;
          updateData.patternNotes = `${updateData.patternNotes || ""} [topic_cluster missing after ${currentAttempts} attempts]`.trim();
          console.warn(`[classify] Video ${input.video_id}: topic_cluster null after ${currentAttempts} attempts → classification_failed`);
          const updated = await storage.updateVideoClassification(input.video_id, updateData as any);
          return res.json({ success: true, video_id: updated.id, status: "classification_failed", reason: "topic_cluster_missing_after_retries" });
        } else {
          updateData.classificationStatus = "pending";
          updateData.classificationAttempts = currentAttempts;
          updateData.classifiedAt = null;
          updateData.classifiedBy = null;
          console.warn(`[classify] Video ${input.video_id}: topic_cluster null → retry ${currentAttempts}/${MAX_CLASSIFICATION_ATTEMPTS}`);
          const updated = await storage.updateVideoClassification(input.video_id, updateData as any);
          return res.json({ success: true, video_id: updated.id, status: "pending_retry", attempt: currentAttempts, max_attempts: MAX_CLASSIFICATION_ATTEMPTS });
        }
      }

      updateData.classificationAttempts = currentAttempts;
      const updated = await storage.updateVideoClassification(input.video_id, updateData as any);
      res.json({ success: true, video_id: updated.id, status: updated.classificationStatus });
    } catch (err: any) {
      if (err.name === "ZodError") {
        return res.status(400).json({ message: "Invalid request body", errors: err.errors });
      }
      if (req.body?.video_id) {
        try {
          await storage.markVideoClassificationFailed(req.body.video_id);
        } catch (_) {}
      }
      console.error("Classification error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.get("/api/patterns/status", verifyClassifierApiKey, async (req: any, res) => {
    try {
      const status = await isPatternEngineReady();
      res.json(status);
    } catch (err: any) {
      console.error("Pattern status error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.post("/api/patterns/compute", verifyClassifierApiKey, async (req: any, res) => {
    try {
      const result = await computeAndStorePatterns();
      res.json(result);
    } catch (err: any) {
      console.error("Pattern compute error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.get("/api/patterns", verifyClassifierApiKey, async (req: any, res) => {
    try {
      const result = await computePatterns();
      res.json(result);
    } catch (err: any) {
      console.error("Pattern fetch error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // ── POST /api/trends/scores — Twin agent pushes trend scores ──
  // Formula: view_velocity (40%) + engagement_rate (25%) + views_vs_niche (20%) + freshness (10%) + format_diversity (5%)
  // view_velocity = views / age_hours — detects EMERGING trends, not just high-view videos
  // trend_velocity derived from data: rising (velocity > 1.5x niche avg), declining (< 0.5x), stable (between)

  app.post("/api/trends/scores", verifyClassifierApiKey, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");

      const input = z.object({
        scores: z.array(z.object({
          video_id: z.string().uuid(),
          trend_score: z.number().min(0).max(100),
          view_velocity: z.number().optional(),
          trend_reasons: z.array(z.string()).optional(),
          trend_velocity: z.enum(["rising", "stable", "declining"]).optional(),
        })).min(1).max(200),
      }).parse(req.body);

      let updated = 0;
      let notFound = 0;
      for (const s of input.scores) {
        const result = await db.execute(sql`
          UPDATE videos SET
            virality_score = ${s.trend_score},
            updated_at = NOW()
          WHERE id = ${s.video_id} AND classification_status = 'completed'
        `);
        if ((result as any).rowCount > 0) {
          updated++;
        } else {
          notFound++;
        }
      }

      console.log(`[trends/scores] Updated ${updated} videos, ${notFound} not found`);
      res.json({ success: true, updated, not_found: notFound, total: input.scores.length });
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message, errors: err.errors });
      console.error("Trends scores error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // ── GET /api/creators/top — top creators by momentum ──

  app.get("/api/creators/top", verifyClassifierApiKey, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));

      const creators = await db.execute(sql`
        SELECT
          creator_name,
          platform,
          COUNT(*) as video_count,
          SUM(views) as views_total,
          ROUND(AVG(views)::numeric, 0) as avg_views,
          ROUND(AVG(engagement_rate)::numeric, 4) as avg_engagement,
          ROUND(AVG(virality_score)::numeric, 2) as avg_virality,
          SUM(CASE WHEN virality_score > 50 THEN 1 ELSE 0 END) as viral_videos,
          MAX(topic_cluster) as niche,
          ROUND(
            (0.4 * COALESCE(AVG(virality_score), 0) +
             0.3 * LEAST(100, COALESCE(SUM(views), 0) / GREATEST(COUNT(*), 1) / 1000) +
             0.2 * COALESCE(AVG(engagement_rate), 0) * 1000 +
             0.1 * COUNT(*) * 5)::numeric
          , 2) as momentum_score
        FROM videos
        WHERE classification_status = 'completed'
          AND creator_name IS NOT NULL
        GROUP BY creator_name, platform
        HAVING COUNT(*) >= 2
        ORDER BY momentum_score DESC NULLS LAST
        LIMIT ${limit}
      `);

      res.json(creators.rows.map((c: any) => ({
        creator_name: c.creator_name,
        platform: c.platform,
        followers: null,
        views_total: parseInt(c.views_total) || 0,
        views_growth: null,
        avg_views: parseInt(c.avg_views) || 0,
        avg_engagement: parseFloat(c.avg_engagement) || 0,
        viral_videos: parseInt(c.viral_videos) || 0,
        niche: c.niche,
        momentum_score: parseFloat(c.momentum_score) || 0,
        video_count: parseInt(c.video_count) || 0,
      })));
    } catch (err: any) {
      console.error("Creators top error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // ── GET /api/opportunities — daily viral opportunities for dashboard ──

  app.get("/api/opportunities", verifyClassifierApiKey, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      const limit = Math.min(20, Math.max(1, parseInt(req.query.limit as string) || 5));

      const opportunities = await db.execute(sql`
        WITH ranked_patterns AS (
          SELECT
            v.topic_cluster as niche,
            v.hook_text as hook,
            v.structure_type as format,
            v.duration_seconds,
            ROUND(AVG(v.virality_score)::numeric, 2) as trend_score,
            COUNT(*) as video_count,
            (array_agg(v.id ORDER BY v.virality_score DESC NULLS LAST))[1] as example_video_id,
            ROW_NUMBER() OVER (PARTITION BY v.topic_cluster ORDER BY AVG(v.virality_score) DESC NULLS LAST) as rn
          FROM videos v
          WHERE v.classification_status = 'completed'
            AND v.topic_cluster IS NOT NULL
            AND v.hook_text IS NOT NULL
            AND v.structure_type IS NOT NULL
            AND v.virality_score IS NOT NULL
          GROUP BY v.topic_cluster, v.hook_text, v.structure_type, v.duration_seconds
          HAVING COUNT(*) >= 2
        )
        SELECT niche, hook, format,
          COALESCE(duration_seconds, 30) as recommended_duration,
          trend_score, video_count, example_video_id
        FROM ranked_patterns
        WHERE rn <= 2
        ORDER BY trend_score DESC NULLS LAST
        LIMIT ${limit}
      `);

      const patternsForIds = await db.execute(sql`
        SELECT pattern_id, hook_type, structure_type, topic_cluster
        FROM patterns
        ORDER BY avg_virality_score DESC NULLS LAST
        LIMIT ${limit}
      `);

      const result = opportunities.rows.map((o: any, i: number) => ({
        niche: o.niche,
        hook: o.hook,
        format: o.format,
        recommended_duration: parseInt(o.recommended_duration) || 30,
        trend_score: parseFloat(o.trend_score) || 0,
        pattern_id: patternsForIds.rows[i] ? (patternsForIds.rows[i] as any).pattern_id : null,
        example_video_id: o.example_video_id,
        video_count: parseInt(o.video_count) || 0,
      }));

      res.json(result);
    } catch (err: any) {
      console.error("Opportunities error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // ── GET /api/videos/unscored — videos without trend_score for Twin to process ──

  app.get("/api/videos/unscored", verifyClassifierApiKey, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 50));

      const videos = await db.execute(sql`
        SELECT id, platform, creator_name, caption, hashtags, transcript,
          views, likes, comments, shares, engagement_rate,
          published_at, classified_at,
          topic_cluster, structure_type, hook_mechanism_primary, hook_text,
          duration_seconds, duration_bucket,
          EXTRACT(EPOCH FROM (NOW() - COALESCE(published_at, classified_at))) / 3600 as age_hours,
          CASE WHEN EXTRACT(EPOCH FROM (NOW() - COALESCE(published_at, classified_at))) > 0
            THEN ROUND((COALESCE(views, 0) / (EXTRACT(EPOCH FROM (NOW() - COALESCE(published_at, classified_at))) / 3600))::numeric, 2)
            ELSE 0 END as view_velocity
        FROM videos
        WHERE classification_status = 'completed'
          AND (virality_score IS NULL OR virality_score = 0)
        ORDER BY classified_at DESC
        LIMIT ${limit}
      `);

      const nicheAvgs = await db.execute(sql`
        SELECT topic_cluster,
          ROUND(AVG(views)::numeric, 0) as avg_views,
          ROUND(AVG(engagement_rate)::numeric, 4) as avg_engagement,
          ROUND(AVG(CASE WHEN EXTRACT(EPOCH FROM (NOW() - COALESCE(published_at, classified_at))) > 0
            THEN COALESCE(views, 0) / (EXTRACT(EPOCH FROM (NOW() - COALESCE(published_at, classified_at))) / 3600)
            ELSE 0 END)::numeric, 2) as avg_view_velocity,
          COUNT(*) as video_count
        FROM videos
        WHERE classification_status = 'completed' AND topic_cluster IS NOT NULL
        GROUP BY topic_cluster
      `);

      res.json({
        videos: videos.rows,
        niche_averages: nicheAvgs.rows,
        total_unscored: videos.rows.length,
        scoring_formula: {
          view_velocity: 0.40,
          engagement_rate: 0.25,
          views_vs_niche_avg: 0.20,
          freshness: 0.10,
          format_diversity: 0.05,
        },
      });
    } catch (err: any) {
      console.error("Videos unscored error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // ── POST /api/trends/alerts — Twin agent pushes trend alerts ──

  app.post("/api/trends/alerts", verifyClassifierApiKey, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");

      const input = z.object({
        alerts: z.array(z.object({
          type: z.enum(["spike", "emerging_pattern", "new_creator", "niche_shift"]),
          severity: z.enum(["info", "warning", "critical"]).default("info"),
          title: z.string(),
          description: z.string(),
          niche: z.string().optional(),
          video_ids: z.array(z.string()).optional(),
          metadata: z.record(z.any()).optional(),
        })).min(1).max(50),
      }).parse(req.body);

      const tableExists = await db.execute(sql`
        SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trend_alerts') as exists
      `);

      if (!(tableExists.rows[0] as any).exists) {
        await db.execute(sql`
          CREATE TABLE trend_alerts (
            id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
            type TEXT NOT NULL,
            severity TEXT NOT NULL DEFAULT 'info',
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            niche TEXT,
            video_ids TEXT[],
            metadata JSONB,
            created_at TIMESTAMP DEFAULT NOW(),
            read BOOLEAN DEFAULT FALSE
          )
        `);
        console.log("[alerts] Created trend_alerts table");
      }

      let inserted = 0;
      for (const a of input.alerts) {
        await db.execute(sql`
          INSERT INTO trend_alerts (type, severity, title, description, niche, video_ids, metadata)
          VALUES (${a.type}, ${a.severity}, ${a.title}, ${a.description}, ${a.niche ?? null}, ${a.video_ids ?? null}, ${a.metadata ? JSON.stringify(a.metadata) : null}::jsonb)
        `);
        inserted++;
      }

      console.log(`[alerts] Inserted ${inserted} alerts`);
      res.json({ success: true, inserted });
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message, errors: err.errors });
      console.error("Alerts error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // ── POST /api/patterns — Twin agent pushes detected patterns ──

  app.post("/api/patterns", verifyClassifierApiKey, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");

      const input = z.object({
        patterns: z.array(z.object({
          dimension_keys: z.array(z.string()).min(1),
          hook_type: z.string().optional(),
          structure_type: z.string().optional(),
          emotion_primary: z.string().optional(),
          topic_cluster: z.string().optional(),
          topic_category: z.string().optional(),
          facecam: z.boolean().optional(),
          cut_frequency: z.string().optional(),
          text_overlay_density: z.string().optional(),
          platform: z.string().optional(),
          video_count: z.number().int().min(1),
          avg_virality_score: z.number().optional(),
          median_virality_score: z.number().optional(),
          avg_engagement_rate: z.number().optional(),
          performance_rank: z.number().int().optional(),
          pattern_label: z.string().optional(),
        })).min(1).max(500),
        replace_all: z.boolean().optional(),
      }).parse(req.body);

      if (input.replace_all) {
        const countBefore = await db.execute(sql`SELECT COUNT(*) as count FROM patterns`);
        const before = parseInt((countBefore.rows[0] as any).count);
        if (input.patterns.length < before * 0.5 && before > 10) {
          console.warn(`[patterns] replace_all blocked: incoming ${input.patterns.length} vs existing ${before} (safety: must send >=50% of existing count)`);
          return res.status(400).json({
            message: `Safety check: you are sending ${input.patterns.length} patterns but ${before} exist. Send at least ${Math.ceil(before * 0.5)} patterns with replace_all:true, or use upsert mode (replace_all:false).`,
          });
        }
        await db.execute(sql`DELETE FROM patterns`);
        console.log(`[patterns] Cleared ${before} existing patterns (replace_all=true, replacing with ${input.patterns.length})`);
      }

      let inserted = 0;
      let updated = 0;
      for (const p of input.patterns) {
        const dimKeysArray = sql`ARRAY[${sql.join(p.dimension_keys.map(k => sql`${k}`), sql`, `)}]::text[]`;
        const existingCheck = await db.execute(sql`
          SELECT pattern_id FROM patterns
          WHERE dimension_keys = ${dimKeysArray}
            AND COALESCE(hook_type, '') = COALESCE(${p.hook_type ?? null}, '')
            AND COALESCE(structure_type, '') = COALESCE(${p.structure_type ?? null}, '')
            AND COALESCE(topic_cluster, '') = COALESCE(${p.topic_cluster ?? null}, '')
            AND COALESCE(platform, '') = COALESCE(${p.platform ?? null}, '')
          LIMIT 1
        `);

        if (existingCheck.rows.length > 0) {
          const patternId = (existingCheck.rows[0] as any).pattern_id;
          await db.execute(sql`
            UPDATE patterns SET
              video_count = ${p.video_count},
              avg_virality_score = ${p.avg_virality_score ?? null},
              median_virality_score = ${p.median_virality_score ?? null},
              avg_engagement_rate = ${p.avg_engagement_rate ?? null},
              performance_rank = ${p.performance_rank ?? null},
              pattern_label = ${p.pattern_label ?? null},
              emotion_primary = ${p.emotion_primary ?? null},
              topic_category = ${p.topic_category ?? null},
              facecam = ${p.facecam ?? null},
              cut_frequency = ${p.cut_frequency ?? null},
              text_overlay_density = ${p.text_overlay_density ?? null},
              last_updated = NOW()
            WHERE pattern_id = ${patternId}
          `);
          updated++;
        } else {
          await db.execute(sql`
            INSERT INTO patterns (dimension_keys, hook_type, structure_type, emotion_primary, topic_cluster, topic_category, facecam, cut_frequency, text_overlay_density, platform, video_count, avg_virality_score, median_virality_score, avg_engagement_rate, performance_rank, pattern_label)
            VALUES (${dimKeysArray}, ${p.hook_type ?? null}, ${p.structure_type ?? null}, ${p.emotion_primary ?? null}, ${p.topic_cluster ?? null}, ${p.topic_category ?? null}, ${p.facecam ?? null}, ${p.cut_frequency ?? null}, ${p.text_overlay_density ?? null}, ${p.platform ?? null}, ${p.video_count}, ${p.avg_virality_score ?? null}, ${p.median_virality_score ?? null}, ${p.avg_engagement_rate ?? null}, ${p.performance_rank ?? null}, ${p.pattern_label ?? null})
          `);
          inserted++;
        }
      }

      console.log(`[patterns] Inserted ${inserted}, updated ${updated}`);
      res.json({ success: true, inserted, updated, total: input.patterns.length });
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message, errors: err.errors });
      console.error("Patterns POST error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // ── Hook Intelligence ──

  app.get("/api/insights/hooks", verifyClassifierApiKey, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");

      const topicCluster = req.query.topic_cluster as string | undefined;
      const timeWindow = req.query.time_window as string || "all";

      let timeFilter = sql``;
      if (timeWindow === "7d") timeFilter = sql` AND v.classified_at >= NOW() - INTERVAL '7 days'`;
      else if (timeWindow === "30d") timeFilter = sql` AND v.classified_at >= NOW() - INTERVAL '30 days'`;

      let clusterFilter = sql``;
      if (topicCluster) clusterFilter = sql` AND v.topic_cluster = ${topicCluster}`;

      const hookStats = await db.execute(sql`
        SELECT 
          v.hook_mechanism_primary,
          COUNT(*) as video_count,
          ROUND(AVG(v.virality_score)::numeric, 2) as avg_virality,
          ROUND(AVG(v.engagement_rate)::numeric, 4) as avg_engagement
        FROM videos v
        WHERE v.classification_status = 'completed'
          AND v.hook_mechanism_primary IS NOT NULL
          ${clusterFilter}
          ${timeFilter}
        GROUP BY v.hook_mechanism_primary
        ORDER BY avg_virality DESC NULLS LAST, video_count DESC
      `);

      const topExamples: Record<string, any[]> = {};
      for (const stat of hookStats.rows) {
        const mechanism = stat.hook_mechanism_primary as string;
        const examples = await db.execute(sql`
          SELECT v.id, v.caption, v.hook_text, v.views, v.likes, v.virality_score, v.topic_cluster
          FROM videos v
          WHERE v.classification_status = 'completed'
            AND v.hook_mechanism_primary = ${mechanism}
            ${clusterFilter}
            ${timeFilter}
          ORDER BY v.virality_score DESC NULLS LAST
          LIMIT 3
        `);
        topExamples[mechanism] = examples.rows;
      }

      res.json({
        topic_cluster: topicCluster || "all",
        time_window: timeWindow,
        hooks: hookStats.rows.map((h: any) => ({
          hook_mechanism: h.hook_mechanism_primary,
          video_count: parseInt(h.video_count),
          avg_virality: parseFloat(h.avg_virality) || 0,
          avg_engagement: parseFloat(h.avg_engagement) || 0,
          top_examples: topExamples[h.hook_mechanism_primary] || [],
        })),
      });
    } catch (err: any) {
      console.error("Hook insights error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // ── Viral Format Detection ──

  app.get("/api/insights/formats", verifyClassifierApiKey, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");

      const topicCluster = req.query.topic_cluster as string | undefined;
      const timeWindow = req.query.time_window as string || "all";

      let timeFilter = sql``;
      if (timeWindow === "7d") timeFilter = sql` AND v.classified_at >= NOW() - INTERVAL '7 days'`;
      else if (timeWindow === "30d") timeFilter = sql` AND v.classified_at >= NOW() - INTERVAL '30 days'`;

      let clusterFilter = sql``;
      if (topicCluster) clusterFilter = sql` AND v.topic_cluster = ${topicCluster}`;

      const formatStats = await db.execute(sql`
        SELECT 
          v.structure_type,
          COUNT(*) as video_count,
          ROUND(AVG(v.virality_score)::numeric, 2) as avg_virality,
          ROUND(AVG(v.engagement_rate)::numeric, 4) as avg_engagement
        FROM videos v
        WHERE v.classification_status = 'completed'
          AND v.structure_type IS NOT NULL
          ${clusterFilter}
          ${timeFilter}
        GROUP BY v.structure_type
        ORDER BY avg_virality DESC NULLS LAST, video_count DESC
      `);

      const topExamples: Record<string, any[]> = {};
      for (const stat of formatStats.rows) {
        const structType = stat.structure_type as string;
        const examples = await db.execute(sql`
          SELECT v.id, v.caption, v.structure_type, v.views, v.likes, v.virality_score, v.topic_cluster
          FROM videos v
          WHERE v.classification_status = 'completed'
            AND v.structure_type = ${structType}
            ${clusterFilter}
            ${timeFilter}
          ORDER BY v.virality_score DESC NULLS LAST
          LIMIT 3
        `);
        topExamples[structType] = examples.rows;
      }

      res.json({
        topic_cluster: topicCluster || "all",
        time_window: timeWindow,
        formats: formatStats.rows.map((f: any) => ({
          structure_type: f.structure_type,
          video_count: parseInt(f.video_count),
          avg_virality: parseFloat(f.avg_virality) || 0,
          avg_engagement: parseFloat(f.avg_engagement) || 0,
          top_examples: topExamples[f.structure_type] || [],
        })),
      });
    } catch (err: any) {
      console.error("Format insights error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // ── Pattern Engine v1 (combinatorial, Taxonomy v1) ──

  app.get("/api/patterns/v1/status", verifyClassifierApiKey, async (req: any, res) => {
    try {
      const status = await isPatternEngineV1Ready();
      res.json(status);
    } catch (err: any) {
      console.error("Pattern Engine v1 status error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.post("/api/patterns/v1/compute", verifyClassifierApiKey, async (req: any, res) => {
    try {
      const result = await computeAndStorePatternsV1();
      res.json(result);
    } catch (err: any) {
      console.error("Pattern Engine v1 compute error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.get("/api/patterns/v1", verifyClassifierApiKey, async (req: any, res) => {
    try {
      const result = await computePatternsV1();
      res.json(result);
    } catch (err: any) {
      console.error("Pattern Engine v1 fetch error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // ── Dataset Quality Monitoring ──

  app.get("/api/dataset/quality", verifyClassifierApiKey, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");

      const [statusCounts] = await Promise.all([
        db.execute(sql`SELECT classification_status, COUNT(*) as count FROM videos GROUP BY classification_status ORDER BY count DESC`),
      ]);

      const clusterDist = await db.execute(sql`
        SELECT topic_cluster, COUNT(*) as count,
          ROUND(AVG(virality_score)::numeric, 2) as avg_virality,
          ROUND(AVG(engagement_rate)::numeric, 4) as avg_engagement
        FROM videos WHERE classification_status = 'completed' AND topic_cluster IS NOT NULL
        GROUP BY topic_cluster ORDER BY count DESC
      `);

      const hookDist = await db.execute(sql`
        SELECT hook_mechanism, COUNT(*) as count
        FROM videos WHERE classification_status = 'completed' AND hook_mechanism IS NOT NULL
        GROUP BY hook_mechanism ORDER BY count DESC
      `);

      const structureDist = await db.execute(sql`
        SELECT structure_type, COUNT(*) as count
        FROM videos WHERE classification_status = 'completed' AND structure_type IS NOT NULL
        GROUP BY structure_type ORDER BY count DESC
      `);

      const emotionDist = await db.execute(sql`
        SELECT emotion_primary, COUNT(*) as count
        FROM videos WHERE classification_status = 'completed' AND emotion_primary IS NOT NULL
        GROUP BY emotion_primary ORDER BY count DESC
      `);

      const hookMechanismPrimaryDist = await db.execute(sql`
        SELECT hook_mechanism_primary, COUNT(*) as count
        FROM videos WHERE classification_status = 'completed' AND hook_mechanism_primary IS NOT NULL
        GROUP BY hook_mechanism_primary ORDER BY count DESC
      `);

      const structureByCluster = await db.execute(sql`
        SELECT topic_cluster, structure_type, COUNT(*) as count
        FROM videos WHERE classification_status = 'completed' AND topic_cluster IS NOT NULL AND structure_type IS NOT NULL
        GROUP BY topic_cluster, structure_type ORDER BY topic_cluster, count DESC
      `);

      const [totalRow] = (await db.execute(sql`SELECT COUNT(*) as count FROM videos`)).rows;
      const [completedRow] = (await db.execute(sql`SELECT COUNT(*) as count FROM videos WHERE classification_status = 'completed'`)).rows;
      const [withClusterRow] = (await db.execute(sql`SELECT COUNT(*) as count FROM videos WHERE classification_status = 'completed' AND topic_cluster IS NOT NULL`)).rows;
      const [failedRow] = (await db.execute(sql`SELECT COUNT(*) as count FROM videos WHERE classification_status = 'classification_failed'`)).rows;

      const total = parseInt(totalRow.count as string);
      const completed = parseInt(completedRow.count as string);
      const withCluster = parseInt(withClusterRow.count as string);
      const failed = parseInt(failedRow.count as string);

      res.json({
        summary: {
          total_videos: total,
          completed,
          with_topic_cluster: withCluster,
          without_topic_cluster: completed - withCluster,
          classification_failed: failed,
          completion_rate: total > 0 ? `${Math.round((completed / total) * 100)}%` : "0%",
          cluster_coverage: completed > 0 ? `${Math.round((withCluster / completed) * 100)}%` : "0%",
        },
        classification_status: statusCounts.rows,
        distributions: {
          topic_cluster: clusterDist.rows,
          hook_mechanism: hookDist.rows,
          hook_mechanism_primary: hookMechanismPrimaryDist.rows,
          structure_type: structureDist.rows,
          emotion_primary: emotionDist.rows,
          structure_by_cluster: structureByCluster.rows,
        },
      });
    } catch (err: any) {
      console.error("Dataset quality error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  return httpServer;
}
