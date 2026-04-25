import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";

function computeSignalStrength(pattern: {
  video_count: number | null;
  velocity_7d: number | null;
  cluster_level?: 2 | 3 | null;
  platform?: string | null;
}): 'strong' | 'building' | 'emerging' {
  const count = pattern.video_count ?? 0;
  const velocity = pattern.velocity_7d ?? 0;
  const level = pattern.cluster_level ?? 2;
  const platform = pattern.platform ?? 'tiktok';

  const baseStrong   = level === 3 ? 25 : 40;
  const baseBuilding = level === 3 ? 10 : 15;

  const multiplier =
    platform === 'tiktok'  ? 1.2 :
    platform === 'shorts'  ? 0.8 : 1.0;

  const thresholdStrong   = Math.round(baseStrong   * multiplier);
  const thresholdBuilding = Math.round(baseBuilding * multiplier);

  if (count < thresholdBuilding) return 'emerging';
  if (count < thresholdStrong)   return 'building';
  if (velocity <= 0)             return 'building';
  return 'strong';
}

function cleanHookYear(text: string | null | undefined): string | null {
  if (!text) return text as null;
  const currentYear = new Date().getFullYear();
  return text.replace(/\b(20\d{2})\b/g, (match, yearStr) => {
    const year = parseInt(yearStr, 10);
    if (year < currentYear) return "";
    return match;
  }).replace(/\s{2,}/g, " ").replace(/\s+([!?.,:;])/g, "$1").replace(/\b(in|for|of)\s+([!?.,:;])/gi, "$2").replace(/\b(in|for|of)\s*$/gi, "").trim();
}
import { registerChatRoutes } from "./replit_integrations/chat";
import { registerImageRoutes } from "./replit_integrations/image";
import { z } from "zod";
import OpenAI from "openai";
import { scrapePublicMetadata, detectPlatform, extractCreatorHandle } from "./utils/scraper";
import { registerSyncRoutes } from "./sync-routes";
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
  registerSyncRoutes(app);

  // ─── Phase 4 SQL migrations ───────────────────────────────────────────────
  {
    const { db } = await import("./db");
    const { sql: sqlRaw } = await import("drizzle-orm");
    await db.execute(sqlRaw`
      CREATE TABLE IF NOT EXISTS user_videos (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id varchar NOT NULL,
        platform text NOT NULL,
        platform_video_id text,
        video_url text,
        thumbnail_url text,
        caption text,
        transcript text,
        views integer,
        likes integer,
        comments integer,
        shares integer,
        virality_score double precision,
        hook_type text,
        structure_type text,
        duration_seconds integer,
        published_at timestamp,
        collected_at timestamp DEFAULT NOW(),
        UNIQUE(user_id, platform_video_id)
      )
    `);
    await db.execute(sqlRaw`CREATE INDEX IF NOT EXISTS idx_user_videos_user_id ON user_videos(user_id)`);
    await db.execute(sqlRaw`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_url_tiktok text`);
    await db.execute(sqlRaw`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_url_instagram text`);
    await db.execute(sqlRaw`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_url_youtube text`);
    await db.execute(sqlRaw`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_connected boolean DEFAULT false`);
    await db.execute(sqlRaw`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_imported_at timestamp`);
    await db.execute(sqlRaw`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_videos_count integer DEFAULT 0`);
    await db.execute(sqlRaw`ALTER TABLE users ADD COLUMN IF NOT EXISTS platform_preference text DEFAULT 'tiktok'`);
    await db.execute(sqlRaw`ALTER TABLE users ADD COLUMN IF NOT EXISTS popup_skip_count integer DEFAULT 0`);
    await db.execute(sqlRaw`ALTER TABLE users ADD COLUMN IF NOT EXISTS popup_last_shown timestamp`);
    await db.execute(sqlRaw`ALTER TABLE users ADD COLUMN IF NOT EXISTS first_login boolean DEFAULT true`);
    await db.execute(sqlRaw`ALTER TABLE users ADD COLUMN IF NOT EXISTS primary_niche text`);
    await db.execute(sqlRaw`ALTER TABLE users ADD COLUMN IF NOT EXISTS content_style text`);
    await db.execute(sqlRaw`ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_signal_pattern_id text`);
    await db.execute(sqlRaw`ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_signal_date date`);
    await db.execute(sqlRaw`ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_signal_used boolean DEFAULT false`);
    await db.execute(sqlRaw`ALTER TABLE users ADD COLUMN IF NOT EXISTS platforms text[] DEFAULT '{tiktok}'`);
    await db.execute(sqlRaw`ALTER TABLE users ADD COLUMN IF NOT EXISTS liked_video_ids text[] DEFAULT '{}'`);
    await db.execute(sqlRaw`ALTER TABLE users ADD COLUMN IF NOT EXISTS active_platform text DEFAULT 'tiktok'`);
    // Videos — new columns for Pattern Engine upgrade
    await db.execute(sqlRaw`ALTER TABLE videos ADD COLUMN IF NOT EXISTS decay_weight float DEFAULT 1.0`);
    await db.execute(sqlRaw`ALTER TABLE videos ADD COLUMN IF NOT EXISTS sub_niche text`);
    await db.execute(sqlRaw`ALTER TABLE videos ADD COLUMN IF NOT EXISTS audience_gender text`);
    await db.execute(sqlRaw`ALTER TABLE videos ADD COLUMN IF NOT EXISTS audience_age_range text`);
    await db.execute(sqlRaw`ALTER TABLE videos ADD COLUMN IF NOT EXISTS is_faceless boolean DEFAULT false`);
    // Patterns — signal strength + feedback loop columns
    await db.execute(sqlRaw`ALTER TABLE patterns ADD COLUMN IF NOT EXISTS signal_strength text DEFAULT 'emerging'`);
    await db.execute(sqlRaw`ALTER TABLE patterns ADD COLUMN IF NOT EXISTS pattern_weight_adjustment float DEFAULT 1.0`);
    await db.execute(sqlRaw`ALTER TABLE patterns ADD COLUMN IF NOT EXISTS adjusted_score float`);
    // Backfill primary_niche from selected_niches[1] for users who have niches but no primary
    await db.execute(sqlRaw`
      UPDATE users
      SET primary_niche = selected_niches[1]
      WHERE primary_niche IS NULL
        AND selected_niches IS NOT NULL
        AND array_length(selected_niches, 1) > 0
    `);
    console.log('[Migrations] Phase 4 columns OK');

    // Sprint 5 — Reclassify 50 high-virality videos with taxonomy v5.0 (one-time seed)
    // Guard: only run when < 5 videos already have taxonomy_version = '5.0'
    await db.execute(sqlRaw`
      UPDATE videos
      SET classification_status = 'pending',
          classification_attempts = 0
      WHERE id IN (
        SELECT id FROM videos
        WHERE classification_status = 'completed'
          AND sub_niche IS NULL
          AND (taxonomy_version IS NULL OR taxonomy_version != '5.0')
        ORDER BY virality_score DESC NULLS LAST
        LIMIT 50
      )
      AND (SELECT COUNT(*) FROM videos WHERE taxonomy_version = '5.0') < 5
    `);
    console.log('[Migrations] Sprint 5 seed: up to 50 videos queued for taxonomy v5.0 reclassification');

    // Sprint 4 — Daily Playbook table
    await db.execute(sqlRaw`
      CREATE TABLE IF NOT EXISTS daily_playbook (
        user_id text NOT NULL,
        date date NOT NULL DEFAULT CURRENT_DATE,
        task_signal boolean DEFAULT false,
        task_patterns boolean DEFAULT false,
        task_brief boolean DEFAULT false,
        task_track boolean DEFAULT false,
        streak_count integer DEFAULT 0,
        PRIMARY KEY (user_id, date)
      )
    `);
    console.log('[Migrations] daily_playbook table OK');
  }

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

  // ─── Founder Dashboard ───

  app.get("/api/admin/founder", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");

      const planPrices: Record<string, number> = { starter: 29, pro: 69, studio: 199 };

      const [
        usersTotal, usersNew7d, sessionsActive24h, sessionsActive7d, sessionsActive30d,
        sessionsToday, eventsScripts, projectsCount, patternsUsed,
        subsActive, subsTrial, subsAll,
        videosCompleted, videosFailed, videosPending, videosIngestedToday, videosClassifiedToday,
        patternsTotal, patternsAbove70, patternsRising, patternsCrossPlatform, patternsAvgScore,
        intelEventsToday, intelPatternRuns,
        videosOverTime, patternsOverTime, crossPlatformOverTime,
        videosTotal, creatorsKnown, creatorsUnknown, avgViewVelocity,
        lastIngestion, lastClassification, lastPatternRun,
        reproduciblePatterns, totalContentClusters
      ] = await Promise.all([
        db.execute(sql`SELECT COUNT(*) as v FROM users`),
        db.execute(sql`SELECT COUNT(*) as v FROM users WHERE created_at >= NOW() - INTERVAL '7 days'`),
        db.execute(sql`SELECT COUNT(DISTINCT (sess->'passport'->>'user')) as v FROM sessions WHERE expire > NOW() AND expire > NOW() - INTERVAL '24 hours'`),
        db.execute(sql`SELECT COUNT(DISTINCT (sess->'passport'->>'user')) as v FROM sessions WHERE expire > NOW() AND expire > NOW() - INTERVAL '7 days'`),
        db.execute(sql`SELECT COUNT(DISTINCT (sess->'passport'->>'user')) as v FROM sessions WHERE expire > NOW() AND expire > NOW() - INTERVAL '30 days'`),
        db.execute(sql`SELECT COUNT(*) as v FROM sessions WHERE expire > NOW() AND expire > NOW() - INTERVAL '24 hours'`),
        db.execute(sql`SELECT COUNT(*) as v FROM events WHERE event_name ILIKE '%script%' OR event_name ILIKE '%generate%'`),
        db.execute(sql`SELECT COUNT(*) as v FROM content_projects`),
        db.execute(sql`SELECT COUNT(*) as v FROM events WHERE event_name ILIKE '%pattern%' OR event_name ILIKE '%template%'`),
        db.execute(sql`SELECT COUNT(*) as v FROM subscriptions WHERE billing_status = 'active'`),
        db.execute(sql`SELECT COUNT(*) as v FROM subscriptions WHERE billing_status = 'trialing'`),
        db.execute(sql`SELECT plan, COUNT(*) as cnt FROM subscriptions WHERE billing_status IN ('active', 'trialing') GROUP BY plan`),
        db.execute(sql`SELECT COUNT(*) as v FROM videos WHERE classification_status = 'completed'`),
        db.execute(sql`SELECT COUNT(*) as v FROM videos WHERE classification_status = 'failed'`),
        db.execute(sql`SELECT COUNT(*) as v FROM videos WHERE classification_status = 'pending'`),
        db.execute(sql`SELECT COUNT(*) as v FROM videos WHERE collected_at >= NOW() - INTERVAL '24 hours'`),
        db.execute(sql`SELECT COUNT(*) as v FROM videos WHERE classified_at >= NOW() - INTERVAL '24 hours' AND classification_status = 'completed'`),
        db.execute(sql`SELECT COUNT(*) as v FROM patterns`),
        db.execute(sql`SELECT COUNT(*) as v FROM patterns WHERE COALESCE(pattern_score, avg_virality_score) >= 70`),
        db.execute(sql`SELECT COUNT(*) as v FROM patterns WHERE trend_classification = 'rising'`),
        db.execute(sql`SELECT COUNT(*) as v FROM patterns WHERE platform IS NOT NULL AND platform != ''`),
        db.execute(sql`SELECT ROUND(AVG(COALESCE(pattern_score, avg_virality_score))::numeric, 2) as v FROM patterns WHERE COALESCE(pattern_score, avg_virality_score) IS NOT NULL`),
        db.execute(sql`SELECT COUNT(*) as v FROM intelligence_events WHERE created_at >= NOW() - INTERVAL '24 hours'`),
        db.execute(sql`SELECT COUNT(*) as v FROM intelligence_events WHERE event_type = 'PATTERN_DETECTED'`),
        db.execute(sql`
          SELECT d.day::date as date, COALESCE(c.cnt, 0) as count
          FROM generate_series(NOW() - INTERVAL '30 days', NOW(), '1 day') d(day)
          LEFT JOIN (
            SELECT DATE(classified_at) as day, COUNT(*) as cnt
            FROM videos WHERE classification_status = 'completed' AND classified_at >= NOW() - INTERVAL '30 days'
            GROUP BY DATE(classified_at)
          ) c ON d.day::date = c.day
          ORDER BY d.day
        `),
        db.execute(sql`
          SELECT d.day::date as date, COALESCE(c.cnt, 0) as count
          FROM generate_series(NOW() - INTERVAL '30 days', NOW(), '1 day') d(day)
          LEFT JOIN (
            SELECT DATE(last_updated) as day, COUNT(*) as cnt
            FROM patterns WHERE last_updated >= NOW() - INTERVAL '30 days'
            GROUP BY DATE(last_updated)
          ) c ON d.day::date = c.day
          ORDER BY d.day
        `),
        db.execute(sql`
          SELECT d.day::date as date, COALESCE(c.cnt, 0) as count
          FROM generate_series(NOW() - INTERVAL '30 days', NOW(), '1 day') d(day)
          LEFT JOIN (
            SELECT DATE(last_updated) as day, COUNT(*) as cnt
            FROM patterns WHERE platform IS NOT NULL AND platform != '' AND last_updated >= NOW() - INTERVAL '30 days'
            GROUP BY DATE(last_updated)
          ) c ON d.day::date = c.day
          ORDER BY d.day
        `),
        db.execute(sql`SELECT COUNT(*) as v FROM videos`),
        db.execute(sql`SELECT COUNT(*) as v FROM videos WHERE classification_status = 'completed' AND creator_name IS NOT NULL AND creator_name != 'unknown' AND creator_name != ''`),
        db.execute(sql`SELECT COUNT(*) as v FROM videos WHERE classification_status = 'completed' AND (creator_name IS NULL OR creator_name = 'unknown' OR creator_name = '')`),
        db.execute(sql`SELECT ROUND(AVG(view_velocity)::numeric, 2) as v FROM videos WHERE classification_status = 'completed' AND view_velocity IS NOT NULL AND view_velocity != 5000`),
        db.execute(sql`SELECT MAX(collected_at) as v FROM videos`),
        db.execute(sql`SELECT MAX(classified_at) as v FROM videos WHERE classification_status = 'completed'`),
        db.execute(sql`SELECT MAX(last_updated) as v FROM patterns`),
        db.execute(sql`
          SELECT COUNT(*) as v FROM content_clusters
          WHERE analyzed_by_llm = true
            AND array_length(video_ids, 1) >= 6
            AND density_score IS NOT NULL
            AND density_score > 50
        `),
        db.execute(sql`SELECT COUNT(*) as v FROM content_clusters WHERE analyzed_by_llm = true`),
      ]);

      const v = (r: any) => parseInt((r.rows[0] as any)?.v || '0');
      const vf = (r: any) => parseFloat((r.rows[0] as any)?.v || '0');

      const totalUsers = v(usersTotal);
      const activeUsers24h = v(sessionsActive24h);
      const activeUsers7d = v(sessionsActive7d);
      const monthlyActiveUsers = v(sessionsActive30d);
      const dauMauRatio = monthlyActiveUsers > 0 ? Math.round((activeUsers24h / monthlyActiveUsers) * 100) / 100 : 0;

      const totalCompleted = v(videosCompleted);
      const totalFailed = v(videosFailed);
      const classifierSuccessRate = (totalCompleted + totalFailed) > 0
        ? Math.round((totalCompleted / (totalCompleted + totalFailed)) * 10000) / 10000
        : 0;

      const activeSubsCount = v(subsActive);
      let mrr = 0;
      for (const row of subsAll.rows as any[]) {
        mrr += (planPrices[row.plan] || 0) * parseInt(row.cnt);
      }
      const arpu = totalUsers > 0 ? Math.round((mrr / totalUsers) * 100) / 100 : 0;
      const trialCount = v(subsTrial);
      const trialToPaidRate = (activeSubsCount + trialCount) > 0
        ? Math.round((activeSubsCount / (activeSubsCount + trialCount)) * 10000) / 10000
        : 0;

      const totalPatterns = v(patternsTotal);
      const patternReuseRate = totalPatterns > 0 ? Math.round((v(patternsUsed) / totalPatterns) * 10000) / 10000 : 0;

      const crossPlatformPatternsCount = v(patternsCrossPlatform);
      const crossPlatformRate = totalPatterns > 0 ? Math.round((crossPlatformPatternsCount / totalPatterns) * 10000) / 10000 : 0;

      const chartVideos = videosOverTime.rows.map((r: any) => ({ date: r.date, count: parseInt(r.count) }));
      const chartPatterns = patternsOverTime.rows.map((r: any) => ({ date: r.date, count: parseInt(r.count) }));
      const chartCrossPlatform = crossPlatformOverTime.rows.map((r: any) => ({ date: r.date, count: parseInt(r.count) }));

      let cumulativeReuse = 0;
      const chartReuse = chartPatterns.map((p: any, i: number) => {
        cumulativeReuse += p.count > 0 ? 1 : 0;
        return { date: p.date, rate: totalPatterns > 0 ? Math.round((cumulativeReuse / Math.max(1, i + 1)) * 100) / 100 : 0 };
      });

      res.json({
        users: {
          total_users: totalUsers,
          new_users_7d: v(usersNew7d),
          active_users_24h: activeUsers24h,
          active_users_7d: activeUsers7d,
          monthly_active_users: monthlyActiveUsers,
          dau_mau_ratio: dauMauRatio,
          returning_users_rate: totalUsers > 0 ? Math.round((activeUsers7d / totalUsers) * 10000) / 10000 : 0,
        },
        usage: {
          sessions_today: v(sessionsToday),
          avg_session_duration: 30,
          scripts_generated: v(eventsScripts),
          projects_created: v(projectsCount),
          patterns_used_in_create: v(patternsUsed),
        },
        revenue: {
          active_subscriptions: activeSubsCount,
          mrr,
          mrr_growth_30d: 0,
          arpu,
          active_trials: trialCount,
          trial_to_paid_conversion_rate: trialToPaidRate,
        },
        engine: {
          total_videos_analysed: totalCompleted,
          videos_ingested_today: v(videosIngestedToday),
          videos_classified_today: v(videosClassifiedToday),
          total_patterns_detected: totalPatterns,
          patterns_score_above_70: v(patternsAbove70),
          pattern_reuse_rate: patternReuseRate,
          cross_platform_pattern_rate: crossPlatformRate,
          cross_platform_patterns_count: crossPlatformPatternsCount,
          rising_patterns_count: v(patternsRising),
          average_pattern_score: vf(patternsAvgScore),
        },
        dataset_health: {
          total_videos: v(videosTotal),
          classified_videos: totalCompleted,
          pending_videos: v(videosPending),
          failed_videos: totalFailed,
          videos_last_24h: v(videosIngestedToday),
          creator_coverage: totalCompleted > 0 ? Math.round((v(creatorsKnown) / totalCompleted) * 10000) / 10000 : 0,
          unknown_creators: totalCompleted > 0 ? Math.round((v(creatorsUnknown) / totalCompleted) * 10000) / 10000 : 0,
          avg_view_velocity: vf(avgViewVelocity),
          reproducible_patterns: v(reproduciblePatterns),
          total_analyzed_clusters: v(totalContentClusters),
          reproducibility_rate: v(totalContentClusters) > 0
            ? Math.round((v(reproduciblePatterns) / v(totalContentClusters)) * 10000) / 10000
            : 0,
        },
        pipeline_status: {
          last_ingestion_run: (lastIngestion.rows[0] as any)?.v || null,
          last_classification_run: (lastClassification.rows[0] as any)?.v || null,
          last_pattern_engine_run: (lastPatternRun.rows[0] as any)?.v || null,
        },
        system_health: {
          ingestion_runs_today: v(intelEventsToday),
          classifier_success_rate: classifierSuccessRate,
          pattern_engine_runs: v(intelPatternRuns),
          alerts_triggered: v(intelEventsToday),
        },
        charts: {
          videos_over_time: chartVideos,
          patterns_over_time: chartPatterns,
          pattern_reuse_over_time: chartReuse,
          cross_platform_over_time: chartCrossPlatform,
        },
      });
    } catch (err: any) {
      console.error("Founder dashboard error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
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

  // ─── GET /api/dashboard — Aggregated dashboard data (single call) ───

  app.get("/api/dashboard", isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");

      const [
        trendingVideosResult,
        topHooksResult,
        topFormatsResult,
        topPatternsResult,
        alertsResult,
        dailyViralPlayResult,
      ] = await Promise.all([
        db.execute(sql`
          SELECT id, caption, platform, creator_name, views, likes, comments,
                 virality_score, NULLIF(view_velocity, 5000) as view_velocity, thumbnail_url, hook_text,
                 hook_mechanism_primary, structure_type, topic_cluster, classified_at
          FROM videos
          WHERE classification_status = 'completed' AND virality_score IS NOT NULL
          ORDER BY virality_score DESC NULLS LAST
          LIMIT 10
        `),
        db.execute(sql`
          SELECT hook_text, hook_mechanism_primary, COUNT(*) as count,
                 ROUND(AVG(virality_score)::numeric, 2) as avg_virality
          FROM videos
          WHERE classification_status = 'completed' AND hook_text IS NOT NULL
          GROUP BY hook_text, hook_mechanism_primary
          ORDER BY count DESC, avg_virality DESC NULLS LAST
          LIMIT 5
        `),
        db.execute(sql`
          SELECT structure_type, COUNT(*) as count,
                 ROUND(AVG(virality_score)::numeric, 2) as avg_virality
          FROM videos
          WHERE classification_status = 'completed' AND structure_type IS NOT NULL
          GROUP BY structure_type
          ORDER BY count DESC, avg_virality DESC NULLS LAST
          LIMIT 5
        `),
        db.execute(sql`
          SELECT pattern_id, hook_type, structure_type, topic_cluster,
                 avg_virality_score, video_count, pattern_label, performance_rank,
                 pattern_score, adjusted_score, signal_strength, velocity_mid, pattern_novelty, trend_classification
          FROM patterns
          WHERE avg_virality_score IS NOT NULL
          ORDER BY COALESCE(adjusted_score, pattern_score, avg_virality_score) DESC
          LIMIT 5
        `),
        db.execute(sql`
          SELECT id, event_type, title, description, metadata, created_at
          FROM intelligence_events
          ORDER BY created_at DESC
          LIMIT 5
        `),
        (async () => {
          const qualified = await db.execute(sql`
            SELECT pattern_id, hook_type, structure_type, topic_cluster,
                   pattern_score, velocity_mid, pattern_novelty, trend_classification,
                   avg_virality_score, video_count, pattern_label
            FROM patterns
            WHERE pattern_score >= 70 AND trend_classification = 'rising'
            ORDER BY pattern_score DESC, velocity_mid DESC NULLS LAST, pattern_novelty DESC NULLS LAST
            LIMIT 1
          `);
          if (qualified.rows.length > 0) return qualified;
          return db.execute(sql`
            SELECT pattern_id, hook_type, structure_type, topic_cluster,
                   pattern_score, velocity_mid, pattern_novelty, trend_classification,
                   avg_virality_score, video_count, pattern_label
            FROM patterns
            WHERE avg_virality_score IS NOT NULL
            ORDER BY avg_virality_score DESC
            LIMIT 1
          `);
        })(),
      ]);

      let dailyViralPlay = null;
      if (dailyViralPlayResult.rows.length > 0) {
        const p: any = dailyViralPlayResult.rows[0];
        const score = p.pattern_score ?? p.avg_virality_score ?? 0;
        const exampleHookResult = await db.execute(sql`
          SELECT hook_text FROM videos
          WHERE classification_status = 'completed'
            AND hook_text IS NOT NULL
            AND (${p.hook_type ? sql`hook_mechanism_primary = ${p.hook_type}` : sql`TRUE`})
            AND (${p.structure_type ? sql`structure_type = ${p.structure_type}` : sql`TRUE`})
            AND (${p.topic_cluster ? sql`topic_cluster = ${p.topic_cluster}` : sql`TRUE`})
          ORDER BY virality_score DESC NULLS LAST
          LIMIT 1
        `);

        const exampleHook = exampleHookResult.rows.length > 0 ? cleanHookYear((exampleHookResult.rows[0] as any).hook_text) : null;
        const isQualified = p.pattern_score >= 70 && p.trend_classification === 'rising';

        dailyViralPlay = {
          pattern_id: p.pattern_id,
          hook_type: p.hook_type,
          structure_type: p.structure_type,
          topic_cluster: p.topic_cluster,
          pattern_score: score,
          video_count: p.video_count,
          pattern_label: p.pattern_label,
          velocity_mid: p.velocity_mid,
          pattern_novelty: p.pattern_novelty,
          trend_classification: p.trend_classification,
          example_hook: exampleHook,
          reasoning: isQualified
            ? `This ${p.hook_type || 'hook'} + ${p.structure_type || 'format'} combo is rising with a pattern score of ${Math.round(score)} and ${p.video_count} videos detected. High velocity and novelty make it today's best play.`
            : `Best performing pattern: ${p.pattern_label || `${p.hook_type || 'Any hook'} + ${p.structure_type || 'Any format'}`} with ${p.video_count} videos and ${Math.round(score)} avg virality.`,
        };
      }

      res.json({
        trending_videos: trendingVideosResult.rows,
        daily_viral_play: dailyViralPlay,
        top_patterns: topPatternsResult.rows,
        top_hooks: topHooksResult.rows,
        top_formats: topFormatsResult.rows,
        alerts: alertsResult.rows.map((e: any) => ({
          id: e.id,
          eventType: e.event_type,
          title: e.title,
          description: e.description,
          metadata: e.metadata,
          createdAt: e.created_at,
        })),
      });
    } catch (err: any) {
      console.error("Dashboard endpoint error:", err);
      res.status(500).json({ message: "Internal Error" });
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

      const emergingTrends = await db.execute(sql`
        SELECT topic_cluster, hook_mechanism_primary, structure_type,
          COUNT(*) as video_count,
          ROUND(AVG(virality_score)::numeric, 2) as avg_virality,
          MAX(classified_at) as latest_at
        FROM videos
        WHERE classification_status = 'completed'
          AND classified_at >= NOW() - INTERVAL '7 days'
          AND topic_cluster IS NOT NULL${nicheFilter}
        GROUP BY topic_cluster, hook_mechanism_primary, structure_type
        HAVING COUNT(*) >= 2
        ORDER BY avg_virality DESC NULLS LAST, video_count DESC
        LIMIT 10
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
        emerging_trends: emergingTrends.rows,
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
        hook: cleanHookYear(p.hook_text),
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
      const platform = req.query.platform as string | undefined;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
      const offset = (page - 1) * limit;

      let nicheFilter = sql``;
      if (niche) nicheFilter = sql` AND topic_cluster = ${niche}`;
      if (platform) nicheFilter = sql`${nicheFilter} AND platform = ${platform}`;

      const [countRow] = (await db.execute(sql`
        SELECT COUNT(DISTINCT (creator_name, platform)) as count
        FROM videos
        WHERE classification_status = 'completed' AND creator_name IS NOT NULL${nicheFilter}
      `)).rows;

      const creators = await db.execute(sql`
        SELECT creator_name, platform,
          COUNT(*) as video_count,
          SUM(views) as views_total,
          ROUND(AVG(views)::numeric, 0) as avg_views,
          ROUND(AVG(virality_score)::numeric, 2) as avg_virality,
          ROUND(AVG(engagement_rate)::numeric, 4) as avg_engagement,
          MAX(topic_cluster) as niche,
          SUM(CASE WHEN virality_score > 50 THEN 1 ELSE 0 END) as viral_videos,
          ROUND(AVG(view_velocity)::numeric, 2) as avg_velocity
        FROM videos
        WHERE classification_status = 'completed' AND creator_name IS NOT NULL${nicheFilter}
        GROUP BY creator_name, platform
        ORDER BY avg_virality DESC NULLS LAST
        LIMIT ${limit} OFFSET ${offset}
      `);

      res.json({
        creators: creators.rows,
        total: parseInt(countRow.count as string),
        page,
        pages: Math.ceil(parseInt(countRow.count as string) / limit),
      });
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
      const hookType = req.query.hook_type as string | undefined;
      const structureType = req.query.structure_type as string | undefined;
      const minTrendScore = req.query.min_trend_score ? parseFloat(req.query.min_trend_score as string) : undefined;
      const maxTrendScore = req.query.max_trend_score ? parseFloat(req.query.max_trend_score as string) : undefined;
      const minVelocity = req.query.min_velocity ? parseFloat(req.query.min_velocity as string) : undefined;
      const sortBy = req.query.sort as string || "virality";
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
      const offset = (page - 1) * limit;

      let filters = sql`WHERE classification_status = 'completed'`;
      if (niche) filters = sql`${filters} AND topic_cluster = ${niche}`;
      if (platform) filters = sql`${filters} AND platform = ${platform}`;
      if (hookType) filters = sql`${filters} AND hook_mechanism_primary = ${hookType}`;
      if (structureType) filters = sql`${filters} AND structure_type = ${structureType}`;
      if (minTrendScore !== undefined) filters = sql`${filters} AND virality_score >= ${minTrendScore}`;
      if (maxTrendScore !== undefined) filters = sql`${filters} AND virality_score <= ${maxTrendScore}`;
      if (minVelocity !== undefined) filters = sql`${filters} AND view_velocity >= ${minVelocity}`;

      let orderBy = sql`ORDER BY virality_score DESC NULLS LAST`;
      if (sortBy === "views") orderBy = sql`ORDER BY views DESC NULLS LAST`;
      else if (sortBy === "velocity") orderBy = sql`ORDER BY view_velocity DESC NULLS LAST`;
      else if (sortBy === "engagement") orderBy = sql`ORDER BY engagement_rate DESC NULLS LAST`;
      else if (sortBy === "recent") orderBy = sql`ORDER BY classified_at DESC NULLS LAST`;

      const [countRow] = (await db.execute(sql`SELECT COUNT(*) as count FROM videos ${filters}`)).rows;
      const videos = await db.execute(sql`
        SELECT id, caption, platform, creator_name, views, likes, comments, shares,
          engagement_rate, virality_score, topic_cluster, structure_type,
          hook_mechanism_primary, hook_text, duration_bucket, classified_at,
          NULLIF(view_velocity, 5000) as view_velocity
        FROM videos ${filters}
        ${orderBy}
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
      const source = req.query.source as string | undefined;

      if (source === "table") {
        let nicheFilter = sql``;
        if (niche) nicheFilter = sql` AND topic_cluster = ${niche}`;

        const patternsFromTable = await db.execute(sql`
          SELECT pattern_id, hook_type, structure_type, topic_cluster,
                 avg_virality_score, video_count, pattern_label, performance_rank,
                 pattern_score, adjusted_score, signal_strength, velocity_mid, pattern_novelty, trend_classification
          FROM patterns
          WHERE avg_virality_score IS NOT NULL ${nicheFilter}
          ORDER BY COALESCE(adjusted_score, pattern_score, avg_virality_score) DESC
          LIMIT 30
        `);
        return res.json({ patterns: patternsFromTable.rows });
      }

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
      const VALID_PLATFORMS = ['tiktok', 'reels', 'shorts', 'instagram', 'youtube'];
      const input = z.object({
        selectedNiches: z.array(z.string()).max(10).optional(),
        userGoal: z.enum(["content_creator", "marketer", "business", "trend_explorer"]).optional(),
        onboardingCompleted: z.boolean().optional(),
        primaryNiche: z.string().optional(),
        secondaryNiches: z.array(z.string()).optional(),
        contentStyle: z.string().optional(),
        profileSkipped: z.boolean().optional(),
        popupSkipCount: z.number().optional(),
        notificationPrefs: z.record(z.boolean()).optional(),
        platforms: z.array(z.string()).optional(),
        active_platform: z.string().optional(),
      }).parse(req.body);
      if (input.active_platform !== undefined && !VALID_PLATFORMS.includes(input.active_platform)) {
        return res.status(400).json({ error: 'Invalid platform' });
      }

      if (input.selectedNiches !== undefined) {
        const nichesArray = `{${input.selectedNiches.join(",")}}`;
        await db.execute(sql`UPDATE users SET selected_niches = ${nichesArray}::text[] WHERE id = ${req.user.id}`);
      }
      if (input.primaryNiche !== undefined) {
        await db.execute(sql`UPDATE users SET primary_niche = ${input.primaryNiche} WHERE id = ${req.user.id}`);
      }
      if (input.contentStyle !== undefined) {
        await db.execute(sql`UPDATE users SET content_style = ${input.contentStyle} WHERE id = ${req.user.id}`);
      }
      if (input.userGoal !== undefined) {
        await db.execute(sql`UPDATE users SET user_goal = ${input.userGoal} WHERE id = ${req.user.id}`);
      }
      if (input.onboardingCompleted !== undefined) {
        await db.execute(sql`UPDATE users SET onboarding_completed = ${input.onboardingCompleted} WHERE id = ${req.user.id}`);
      }
      if (input.popupSkipCount !== undefined) {
        await db.execute(sql`UPDATE users SET popup_skip_count = ${input.popupSkipCount}, popup_last_shown = NOW() WHERE id = ${req.user.id}`);
      }
      if (input.platforms !== undefined && input.platforms.length > 0) {
        const platformsArray = `{${input.platforms.join(',')}}`;
        await db.execute(sql`UPDATE users SET platforms = ${platformsArray}::text[] WHERE id = ${req.user.id}`);
      }
      if (input.active_platform !== undefined) {
        await db.execute(sql`UPDATE users SET active_platform = ${input.active_platform} WHERE id = ${req.user.id}`);
      }

      res.json({ success: true });
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      console.error("Preferences error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // ─── Onboarding — Generate Viral Idea ───

  app.post("/api/onboarding/generate-idea", isAuthenticated, async (req: any, res) => {
    try {
      const input = z.object({
        niches: z.array(z.string()).min(1).max(3),
        creatorType: z.string(),
      }).parse(req.body);

      const creditResult = await deductCredits(req.user.id, "idea");
      if (!creditResult.ok) {
        return res.status(402).json({ message: creditResult.error, creditsRemaining: creditResult.remaining });
      }

      const nichesText = input.niches.map(n => n.replace(/_/g, " ")).join(", ");
      const profileText = input.creatorType.replace(/_/g, " ");

      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        temperature: 0.9,
        max_tokens: 300,
        messages: [
          {
            role: "system",
            content: `You are a viral video strategist. Generate ONE viral video idea based on the user's niches and profile. Return ONLY valid JSON with these fields:
- "topic": the specific topic/niche for this idea (one of: ${input.niches.join(", ")})
- "hook": a compelling hook text (the first sentence viewers see, in quotes style, max 15 words)
- "format": the video format (one of: listicle, tutorial, story, comparison, challenge, reaction, behind_the_scenes, tips, transformation, explainer)
- "structure": brief video structure description (3-4 bullet points as a single string separated by " → ")
No markdown, no explanation, just the JSON object.`,
          },
          {
            role: "user",
            content: `Generate a viral video idea for a ${profileText} who creates content about: ${nichesText}`,
          },
        ],
      });

      const raw = completion.choices[0]?.message?.content?.trim() || "{}";
      let idea: any;
      try {
        const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        idea = JSON.parse(cleaned);
      } catch {
        idea = {};
      }

      const allowedFormats = ["listicle", "tutorial", "story", "comparison", "challenge", "reaction", "behind_the_scenes", "tips", "transformation", "explainer"];
      const topic = (typeof idea.topic === "string" && input.niches.includes(idea.topic)) ? idea.topic : input.niches[0];
      const hook = cleanHookYear((typeof idea.hook === "string" && idea.hook.length > 3 && idea.hook.length < 200) ? idea.hook : "3 AI tools nobody talks about");
      const format = (typeof idea.format === "string" && allowedFormats.includes(idea.format)) ? idea.format : "listicle";
      const structure = (typeof idea.structure === "string" && idea.structure.length > 3) ? idea.structure.slice(0, 300) : "Hook → Content → CTA";

      const viralityScore = Math.floor(Math.random() * 20) + 72;

      res.json({ topic, hook, format, structure, viralityScore });
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      console.error("Onboarding generate-idea error:", err);
      res.status(500).json({ message: "Failed to generate idea" });
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

        const fastestGrowingVideos = await db.execute(sql`
          SELECT id, caption, creator_name, views, view_velocity, virality_score, platform
          FROM videos WHERE classification_status = 'completed' AND topic_cluster = ${niche}
            AND view_velocity IS NOT NULL AND view_velocity > 0
          ORDER BY view_velocity DESC LIMIT 3
        `);

        const emergingPatterns = await db.execute(sql`
          SELECT hook_mechanism_primary, structure_type, COUNT(*) as count,
            ROUND(AVG(virality_score)::numeric, 2) as avg_virality
          FROM videos WHERE classification_status = 'completed' AND topic_cluster = ${niche}
            AND classified_at >= NOW() - INTERVAL '7 days'
            AND hook_mechanism_primary IS NOT NULL
          GROUP BY hook_mechanism_primary, structure_type
          HAVING COUNT(*) >= 2
          ORDER BY avg_virality DESC NULLS LAST LIMIT 3
        `);

        nicheDetails.push({
          niche,
          video_count: parseInt(n.count as string),
          avg_virality: parseFloat(n.avg_virality as string) || 0,
          avg_engagement: parseFloat(n.avg_engagement as string) || 0,
          top_hooks: topHooks.rows,
          top_formats: topFormats.rows,
          top_creators: topCreators.rows,
          fastest_growing_videos: fastestGrowingVideos.rows,
          emerging_patterns: emergingPatterns.rows,
        });
      }

      res.json({ niches: nicheDetails });
    } catch (err: any) {
      console.error("Niches overview error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // ─── Classifier API (external agent) ───

  const rateLimitStore: Record<string, { count: number; resetAt: number }> = {};
  function classifierRateLimit(req: any, res: any, next: any) {
    const key = req.headers["x-api-key"] || req.ip;
    const now = Date.now();
    if (!rateLimitStore[key] || rateLimitStore[key].resetAt < now) {
      rateLimitStore[key] = { count: 0, resetAt: now + 60000 };
    }
    rateLimitStore[key].count++;
    const remaining = 100 - rateLimitStore[key].count;
    res.setHeader("X-RateLimit-Limit", "100");
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, remaining)));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(rateLimitStore[key].resetAt / 1000)));
    if (rateLimitStore[key].count > 100) {
      return res.status(429).json({ message: "Rate limit exceeded. Max 100 requests per minute.", retry_after_seconds: Math.ceil((rateLimitStore[key].resetAt - now) / 1000) });
    }
    next();
  }

  function verifyClassifierApiKey(req: any, res: any, next: any) {
    const apiKey = req.headers["x-api-key"];
    const expectedKey = process.env.CLASSIFIER_API_KEY;
    if (!expectedKey || apiKey !== expectedKey) {
      return res.status(401).json({ message: "Invalid or missing API key" });
    }
    classifierRateLimit(req, res, next);
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
          creator_url: z.string().optional(),
          creator_platform_id: z.string().optional(),
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
          creatorUrl: v.creator_url || null,
          creatorPlatformId: v.creator_platform_id || null,
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

  app.post("/api/videos/reset-processing", verifyClassifierApiKey, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      const result = await db.execute(sql`
        UPDATE videos
        SET classification_status = 'pending', classification_started_at = NULL
        WHERE classification_status = 'processing'
        RETURNING id
      `);
      res.json({ reset: result.rows.length, message: `${result.rows.length} videos reset from processing to pending` });
    } catch (err: any) {
      console.error("Reset processing error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.post("/api/videos/reset-incomplete", verifyClassifierApiKey, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      const result = await db.execute(sql`
        UPDATE videos
        SET classification_status = 'pending'
        WHERE classification_status = 'completed'
          AND (
            topic_cluster IS NULL OR topic_cluster = ''
            OR hook_mechanism_primary IS NULL OR hook_mechanism_primary = ''
            OR structure_type IS NULL OR structure_type = ''
            OR creator_name IS NULL OR creator_name = ''
          )
        RETURNING id
      `);
      res.json({ reset: result.rows.length, message: `${result.rows.length} incomplete videos reset to pending` });
    } catch (err: any) {
      console.error("Reset incomplete error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.get("/api/videos/classified", verifyClassifierApiKey, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 200);
      const missingFields = req.query.missing_fields === "true";

      let query;
      if (missingFields) {
        query = sql`
          SELECT id, caption, transcript, hashtags, duration_seconds, platform,
            views, likes, comments, shares, creator_name, creator_niche,
            topic_cluster, structure_type, hook_mechanism_primary, hook_text,
            virality_score, view_velocity, emotion_primary, engagement_rate
          FROM videos
          WHERE classification_status = 'completed'
            AND (
              topic_cluster IS NULL
              OR structure_type IS NULL
              OR creator_name IS NULL
              OR view_velocity IS NULL
              OR hook_mechanism_primary IS NULL
            )
          ORDER BY classified_at DESC NULLS LAST
          LIMIT ${limit}
        `;
      } else {
        query = sql`
          SELECT id, caption, transcript, hashtags, duration_seconds, platform,
            views, likes, comments, shares, creator_name, creator_niche,
            topic_cluster, structure_type, hook_mechanism_primary, hook_text,
            virality_score, view_velocity, emotion_primary, engagement_rate
          FROM videos
          WHERE classification_status = 'completed'
          ORDER BY classified_at DESC NULLS LAST
          LIMIT ${limit}
        `;
      }

      const result = await db.execute(query);
      res.json({ videos: result.rows, count: result.rows.length });
    } catch (err: any) {
      console.error("Classified videos error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.post("/api/videos/classify", verifyClassifierApiKey, async (req: any, res) => {
    try {
      const input = z.object({
        video_id: z.string().min(1),
        classification: z.object({
          hook_mechanism: z.array(z.string()).optional(),
          hook_format: z.string().nullable().optional(),
          hook_text: z.string().nullable().optional(),
          hook_topic: z.string().nullable().optional(),
          emotional_trigger: z.array(z.string()).optional(),
          content_structure: z.array(z.string()).optional(),
          content_format: z.string().nullable().optional(),
          content_goal: z.string().nullable().optional(),
          visual_style: z.array(z.string()).optional(),
          storytelling_presence: z.string().nullable().optional(),
          content_pace: z.string().nullable().optional(),
          creator_archetype: z.string().nullable().optional(),
          creator_name: z.string().nullable().optional(),
          creator_url: z.string().nullable().optional(),
          creator_platform_id: z.string().nullable().optional(),
          thumbnail_url: z.string().nullable().optional(),
          structure_type: z.string().nullable().optional(),
          format_type: z.string().nullable().optional(),
          view_velocity: z.union([z.string(), z.number()]).nullable().optional(),
          trend_velocity: z.union([z.string(), z.number()]).nullable().optional(),
          engagement_rate: z.union([z.string(), z.number()]).nullable().optional(),
          engagement_ratio: z.union([z.string(), z.number()]).nullable().optional(),
          topic_category: z.string().nullable().optional(),
          topic_cluster: z.string().nullable().optional(),
          topic: z.string().nullable().optional(),
          topic_subcluster: z.string().nullable().optional(),
          call_to_action: z.string().nullable().optional(),
          controversy_level: z.string().nullable().optional(),
          information_density: z.string().nullable().optional(),
          platform: z.string().nullable().optional(),
          duration_bucket: z.string().nullable().optional(),
          pattern_notes: z.string().nullable().optional(),
        }),
      }).parse(req.body);

      const video = await storage.getVideoById(input.video_id);
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }

      const isReclassification = video.classificationStatus === "completed";

      const c = input.classification;
      const updateData: Record<string, unknown> = {};

      if ((c as any).format_type && !c.structure_type) c.structure_type = (c as any).format_type;
      if ((c as any).topic && !c.topic_cluster) c.topic_cluster = (c as any).topic;
      if ((c as any).engagement_ratio !== undefined && c.engagement_rate === undefined) c.engagement_rate = (c as any).engagement_ratio;
      if ((c as any).trend_velocity !== undefined && c.view_velocity === undefined) c.view_velocity = (c as any).trend_velocity;

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
      if (c.creator_name !== undefined && c.creator_name !== null) {
        updateData.creatorName = c.creator_name;
      }
      if (c.creator_url !== undefined && c.creator_url !== null) {
        updateData.creatorUrl = c.creator_url;
      }
      if (c.creator_platform_id !== undefined && c.creator_platform_id !== null) {
        updateData.creatorPlatformId = c.creator_platform_id;
      }
      if (c.thumbnail_url !== undefined && c.thumbnail_url !== null) {
        updateData.thumbnailUrl = c.thumbnail_url;
      }
      if (c.structure_type !== undefined && c.structure_type !== null) {
        updateData.structureType = c.structure_type;
      }
      if (c.view_velocity !== undefined && c.view_velocity !== null) {
        const parsedVelocity = typeof c.view_velocity === "number" ? c.view_velocity : parseFloat(String(c.view_velocity));
        if (!isNaN(parsedVelocity) && parsedVelocity !== 5000) {
          updateData.viewVelocity = parsedVelocity;
        }
      }
      if (c.engagement_rate !== undefined && c.engagement_rate !== null) {
        const parsedRate = typeof c.engagement_rate === "number" ? c.engagement_rate : parseFloat(String(c.engagement_rate));
        if (!isNaN(parsedRate)) {
          updateData.engagementRate = parsedRate;
        }
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
      const currentAttempts = isReclassification ? 1 : (video.classificationAttempts || 0) + 1;

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

      if (updated.classificationStatus === "completed") {
        const vScore = updated.viralityScore;
        if (vScore && vScore >= 70) {
          emitIntelligenceEvent("VIRAL_VIDEO_DETECTED",
            `Viral video detected`,
            `${updated.creatorName || "Unknown creator"} — ${updated.caption?.substring(0, 80) || "No caption"}`,
            { video_id: updated.id, virality_score: vScore, views: updated.views, platform: updated.platform, creator: updated.creatorName }
          );
        }
        if (updated.creatorName && !video.creatorName) {
          emitIntelligenceEvent("NEW_CREATOR_DETECTED",
            `New creator detected`,
            `${updated.creatorName} on ${updated.platform}`,
            { creator_name: updated.creatorName, platform: updated.platform, video_id: updated.id }
          );
        }
      }

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
      if (result && (result as any).patternsCreated > 0) {
        emitIntelligenceEvent("PATTERN_DETECTED",
          `${(result as any).patternsCreated} new patterns detected`,
          `Pattern analysis completed`,
          result
        );
      }
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
            trend_score_processed_at = NOW(),
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
        hook: cleanHookYear(o.hook),
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
          AND trend_score_processed_at IS NULL
        ORDER BY COALESCE(published_at, classified_at) DESC
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
        const videoIdsArray = a.video_ids && a.video_ids.length > 0
          ? sql`ARRAY[${sql.join(a.video_ids.map(id => sql`${id}`), sql`, `)}]::text[]`
          : sql`NULL`;
        await db.execute(sql`
          INSERT INTO trend_alerts (type, severity, title, description, niche, video_ids, metadata)
          VALUES (${a.type}, ${a.severity}, ${a.title}, ${a.description}, ${a.niche ?? null}, ${videoIdsArray}, ${a.metadata ? JSON.stringify(a.metadata) : null}::jsonb)
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
          hook_type: z.string().nullish(),
          structure_type: z.string().nullish(),
          emotion_primary: z.string().nullish(),
          topic_cluster: z.string().nullish(),
          topic_category: z.string().nullish(),
          facecam: z.boolean().nullish(),
          cut_frequency: z.string().nullish(),
          text_overlay_density: z.string().nullish(),
          platform: z.string().nullish(),
          video_count: z.number().int().min(1),
          avg_virality_score: z.number().nullish(),
          median_virality_score: z.number().nullish(),
          avg_engagement_rate: z.number().nullish(),
          performance_rank: z.number().int().nullish(),
          pattern_label: z.string().nullish(),
          pattern_score: z.number().nullish(),
          velocity_mid: z.number().nullish(),
          pattern_novelty: z.number().nullish(),
          trend_classification: z.enum(["rising", "stable", "declining"]).nullish(),
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
              pattern_score = ${p.pattern_score ?? null},
              velocity_mid = ${p.velocity_mid ?? null},
              pattern_novelty = ${p.pattern_novelty ?? null},
              trend_classification = ${p.trend_classification ?? null},
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
            INSERT INTO patterns (dimension_keys, hook_type, structure_type, emotion_primary, topic_cluster, topic_category, facecam, cut_frequency, text_overlay_density, platform, video_count, avg_virality_score, median_virality_score, avg_engagement_rate, performance_rank, pattern_label, pattern_score, velocity_mid, pattern_novelty, trend_classification)
            VALUES (${dimKeysArray}, ${p.hook_type ?? null}, ${p.structure_type ?? null}, ${p.emotion_primary ?? null}, ${p.topic_cluster ?? null}, ${p.topic_category ?? null}, ${p.facecam ?? null}, ${p.cut_frequency ?? null}, ${p.text_overlay_density ?? null}, ${p.platform ?? null}, ${p.video_count}, ${p.avg_virality_score ?? null}, ${p.median_virality_score ?? null}, ${p.avg_engagement_rate ?? null}, ${p.performance_rank ?? null}, ${p.pattern_label ?? null}, ${p.pattern_score ?? null}, ${p.velocity_mid ?? null}, ${p.pattern_novelty ?? null}, ${p.trend_classification ?? null})
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

  // ─── Viral Opportunity Engine (T002) ───

  app.get("/api/opportunities/engine", isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");

      const patterns = await db.execute(sql`
        SELECT
          topic_cluster,
          hook_text,
          hook_mechanism_primary,
          structure_type,
          COUNT(*) as video_count,
          ROUND(AVG(virality_score)::numeric, 2) as avg_virality,
          ROUND(AVG(engagement_rate)::numeric, 4) as avg_engagement,
          ROUND(AVG(view_velocity)::numeric, 2) as avg_velocity,
          SUM(views) as total_views,
          COUNT(DISTINCT platform) as platform_count
        FROM videos
        WHERE classification_status = 'completed'
          AND topic_cluster IS NOT NULL
          AND hook_text IS NOT NULL
          AND structure_type IS NOT NULL
        GROUP BY topic_cluster, hook_text, hook_mechanism_primary, structure_type
        HAVING COUNT(*) >= 2
        ORDER BY avg_virality DESC NULLS LAST
        LIMIT 20
      `);

      const opportunities = patterns.rows.map((p: any) => {
        const viralityScore = parseFloat(p.avg_virality) || 0;
        const engagement = parseFloat(p.avg_engagement) || 0;
        const velocity = parseFloat(p.avg_velocity) || 0;
        const videoCount = parseInt(p.video_count) || 0;
        const platformCount = parseInt(p.platform_count) || 1;

        const viralityComponent = Math.min(viralityScore * 10, 40);
        const engagementComponent = Math.min(engagement * 500, 20);
        const velocityComponent = Math.min(velocity / 100, 15);
        const repetitionComponent = Math.min(videoCount * 3, 15);
        const crossPlatformComponent = platformCount > 1 ? 10 : 0;

        const opportunityScore = Math.round(
          Math.min(viralityComponent + engagementComponent + velocityComponent + repetitionComponent + crossPlatformComponent, 100)
        );

        return {
          hook: cleanHookYear(p.hook_text),
          format: p.structure_type,
          topic: p.topic_cluster,
          hook_mechanism: p.hook_mechanism_primary,
          opportunity_score: opportunityScore,
          velocity: velocity,
          videos_detected: videoCount,
          avg_engagement: engagement,
          total_views: parseInt(p.total_views) || 0,
        };
      });

      opportunities.sort((a: any, b: any) => b.opportunity_score - a.opportunity_score);

      res.json({ opportunities: opportunities.slice(0, 5) });
    } catch (err: any) {
      console.error("Opportunity engine error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // ─── Ideas API (T002) ───

  app.get("/api/ideas", isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { savedIdeas } = await import("@shared/schema");
      const { eq, desc } = await import("drizzle-orm");
      const ideas = await db.select().from(savedIdeas).where(eq(savedIdeas.userId, req.user.id)).orderBy(desc(savedIdeas.createdAt));
      res.json(ideas);
    } catch (err: any) {
      console.error("Ideas fetch error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.post("/api/ideas/save", isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { savedIdeas } = await import("@shared/schema");
      const input = z.object({
        hook: z.string().min(1),
        format: z.string().optional(),
        topic: z.string().optional(),
        opportunityScore: z.number().optional(),
        velocity: z.number().optional(),
        videosDetected: z.number().optional(),
      }).parse(req.body);

      const [idea] = await db.insert(savedIdeas).values({
        userId: req.user.id,
        hook: input.hook,
        format: input.format || null,
        topic: input.topic || null,
        opportunityScore: input.opportunityScore || null,
        velocity: input.velocity || null,
        videosDetected: input.videosDetected || null,
        status: "saved",
      }).returning();

      res.status(201).json(idea);
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      console.error("Ideas save error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.post("/api/ideas/dismiss", isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { savedIdeas } = await import("@shared/schema");
      const { eq, and } = await import("drizzle-orm");
      const { id } = z.object({ id: z.string() }).parse(req.body);
      await db.update(savedIdeas).set({ status: "dismissed" }).where(and(eq(savedIdeas.id, id), eq(savedIdeas.userId, req.user.id)));
      res.json({ success: true });
    } catch (err: any) {
      console.error("Ideas dismiss error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // ─── Script Generator AI (T003) ───

  app.post("/api/generate/script", isAuthenticated, async (req: any, res) => {
    try {
      const input = z.object({
        hook: z.string().min(1),
        format: z.string().optional(),
        topic: z.string().optional(),
        context: z.string().optional(),
      }).parse(req.body);

      const creditResult = await deductCredits(req.user.id, "script");
      if (!creditResult.ok) {
        return res.status(402).json({ message: creditResult.error, creditsRemaining: creditResult.remaining });
      }

      const systemPrompt = `You are a viral content scriptwriter. Generate a complete video script optimized for virality.
Return a JSON object with exactly these fields:
- hook_line: The opening hook line that grabs attention (1-2 sentences, spoken directly to camera)
- scene_1: First main content section (2-4 sentences, the setup or first point)
- scene_2: Second main content section (2-4 sentences, the core value or second point)
- scene_3: Third main content section (2-4 sentences, the proof or third point)
- cta: A compelling call-to-action closing (1-2 sentences)
- hook_variations: An array of exactly 3 alternative hook lines
- structure: The video structure breakdown (e.g., "Hook → Problem → Solution → CTA")
Each scene should be written as spoken script, not descriptions. Keep it conversational and punchy.`;

      const userPrompt = `Create a viral video script with:
Hook: "${input.hook}"
${input.format ? `Format: ${input.format}` : ""}
${input.topic ? `Topic: ${input.topic}` : ""}
${input.context ? `Additional context: ${input.context}` : ""}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.8,
      });

      const result = JSON.parse(completion.choices[0].message.content || "{}");
      if (result.hook_line) result.hook_line = cleanHookYear(result.hook_line);
      if (Array.isArray(result.hook_variations)) {
        result.hook_variations = result.hook_variations.map((h: string) => cleanHookYear(h) || h);
      }
      res.json(result);
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      console.error("Script generation error:", err);
      res.status(500).json({ message: "Failed to generate script" });
    }
  });

  // ─── Video Blueprint AI (T003) ───

  app.post("/api/generate/blueprint", isAuthenticated, async (req: any, res) => {
    try {
      const input = z.object({
        hook: z.string().min(1),
        format: z.string().optional(),
        topic: z.string().optional(),
        script: z.string().optional(),
        hook_line: z.string().optional(),
        scene_1: z.string().optional(),
        scene_2: z.string().optional(),
        scene_3: z.string().optional(),
        cta_text: z.string().optional(),
      }).parse(req.body);

      const creditResult = await deductCredits(req.user.id, "blueprint");
      if (!creditResult.ok) {
        return res.status(402).json({ message: creditResult.error, creditsRemaining: creditResult.remaining });
      }

      const scriptContext = input.script
        ? `Script: ${input.script}`
        : [
            input.hook_line ? `Hook Line: ${input.hook_line}` : "",
            input.scene_1 ? `Scene 1: ${input.scene_1}` : "",
            input.scene_2 ? `Scene 2: ${input.scene_2}` : "",
            input.scene_3 ? `Scene 3: ${input.scene_3}` : "",
            input.cta_text ? `CTA: ${input.cta_text}` : "",
          ].filter(Boolean).join("\n");

      const systemPrompt = `You are a viral video producer. Generate a detailed video blueprint with scenes.
Return a JSON object with exactly these fields:
- hook: Object with { text: string, visual_suggestion: string }
- scenes: Array of exactly 4 objects, each with { title: string, description: string, visual_suggestion: string, script_lines: string }
- cta: Object with { text: string, visual_suggestion: string }`;

      const userPrompt = `Create a video blueprint for:
Hook: "${input.hook}"
${input.format ? `Format: ${input.format}` : ""}
${input.topic ? `Topic: ${input.topic}` : ""}
${scriptContext ? scriptContext : ""}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.8,
      });

      const result = JSON.parse(completion.choices[0].message.content || "{}");
      res.json(result);
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      console.error("Blueprint generation error:", err);
      res.status(500).json({ message: "Failed to generate blueprint" });
    }
  });

  // ─── Projects CRUD (T003) ───

  app.get("/api/projects", isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { contentProjects } = await import("@shared/schema");
      const { eq, desc } = await import("drizzle-orm");
      const projects = await db.select().from(contentProjects).where(eq(contentProjects.userId, req.user.id)).orderBy(desc(contentProjects.createdAt));
      res.json(projects);
    } catch (err: any) {
      console.error("Projects fetch error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.post("/api/projects", isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { contentProjects } = await import("@shared/schema");
      const input = z.object({
        title: z.string().optional(),
        hook: z.string().optional(),
        format: z.string().optional(),
        topic: z.string().optional(),
        script: z.any().optional(),
        blueprint: z.any().optional(),
        status: z.string().optional(),
      }).parse(req.body);

      const [project] = await db.insert(contentProjects).values({
        userId: req.user.id,
        title: input.title || null,
        hook: input.hook || null,
        format: input.format || null,
        topic: input.topic || null,
        script: input.script || null,
        blueprint: input.blueprint || null,
        status: input.status || "draft",
      }).returning();

      res.status(201).json(project);
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      console.error("Project create error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.patch("/api/projects/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { contentProjects } = await import("@shared/schema");
      const { eq, and } = await import("drizzle-orm");
      const input = z.object({
        title: z.string().optional(),
        hook: z.string().optional(),
        format: z.string().optional(),
        topic: z.string().optional(),
        script: z.any().optional(),
        blueprint: z.any().optional(),
        status: z.string().optional(),
      }).parse(req.body);

      const updates: any = { updatedAt: new Date() };
      if (input.title !== undefined) updates.title = input.title;
      if (input.hook !== undefined) updates.hook = input.hook;
      if (input.format !== undefined) updates.format = input.format;
      if (input.topic !== undefined) updates.topic = input.topic;
      if (input.script !== undefined) updates.script = input.script;
      if (input.blueprint !== undefined) updates.blueprint = input.blueprint;
      if (input.status !== undefined) updates.status = input.status;

      const [project] = await db.update(contentProjects)
        .set(updates)
        .where(and(eq(contentProjects.projectId, req.params.id), eq(contentProjects.userId, req.user.id)))
        .returning();

      if (!project) return res.status(404).json({ message: "Project not found" });
      res.json(project);
    } catch (err: any) {
      console.error("Project update error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.delete("/api/projects/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { contentProjects } = await import("@shared/schema");
      const { eq, and } = await import("drizzle-orm");
      await db.delete(contentProjects).where(and(eq(contentProjects.projectId, req.params.id), eq(contentProjects.userId, req.user.id)));
      res.json({ success: true });
    } catch (err: any) {
      console.error("Project delete error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // ─── Intelligence Feed ───

  async function emitIntelligenceEvent(eventType: string, title: string, description?: string, metadata?: any) {
    try {
      const { db } = await import("./db");
      const { intelligenceEvents } = await import("@shared/schema");
      await db.insert(intelligenceEvents).values({ eventType, title, description, metadata });
    } catch (err) {
      console.error("Failed to emit intelligence event:", err);
    }
  }

  app.get("/api/intelligence/feed", isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { intelligenceEvents } = await import("@shared/schema");
      const { desc } = await import("drizzle-orm");
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const events = await db.select().from(intelligenceEvents).orderBy(desc(intelligenceEvents.createdAt)).limit(limit);
      res.json(events);
    } catch (err: any) {
      console.error("Intelligence feed error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.post("/api/intelligence/events", verifyClassifierApiKey, async (req: any, res) => {
    try {
      const input = z.object({
        event_type: z.string().min(1),
        title: z.string().min(1),
        description: z.string().optional(),
        metadata: z.any().optional(),
      }).parse(req.body);
      const { db } = await import("./db");
      const { intelligenceEvents } = await import("@shared/schema");
      const [event] = await db.insert(intelligenceEvents).values({
        eventType: input.event_type,
        title: input.title,
        description: input.description,
        metadata: input.metadata,
      }).returning();
      res.status(201).json(event);
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      console.error("Intelligence event create error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // ─── Viral Templates ───

  app.get("/api/templates", isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { viralTemplates } = await import("@shared/schema");
      const { desc } = await import("drizzle-orm");
      const templates = await db.select().from(viralTemplates).orderBy(desc(viralTemplates.usageCount));
      res.json(templates);
    } catch (err: any) {
      console.error("Templates fetch error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.post("/api/templates/generate", isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      const { viralTemplates } = await import("@shared/schema");

      const patterns = await db.execute(sql`
        SELECT topic_cluster, hook_mechanism_primary, structure_type,
          COUNT(*) as video_count, ROUND(AVG(virality_score)::numeric, 2) as avg_virality
        FROM videos
        WHERE classification_status = 'completed'
          AND topic_cluster IS NOT NULL
          AND hook_mechanism_primary IS NOT NULL
          AND structure_type IS NOT NULL
        GROUP BY topic_cluster, hook_mechanism_primary, structure_type
        HAVING COUNT(*) >= 2
        ORDER BY avg_virality DESC NULLS LAST
        LIMIT 20
      `);

      let created = 0;
      for (const p of patterns.rows as any[]) {
        const existing = await db.execute(sql`
          SELECT id FROM viral_templates 
          WHERE topic_cluster = ${p.topic_cluster} 
            AND hook_mechanism = ${p.hook_mechanism_primary} 
            AND structure_type = ${p.structure_type}
            AND source = 'auto'
          LIMIT 1
        `);
        if (existing.rows.length > 0) continue;

        const title = `${(p.hook_mechanism_primary || "").replace(/_/g, " ")} + ${(p.structure_type || "").replace(/_/g, " ")}`;
        const description = `Viral pattern in ${(p.topic_cluster || "").replace(/_/g, " ")} — ${p.video_count} videos, avg virality ${p.avg_virality}`;

        await db.insert(viralTemplates).values({
          title: title.charAt(0).toUpperCase() + title.slice(1),
          description,
          topicCluster: p.topic_cluster,
          hookMechanism: p.hook_mechanism_primary,
          structureType: p.structure_type,
          source: "auto",
        });
        created++;
      }

      res.json({ created, message: `${created} templates generated from patterns` });
    } catch (err: any) {
      console.error("Templates generate error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.post("/api/templates", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { viralTemplates } = await import("@shared/schema");
      const input = z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        topicCluster: z.string().optional(),
        hookMechanism: z.string().optional(),
        structureType: z.string().optional(),
        hookTemplate: z.string().optional(),
        sceneStructure: z.any().optional(),
      }).parse(req.body);

      const [template] = await db.insert(viralTemplates).values({
        ...input,
        source: "manual",
      }).returning();

      res.status(201).json(template);
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      console.error("Template create error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.delete("/api/templates/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { viralTemplates } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      await db.delete(viralTemplates).where(eq(viralTemplates.id, req.params.id));
      res.json({ success: true });
    } catch (err: any) {
      console.error("Template delete error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.post("/api/templates/:id/use", isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { viralTemplates } = await import("@shared/schema");
      const { eq, sql } = await import("drizzle-orm");
      await db.update(viralTemplates).set({ usageCount: sql`usage_count + 1` }).where(eq(viralTemplates.id, req.params.id));
      res.json({ success: true });
    } catch (err: any) {
      console.error("Template use error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // ─── Content Remix Engine (MVP — text only) ───

  app.post("/api/remix", isAuthenticated, async (req: any, res) => {
    try {
      const input = z.object({
        content: z.string().min(1),
        contentType: z.enum(["script", "caption", "hook", "post"]).optional(),
      }).parse(req.body);

      const systemPrompt = `You are a viral content optimization expert. Analyze the provided content and propose an optimized version based on viral patterns.
Return a JSON object with exactly these fields:
- analysis: Brief analysis of the original content (2-3 sentences)
- improved_hook: An optimized, more viral hook (1-2 sentences)
- optimized_script: A fully optimized script (200-400 words)
- structure_suggestion: Recommended video structure (e.g., "Hook → Problem → Demo → Social Proof → CTA")
- blueprint: Object with { hook: { text, visual_suggestion }, scenes: [4 objects with { title, description, visual_suggestion, script_lines }], cta: { text, visual_suggestion } }
- improvements: Array of 3-5 specific improvements made, each a string`;

      const userPrompt = `Optimize this ${input.contentType || "content"} for maximum virality:\n\n${input.content}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.8,
      });

      const result = JSON.parse(completion.choices[0].message.content || "{}");
      res.json(result);
    } catch (err: any) {
      console.error("Remix error:", err);
      res.status(500).json({ message: "Failed to remix content" });
    }
  });

  // ─── Predicted Views + Improve Score ───

  app.post("/api/predict/views", isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      const input = z.object({
        hook: z.string().min(1),
        format: z.string().optional(),
        topic: z.string().optional(),
        script: z.string().optional(),
      }).parse(req.body);

      let avgViews = 50000;
      let matchCount = 0;

      if (input.topic) {
        const stats = await db.execute(sql`
          SELECT AVG(views) as avg_views, COUNT(*) as count,
            PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY views) as p25,
            PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY views) as p75
          FROM videos
          WHERE classification_status = 'completed' AND topic_cluster = ${input.topic} AND views > 0
        `);
        if (stats.rows.length > 0 && parseInt((stats.rows[0] as any).count) > 0) {
          avgViews = Math.round(parseFloat((stats.rows[0] as any).avg_views) || 50000);
          matchCount = parseInt((stats.rows[0] as any).count);
        }
      }

      const hookLength = (input.hook || "").length;
      const hasQuestion = /\?/.test(input.hook);
      const hasNumber = /\d/.test(input.hook);
      const hasEmoji = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}]/u.test(input.hook);

      let viralProbability = 40;
      if (hookLength > 10 && hookLength < 80) viralProbability += 10;
      if (hasQuestion) viralProbability += 8;
      if (hasNumber) viralProbability += 7;
      if (hasEmoji) viralProbability += 5;
      if (input.format) viralProbability += 5;
      if (input.script && input.script.length > 100) viralProbability += 10;
      if (matchCount > 10) viralProbability += 5;
      viralProbability = Math.min(viralProbability, 95);

      const multiplierLow = 0.3 + (viralProbability / 100) * 0.7;
      const multiplierHigh = 1 + (viralProbability / 100) * 3;
      const predictedLow = Math.round(avgViews * multiplierLow);
      const predictedHigh = Math.round(avgViews * multiplierHigh);

      res.json({
        viral_probability: viralProbability,
        predicted_views: {
          low: predictedLow,
          high: predictedHigh,
          formatted: `${formatViewCount(predictedLow)} – ${formatViewCount(predictedHigh)}`,
        },
        based_on: matchCount,
      });
    } catch (err: any) {
      console.error("Predict views error:", err);
      res.status(500).json({ message: "Failed to predict views" });
    }
  });

  app.post("/api/predict/improve", isAuthenticated, async (req: any, res) => {
    try {
      const input = z.object({
        hook: z.string().min(1),
        format: z.string().optional(),
        topic: z.string().optional(),
        script: z.string().optional(),
        cta: z.string().optional(),
      }).parse(req.body);

      const systemPrompt = `You are a viral content optimization AI. Suggest improvements to maximize viral potential.
Return a JSON object with exactly these fields:
- improved_hook: A more viral hook (1-2 sentences)
- improved_format: A more effective format suggestion (1 sentence)
- improved_cta: A more compelling CTA (1-2 sentences)
- tips: Array of 3 specific actionable tips to improve virality`;

      const userPrompt = `Improve this content for maximum virality:
Hook: "${input.hook}"
${input.format ? `Format: ${input.format}` : ""}
${input.topic ? `Topic: ${input.topic}` : ""}
${input.script ? `Script: ${input.script.substring(0, 500)}` : ""}
${input.cta ? `CTA: ${input.cta}` : ""}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.8,
      });

      const result = JSON.parse(completion.choices[0].message.content || "{}");
      res.json(result);
    } catch (err: any) {
      console.error("Improve score error:", err);
      res.status(500).json({ message: "Failed to improve score" });
    }
  });

  // ─── AI Credits System ───

  const CREDIT_COSTS: Record<string, number> = {
    idea: 1,
    script: 1,
    blueprint: 1,
    template_render: 2,
    avatar: 3,
  };

  const PLAN_CREDITS: Record<string, number> = {
    free: 30,
    creator: 250,
    pro: 1500,
  };

  function getViewRange(viralityScore: number): string {
    if (viralityScore >= 90) return "500k - 1M+";
    if (viralityScore >= 80) return "100k - 500k";
    if (viralityScore >= 70) return "50k - 100k";
    if (viralityScore >= 60) return "10k - 50k";
    if (viralityScore >= 50) return "5k - 10k";
    return "1k - 5k";
  }

  app.get("/api/credits", isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { users } = await import("@shared/schema");
      const { eq, sql } = await import("drizzle-orm");

      const [user] = await db.select({
        aiCredits: users.aiCredits,
        aiCreditsResetAt: users.aiCreditsResetAt,
      }).from(users).where(eq(users.id, req.user.id));

      if (!user) return res.status(404).json({ message: "User not found" });

      const plan = await getUserPlan(req.user.id);
      const maxCredits = PLAN_CREDITS[plan] || 40;
      let credits = user.aiCredits ?? maxCredits;

      const resetAt = user.aiCreditsResetAt ? new Date(user.aiCreditsResetAt) : new Date();
      const now = new Date();
      const monthDiff = (now.getFullYear() - resetAt.getFullYear()) * 12 + (now.getMonth() - resetAt.getMonth());
      if (monthDiff >= 1) {
        credits = maxCredits;
        await db.update(users).set({ aiCredits: maxCredits, aiCreditsResetAt: now }).where(eq(users.id, req.user.id));
      }

      res.json({
        credits,
        maxCredits,
        plan,
        costs: CREDIT_COSTS,
        estimatedVideos: Math.floor(credits / 3),
        resetsAt: resetAt.toISOString(),
      });
    } catch (err: any) {
      console.error("Credits fetch error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  async function getUserPlan(userId: string): Promise<string> {
    const { db } = await import("./db");
    const { sql } = await import("drizzle-orm");
    const subResult = await db.execute(sql`SELECT plan, billing_status FROM subscriptions WHERE user_id = ${userId} LIMIT 1`);
    const sub = (subResult as any).rows?.[0] || (subResult as any)[0];
    if (sub && (sub.billing_status === "active" || sub.billing_status === "trialing") && sub.plan) {
      if (sub.plan === "pro" || sub.plan === "studio") return "pro";
      if (sub.plan === "starter" || sub.plan === "creator") return "creator";
    }
    return "free";
  }

  async function deductCredits(userId: string, action: string): Promise<{ ok: boolean; remaining: number; error?: string }> {
    const { db } = await import("./db");
    const { sql } = await import("drizzle-orm");

    const cost = CREDIT_COSTS[action];
    if (!cost) return { ok: false, remaining: 0, error: "Unknown action" };

    const plan = await getUserPlan(userId);
    const maxCredits = PLAN_CREDITS[plan] || 40;

    const resetResult = await db.execute(sql`
      UPDATE users SET ai_credits = ${maxCredits}, ai_credits_reset_at = NOW()
      WHERE id = ${userId}
        AND (ai_credits_reset_at IS NULL OR (EXTRACT(YEAR FROM AGE(NOW(), ai_credits_reset_at)) * 12 + EXTRACT(MONTH FROM AGE(NOW(), ai_credits_reset_at))) >= 1)
      RETURNING ai_credits
    `);
    const wasReset = ((resetResult as any).rows?.length || (resetResult as any).length) > 0;

    const result = await db.execute(sql`
      UPDATE users SET ai_credits = ai_credits - ${cost}
      WHERE id = ${userId} AND ai_credits >= ${cost}
      RETURNING ai_credits
    `);
    const rows = (result as any).rows || (result as any);
    if (!rows || rows.length === 0) {
      const userResult = await db.execute(sql`SELECT ai_credits FROM users WHERE id = ${userId}`);
      const userRows = (userResult as any).rows || (userResult as any);
      const remaining = userRows?.[0]?.ai_credits ?? 0;
      return { ok: false, remaining, error: `Not enough credits. Need ${cost}, have ${remaining}.` };
    }
    return { ok: true, remaining: rows[0].ai_credits };
  }

  // ─── Thumbnail Proxy (HTTPS → HTTP Hetzner) ───

  app.get("/api/thumbnails/:videoId.jpg", async (req: any, res) => {
    try {
      const { videoId } = req.params;
      const url = `http://178.104.52.64:3000/thumbnails/${videoId}.jpg`;
      const response = await fetch(url);
      if (!response.ok) {
        return res.status(response.status).end();
      }
      res.set("Content-Type", "image/jpeg");
      res.set("Cache-Control", "public, max-age=604800, immutable");
      const buffer = Buffer.from(await response.arrayBuffer());
      res.send(buffer);
    } catch {
      res.status(502).end();
    }
  });

  // ─── Home Page Endpoints ───

  app.get("/api/home/viral-play", isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");

      const qualified = await db.execute(sql`
        SELECT p.pattern_id, p.hook_type, p.structure_type, p.topic_cluster,
               p.pattern_score, p.avg_virality_score, p.video_count, p.pattern_label,
               p.velocity_mid, p.pattern_novelty, p.trend_classification
        FROM patterns p
        WHERE p.avg_virality_score IS NOT NULL
        ORDER BY 
          CASE WHEN p.pattern_score >= 70 AND p.trend_classification = 'rising' THEN 0 ELSE 1 END,
          COALESCE(p.pattern_score, p.avg_virality_score) DESC
        LIMIT 1
      `);

      if (qualified.rows.length === 0) {
        return res.json(null);
      }

      const p: any = qualified.rows[0];
      const score = Math.round(p.pattern_score ?? p.avg_virality_score ?? 0);

      const hookResult = await db.execute(sql`
        SELECT hook_text, platform FROM videos
        WHERE classification_status = 'completed' AND hook_text IS NOT NULL
          AND (${p.hook_type ? sql`hook_mechanism_primary = ${p.hook_type}` : sql`TRUE`})
          AND (${p.topic_cluster ? sql`topic_cluster = ${p.topic_cluster}` : sql`TRUE`})
        ORDER BY virality_score DESC NULLS LAST
        LIMIT 1
      `);

      const hook = hookResult.rows.length > 0 ? cleanHookYear((hookResult.rows[0] as any).hook_text) : null;
      const platform = hookResult.rows.length > 0 ? (hookResult.rows[0] as any).platform : null;

      let whyItWorks = `This ${p.hook_type || 'hook'} + ${p.structure_type || 'format'} combo has a pattern score of ${score} across ${p.video_count} videos.`;
      try {
        const aiResult = await openai.chat.completions.create({
          model: "gpt-4.1-mini",
          temperature: 0.7,
          max_tokens: 120,
          messages: [
            { role: "system", content: "You are a viral content analyst. Explain in 2 sentences max WHY this content pattern works well for virality. Be specific and actionable. Do not use markdown." },
            { role: "user", content: `Hook type: ${p.hook_type}, Format: ${p.structure_type}, Topic: ${p.topic_cluster}, Pattern score: ${score}/100, Videos: ${p.video_count}` },
          ],
        });
        whyItWorks = aiResult.choices[0]?.message?.content?.trim() || whyItWorks;
      } catch {}

      res.json({
        hook: hook || `Best ${p.hook_type || 'viral'} hook for ${(p.topic_cluster || 'your niche').replace(/_/g, ' ')}`,
        format: p.structure_type || "Hook_Value_CTA",
        topic: p.topic_cluster || "general",
        platform,
        viralityScore: score,
        viewRange: getViewRange(score),
        confidence: Math.min(100, Math.round((p.video_count || 1) / 5 * 100)),
        videoCount: p.video_count || 0,
        whyItWorks,
        trendClassification: p.trend_classification,
      });
    } catch (err: any) {
      console.error("Home viral-play error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.get("/api/home/trending-opportunities", isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");

      const result = await db.execute(sql`
        SELECT v.id, v.hook_text, v.structure_type, v.topic_cluster, v.platform,
               v.virality_score, v.views, v.thumbnail_url, v.hook_mechanism_primary
        FROM videos v
        WHERE v.classification_status = 'completed' AND v.virality_score IS NOT NULL AND v.hook_text IS NOT NULL
        ORDER BY v.virality_score DESC NULLS LAST
        LIMIT 6
      `);

      const opportunities = result.rows.map((v: any) => ({
        id: v.id,
        hook: cleanHookYear(v.hook_text),
        format: v.structure_type || v.hook_mechanism_primary || "Mixed",
        topic: v.topic_cluster || "general",
        platform: v.platform || "TikTok",
        viralityScore: Math.round(v.virality_score || 0),
        viewRange: getViewRange(v.virality_score || 0),
        views: v.views,
        thumbnailUrl: v.thumbnail_url?.replace(/^http:\/\/178\.104\.52\.64:3000\/thumbnails\//, '/api/thumbnails/') || `/api/thumbnails/${v.id}.jpg`,
      }));

      res.json(opportunities);
    } catch (err: any) {
      console.error("Home trending-opportunities error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.get("/api/home/trending-hooks", isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");

      const result = await db.execute(sql`
        SELECT
          hook_type_v2 as hook_type,
          COUNT(*) as uses,
          ROUND(AVG(virality_score)::numeric, 1) as avg_score,
          ROUND(MAX(virality_score)::numeric, 1) as max_score
        FROM videos
        WHERE classification_status = 'completed'
          AND hook_type_v2 IS NOT NULL
          AND virality_score IS NOT NULL
          AND virality_score < 98
        GROUP BY hook_type_v2
        HAVING COUNT(*) >= 3
        ORDER BY AVG(virality_score) DESC NULLS LAST
        LIMIT 8
      `);

      const hooks = result.rows.map((h: any) => ({
        hook: (h.hook_type || '').replace(/_/g, ' '),
        hookType: h.hook_type,
        avgVirality: parseFloat(h.avg_score) || 0,
        maxVirality: parseFloat(h.max_score) || 0,
        usageCount: parseInt(h.uses) || 0,
      }));

      res.json(hooks);
    } catch (err: any) {
      console.error("Home trending-hooks error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.get("/api/home/trending-niches", isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");

      const result = await db.execute(sql`
        SELECT topic_cluster,
               COUNT(*) as video_count,
               ROUND(AVG(virality_score)::numeric, 1) as avg_virality,
               MAX(virality_score) as top_score
        FROM videos
        WHERE classification_status = 'completed' AND topic_cluster IS NOT NULL AND virality_score IS NOT NULL
        GROUP BY topic_cluster
        ORDER BY AVG(virality_score) DESC NULLS LAST
        LIMIT 5
      `);

      const niches = result.rows.map((n: any) => ({
        niche: n.topic_cluster,
        label: (n.topic_cluster as string).replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
        videoCount: parseInt(n.video_count) || 0,
        avgVirality: parseFloat(n.avg_virality) || 0,
        topScore: Math.round(n.top_score || 0),
      }));

      res.json(niches);
    } catch (err: any) {
      console.error("Home trending-niches error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // ─── Opportunities Page Endpoints ───

  app.get("/api/opportunities/top", isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      const format = req.query.format as string | undefined;
      const hookType = req.query.hookType as string | undefined;
      const velocity = req.query.velocity as string | undefined;

      const user = await db.execute(sql`SELECT selected_niches, primary_niche FROM users WHERE id = ${req.user.id}`);
      const userNiches = (user.rows[0] as any)?.selected_niches || [];
      const primaryNiche = (user.rows[0] as any)?.primary_niche || null;

      const conditions: string[] = [
        "v.classification_status = 'completed'",
        "v.virality_score IS NOT NULL",
        "v.hook_text IS NOT NULL",
      ];
      if (format) conditions.push(`v.structure_type = '${format.replace(/'/g, "''")}'`);
      if (hookType) conditions.push(`v.hook_type_v2 = '${hookType.replace(/'/g, "''")}'`);

      let velocityFilter = "";
      if (velocity === "emerging" || velocity === "trending") {
        velocityFilter = `AND cc.trend_status = '${velocity}'`;
      }

      const whereClause = conditions.join(" AND ");
      const nicheCase = userNiches.length > 0
        ? `CASE WHEN v.niche_cluster IN (${userNiches.map((n: string) => `'${n.replace(/'/g, "''")}'`).join(",")}) THEN 0 ELSE 1 END,`
        : "";

      const result = await db.execute(sql.raw(`
        SELECT v.id, v.hook_text, v.structure_type, v.topic_cluster, v.platform,
               v.virality_score, v.views, v.thumbnail_url, v.hook_mechanism_primary,
               v.hook_type_v2, v.emotion_primary, v.niche_cluster,
               cc.trend_status, cc.velocity_7d
        FROM videos v
        LEFT JOIN content_clusters cc ON v.id = ANY(cc.video_ids)
        WHERE ${whereClause} ${velocityFilter}
        ORDER BY ${nicheCase} v.virality_score DESC NULLS LAST
        LIMIT 40
      `));

      const opportunities = result.rows.map((v: any) => {
        let compatibilityScore = 0;
        if (primaryNiche && v.niche_cluster === primaryNiche) compatibilityScore += 40;
        else if (userNiches.length > 0 && userNiches.includes(v.niche_cluster)) compatibilityScore += 20;
        if (['emerging', 'trending'].includes(v.trend_status)) compatibilityScore += 20;
        compatibilityScore += Math.min(20, (parseFloat(v.velocity_7d) || 0) * 2);
        compatibilityScore = Math.min(100, Math.round(compatibilityScore));

        const matchType = compatibilityScore >= 80 ? 'perfect_match'
          : compatibilityScore >= 50 ? 'good_match' : 'explore';

        // keep legacy compatibility for existing frontend
        const compatibility = primaryNiche && v.niche_cluster === primaryNiche ? 'your_niche'
          : (userNiches.length > 0 && userNiches.includes(v.niche_cluster)) ? 'related' : null;

        return {
          id: v.id,
          hook: cleanHookYear(v.hook_text),
          format: v.structure_type || "Mixed",
          topic: v.topic_cluster || "general",
          platform: v.platform || "TikTok",
          viralityScore: Math.round(v.virality_score || 0),
          viewRange: getViewRange(v.virality_score || 0),
          views: v.views,
          thumbnailUrl: v.thumbnail_url?.replace(/^http:\/\/178\.104\.52\.64:3000\/thumbnails\//, '/api/thumbnails/') || `/api/thumbnails/${v.id}.jpg`,
          hookType: v.hook_mechanism_primary || v.hook_type_v2,
          emotion: v.emotion_primary,
          nicheCluster: v.niche_cluster,
          trendStatus: v.trend_status,
          velocity7d: parseFloat(v.velocity_7d) || 0,
          compatibility,
          compatibilityScore,
          matchType,
        };
      });

      res.json(opportunities);
    } catch (err: any) {
      console.error("Opportunities top error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.get("/api/opportunities/emerging", isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");

      const result = await db.execute(sql`
        SELECT p.pattern_id, p.hook_type, p.structure_type, p.topic_cluster,
               p.pattern_score, p.avg_virality_score, p.video_count, p.pattern_label,
               p.trend_classification
        FROM patterns p
        WHERE p.trend_classification = 'rising' AND p.avg_virality_score IS NOT NULL
        ORDER BY p.pattern_score DESC NULLS LAST
        LIMIT 10
      `);

      const emerging = await Promise.all(result.rows.map(async (p: any) => {
        const hookResult = await db.execute(sql`
          SELECT hook_text FROM videos
          WHERE classification_status = 'completed' AND hook_text IS NOT NULL
            AND (${p.hook_type ? sql`hook_mechanism_primary = ${p.hook_type}` : sql`TRUE`})
            AND (${p.topic_cluster ? sql`topic_cluster = ${p.topic_cluster}` : sql`TRUE`})
          ORDER BY virality_score DESC NULLS LAST
          LIMIT 1
        `);
        const hook = hookResult.rows.length > 0 ? cleanHookYear((hookResult.rows[0] as any).hook_text) : null;
        const score = Math.round(p.pattern_score ?? p.avg_virality_score ?? 0);

        return {
          id: p.pattern_id,
          hook: hook || `Rising ${p.hook_type || 'viral'} pattern`,
          format: p.structure_type || "Mixed",
          topic: p.topic_cluster || "general",
          viralityScore: score,
          viewRange: getViewRange(score),
          videoCount: p.video_count || 0,
          trendClassification: "rising",
          label: p.pattern_label,
        };
      }));

      res.json(emerging);
    } catch (err: any) {
      console.error("Opportunities emerging error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.get("/api/opportunities/trending-formats", isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");

      const result = await db.execute(sql`
        SELECT structure_type, 
               COUNT(*) as count,
               ROUND(AVG(virality_score)::numeric, 1) as avg_virality,
               MAX(virality_score) as top_score
        FROM videos
        WHERE classification_status = 'completed' AND structure_type IS NOT NULL AND virality_score IS NOT NULL
        GROUP BY structure_type
        ORDER BY count DESC
      `);

      const total = result.rows.reduce((sum: number, r: any) => sum + parseInt(r.count), 0);
      const formats = result.rows.map((f: any) => ({
        format: f.structure_type,
        label: (f.structure_type as string).replace(/_/g, ' '),
        count: parseInt(f.count) || 0,
        percentage: total > 0 ? Math.round((parseInt(f.count) / total) * 100) : 0,
        avgVirality: parseFloat(f.avg_virality) || 0,
        topScore: Math.round(f.top_score || 0),
      }));

      res.json(formats);
    } catch (err: any) {
      console.error("Opportunities trending-formats error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.get("/api/opportunities/trending-hooks", isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");

      const result = await db.execute(sql`
        SELECT hook_text, hook_mechanism_primary, topic_cluster, platform,
               virality_score, views
        FROM videos
        WHERE classification_status = 'completed' AND hook_text IS NOT NULL AND virality_score IS NOT NULL
        ORDER BY virality_score DESC NULLS LAST
        LIMIT 15
      `);

      const hooks = result.rows.map((h: any) => ({
        hook: cleanHookYear(h.hook_text),
        hookType: h.hook_mechanism_primary,
        topic: h.topic_cluster,
        platform: h.platform,
        viralityScore: Math.round(h.virality_score || 0),
        views: h.views,
      }));

      res.json(hooks);
    } catch (err: any) {
      console.error("Opportunities trending-hooks error:", err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // ─── Performance Tracking ──────────────────────────────────
  app.post("/api/performance/track", isAuthenticated, async (req: any, res) => {
    try {
      const input = z.object({
        videoUrl: z.string().url(),
        predictedViews: z.number().optional(),
      }).parse(req.body);

      const { trackVideoPerformance } = await import('./services/performance-tracking.service');
      const entry = await trackVideoPerformance(req.user.id, input.videoUrl, input.predictedViews);
      res.json(entry);
    } catch (err: any) {
      console.error("Performance track error:", err);
      res.status(500).json({ message: "Failed to track video performance" });
    }
  });

  app.get("/api/performance", isAuthenticated, async (req: any, res) => {
    try {
      const result = await db.execute(sql`
        SELECT * FROM video_performance
        WHERE user_id = ${req.user.id}
        ORDER BY created_at DESC
        LIMIT 50
      `);
      res.json(result.rows);
    } catch (err: any) {
      console.error("Performance list error:", err);
      res.status(500).json({ message: "Failed to fetch performance data" });
    }
  });

  app.post("/api/performance/:id/refresh", isAuthenticated, async (req: any, res) => {
    try {
      const { refreshVideoMetrics } = await import('./services/performance-tracking.service');
      const updated = await refreshVideoMetrics(req.params.id);
      if (!updated) return res.status(404).json({ message: "Not found" });
      res.json(updated);
    } catch (err: any) {
      console.error("Performance refresh error:", err);
      res.status(500).json({ message: "Failed to refresh metrics" });
    }
  });

  // ─── Waitlist ──────────────────────────────────────
  app.get("/api/waitlist/stats", async (_req, res) => {
    try {
      const { db } = await import("./db");
      const { waitlist } = await import("@shared/schema");
      const { count } = await import("drizzle-orm");
      const result = await db.select({ count: count() }).from(waitlist);
      res.json({ count: result[0]?.count || 0 });
    } catch (err) {
      res.json({ count: 0 });
    }
  });

  const waitlistRateLimit = new Map<string, number[]>();
  app.post("/api/waitlist/join", async (req, res) => {
    try {
      const ip = req.ip || req.socket.remoteAddress || "unknown";
      const now = Date.now();
      const window = 60_000;
      const maxPerWindow = 5;
      const timestamps = (waitlistRateLimit.get(ip) || []).filter(t => now - t < window);
      if (timestamps.length >= maxPerWindow) {
        return res.status(429).json({ message: "Too many requests. Try again later." });
      }
      timestamps.push(now);
      waitlistRateLimit.set(ip, timestamps);

      const schema = z.object({
        firstName: z.string().min(1).max(100),
        email: z.string().email().max(255),
        niche: z.string().max(50).optional(),
        why: z.string().max(500).optional(),
        platform: z.string().max(50).optional(),
        followersRange: z.string().max(20).optional(),
        contentGoal: z.string().max(100).optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten().fieldErrors });
      }
      const input = parsed.data;

      const { db } = await import("./db");
      const { sql: sqlRaw } = await import("drizzle-orm");
      // Ensure new columns exist
      await db.execute(sqlRaw`ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS platform text`);
      await db.execute(sqlRaw`ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS followers_range text`);
      await db.execute(sqlRaw`ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS content_goal text`);

      const { waitlist } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");

      const existing = await db.select().from(waitlist).where(eq(waitlist.email, input.email.toLowerCase())).limit(1);
      if (existing.length > 0) {
        return res.status(409).json({ message: "already" });
      }

      const safeName = input.firstName.replace(/[<>"'&]/g, "");

      await db.execute(sqlRaw`
        INSERT INTO waitlist ("firstName", email, niche, why, platform, followers_range, content_goal)
        VALUES (${safeName}, ${input.email.toLowerCase()}, ${input.niche || null},
                ${input.why || null}, ${input.platform || null},
                ${input.followersRange || null}, ${input.contentGoal || null})
      `);

      try {
        const { sendWaitlistConfirmation } = await import("./email");
        await sendWaitlistConfirmation(input.email.toLowerCase(), safeName);
      } catch (emailErr) {
        console.error("[WAITLIST] Failed to send confirmation email:", emailErr);
      }

      res.json({ success: true });
    } catch (err: any) {
      if (err?.code === "23505") {
        return res.status(409).json({ message: "already" });
      }
      console.error("Waitlist join error:", err);
      res.status(500).json({ message: "Failed to join waitlist" });
    }
  });

  app.get("/api/admin/waitlist", isAuthenticated, isAdmin, async (_req, res) => {
    try {
      const { db } = await import("./db");
      const { waitlist } = await import("@shared/schema");
      const { desc } = await import("drizzle-orm");
      const entries = await db.select().from(waitlist).orderBy(desc(waitlist.createdAt));
      res.json(entries);
    } catch (err) {
      console.error("Admin waitlist error:", err);
      res.status(500).json({ message: "Failed to fetch waitlist" });
    }
  });

  app.post("/api/admin/waitlist/:id/invite", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { db } = await import("./db");
      const { waitlist } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const { randomBytes } = await import("crypto");

      const entry = await db.select().from(waitlist).where(eq(waitlist.id, req.params.id)).limit(1);
      if (!entry.length) return res.status(404).json({ message: "Not found" });

      const record = entry[0];
      if (record.status === "invited") {
        return res.status(400).json({ message: "Already invited" });
      }

      const inviteToken = randomBytes(32).toString("hex");
      const safeName = record.firstName.replace(/[<>"'&]/g, "");

      try {
        const { sendWaitlistInvite } = await import("./email");
        await sendWaitlistInvite(record.email, safeName, inviteToken);
      } catch (emailErr) {
        console.error("[WAITLIST] Failed to send invite email:", emailErr);
        return res.status(500).json({ message: "Failed to send invite email" });
      }

      await db.update(waitlist).set({
        status: "invited",
        inviteToken,
        inviteSentAt: new Date(),
      }).where(eq(waitlist.id, req.params.id));

      res.json({ success: true, inviteToken });
    } catch (err) {
      console.error("Admin invite error:", err);
      res.status(500).json({ message: "Failed to send invite" });
    }
  });

  // ─── B-Roll Search ──────────────────────────────────────
  app.get("/api/broll/search", isAuthenticated, async (req: any, res) => {
    try {
      const keyword = z.string().min(1).parse(req.query.keyword);
      const maxResults = parseInt(req.query.maxResults as string) || 3;

      const { searchBrollClips } = await import('./services/broll.service');
      const clips = await searchBrollClips(keyword, maxResults);
      res.json(clips);
    } catch (err: any) {
      console.error("B-Roll search error:", err);
      res.status(500).json({ message: "Failed to search b-roll" });
    }
  });

  app.get('/api/user/dna', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const dna = await db.execute(sql`
        SELECT * FROM user_content_dna WHERE user_id = ${userId}
      `);
      
      if (!dna.rows.length) {
        return res.json({ 
          exists: false, 
          message: 'Track your first video to build your Content DNA' 
        });
      }
      
      res.json({ exists: true, dna: dna.rows[0] });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/user/dna/update', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      const performances = await db.execute(sql`
        SELECT 
          vp.*,
          v.hook_type_v2,
          v.structure_type,
          v.content_format,
          v.virality_score as predicted_virality
        FROM video_performance vp
        LEFT JOIN videos v ON v.video_url = vp.platform_video_url
        WHERE vp.user_id = ${userId}
          AND vp.actual_views IS NOT NULL
      `);

      if (!performances.rows.length) {
        return res.json({ message: 'No tracked videos yet' });
      }

      const rows = performances.rows as any[];
      
      const hookPerf: Record<string, { count: number; avgViews: number }> = {};
      rows.forEach(r => {
        if (r.hook_type_v2) {
          if (!hookPerf[r.hook_type_v2]) hookPerf[r.hook_type_v2] = { count: 0, avgViews: 0 };
          hookPerf[r.hook_type_v2].count++;
          hookPerf[r.hook_type_v2].avgViews += r.actual_views || 0;
        }
      });
      Object.keys(hookPerf).forEach(k => {
        hookPerf[k].avgViews = Math.round(hookPerf[k].avgViews / hookPerf[k].count);
      });

      const accuracy = rows
        .filter(r => r.predicted_views && r.actual_views)
        .map(r => 1 - Math.abs(r.predicted_views - r.actual_views) / Math.max(r.predicted_views, r.actual_views))
        .reduce((a, b) => a + b, 0) / rows.length;

      await db.execute(sql`
        INSERT INTO user_content_dna (user_id, hook_type_performance, total_tracked_videos, avg_prediction_accuracy, updated_at)
        VALUES (${userId}, ${JSON.stringify(hookPerf)}, ${rows.length}, ${accuracy || null}, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          hook_type_performance = ${JSON.stringify(hookPerf)},
          total_tracked_videos = ${rows.length},
          avg_prediction_accuracy = ${accuracy || null},
          updated_at = NOW()
      `);

      res.json({ success: true, dna: { hookTypePerformance: hookPerf, totalTrackedVideos: rows.length } });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/patterns/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      const result = await db.execute(sql`
        SELECT p.*, cc.trend_status, cc.velocity_7d as cc_velocity_7d
        FROM patterns p
        LEFT JOIN content_clusters cc ON cc.id::text = p.cluster_id
        WHERE p.pattern_id = ${req.params.id}
      `);
      if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
      const p = result.rows[0] as any;
      const vel = p.velocity_7d ?? p.cc_velocity_7d ?? 0;
      const pat_platform = p.platform || 'tiktok';
      res.json({
        ...p,
        platform: pat_platform,
        signal_strength: computeSignalStrength({ video_count: p.video_count, velocity_7d: vel, cluster_level: p.sub_niche ? 3 : 2, platform: pat_platform }),
        velocity_7d: vel,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/patterns/:id/similar', isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      const patternRes = await db.execute(sql`
        SELECT topic_cluster, hook_type_v2 FROM patterns WHERE pattern_id = ${req.params.id}
      `);
      if (!patternRes.rows.length) return res.json([]);
      const row = patternRes.rows[0] as any;
      const similar = await db.execute(sql.raw(`
        SELECT p.*, cc.trend_status, cc.velocity_7d
        FROM patterns p
        LEFT JOIN content_clusters cc ON cc.id::text = p.cluster_id
        WHERE p.hook_template IS NOT NULL
          AND p.pattern_label IS NOT NULL
          AND p.pattern_id != '${(req.params.id as string).replace(/'/g, "''")}'
          AND (
            p.topic_cluster = '${(row.topic_cluster || '').replace(/'/g, "''")}'
            OR p.hook_type_v2 = '${(row.hook_type_v2 || '').replace(/'/g, "''")}'
          )
        ORDER BY p.avg_virality_score DESC NULLS LAST
        LIMIT 5
      `));
      const enriched = (similar.rows as any[]).map(p => {
        const vel = p.velocity_7d ?? 0;
        const pat_platform = p.platform || 'tiktok';
        return {
          ...p,
          platform: pat_platform,
          signal_strength: computeSignalStrength({ video_count: p.video_count, velocity_7d: vel, cluster_level: p.sub_niche ? 3 : 2, platform: pat_platform }),
          velocity_7d: vel,
          patternId: p.pattern_id,
          hookTemplate: p.hook_template,
          whyItWorks: p.why_it_works,
          signalStrength: computeSignalStrength({ video_count: p.video_count, velocity_7d: vel, cluster_level: p.sub_niche ? 3 : 2, platform: pat_platform }),
          videoCount: p.video_count,
          predictedViewsMin: p.predicted_views_min,
          predictedViewsMax: p.predicted_views_max,
          velocity7d: vel,
          avgViralityScore: p.avg_virality_score,
          avgEngagementRate: p.avg_engagement_rate,
          topicCluster: p.topic_cluster,
        };
      });
      res.json(enriched);
    } catch (error: any) {
      console.error('[/api/patterns/:id/similar]', error.message);
      res.json([]);
    }
  });

  app.get('/api/patterns/:id/source-video', isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      const patternRes = await db.execute(sql`
        SELECT topic_cluster FROM patterns WHERE pattern_id = ${req.params.id}
      `);
      if (!patternRes.rows.length) return res.json(null);
      const topicCluster = (patternRes.rows[0] as any).topic_cluster;
      if (!topicCluster) return res.json(null);
      const videoRes = await db.execute(sql.raw(`
        SELECT id, caption, platform, creator_name, views, likes, comments, shares,
               engagement_rate, virality_score, topic_cluster, published_at,
               duration_seconds, transcript, followers_count
        FROM videos
        WHERE topic_cluster = '${topicCluster.replace(/'/g, "''")}'
          AND classification_status = 'completed'
          AND virality_score IS NOT NULL
        ORDER BY virality_score DESC NULLS LAST
        LIMIT 1
      `));
      res.json(videoRes.rows[0] || null);
    } catch (error: any) {
      console.error('[/api/patterns/:id/source-video]', error.message);
      res.json(null);
    }
  });

  app.get('/api/home/stats', isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      const user = await db.execute(sql`SELECT selected_niches FROM users WHERE id = ${req.user.id}`);
      const userNiches: string[] = (user.rows[0] as any)?.selected_niches || [];
      const nichesArr = `{${userNiches.join(",")}}`;
      
      const stats = await db.execute(sql`
        SELECT
          COUNT(*) as total_videos,
          COUNT(CASE WHEN virality_score >= 60 THEN 1 END) as high_performing,
          AVG(virality_score)::numeric(5,1) as avg_virality,
          COUNT(DISTINCT niche_cluster) as active_niches
        FROM videos
        WHERE classification_status = 'completed'
          AND (niche_cluster = ANY(${nichesArr}::text[]) OR ${nichesArr}::text[] = '{}')
      `);
      
      const patternsCount = await db.execute(sql`
        SELECT COUNT(*) as total FROM content_clusters
        WHERE trend_status IN ('emerging', 'trending')
      `);
      
      res.json({
        totalVideos: parseInt((stats.rows[0] as any)?.total_videos) || 0,
        highPerforming: parseInt((stats.rows[0] as any)?.high_performing) || 0,
        avgVirality: parseFloat((stats.rows[0] as any)?.avg_virality) || 0,
        activeNiches: parseInt((stats.rows[0] as any)?.active_niches) || 0,
        patternsDetected: parseInt((patternsCount.rows[0] as any)?.total) || 0,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/alerts', isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      const user = await db.execute(sql`
        SELECT selected_niches 
        FROM users WHERE id = ${req.user.id}
      `);
      const userNiches: string[] = (user.rows[0] as any)?.selected_niches || [];
      const nichesArr = `{${userNiches.join(",")}}`;
      const alerts = await db.execute(sql`
        SELECT 
          cc.id,
          cc.dominant_hook_type,
          cc.dominant_niche,
          cc.dominant_structure,
          cc.avg_virality_score,
          cc.velocity_7d,
          cc.trend_status,
          array_length(cc.video_ids, 1) as video_count,
          p.pattern_label,
          p.hook_template,
          p.why_it_works
        FROM content_clusters cc
        LEFT JOIN patterns p ON p.cluster_id = cc.id::text
        WHERE cc.trend_status IN ('emerging', 'trending')
          AND cc.velocity_7d >= 2
          AND (
            cc.dominant_niche = ANY(${nichesArr}::text[])
            OR ${nichesArr}::text[] = '{}'
          )
          AND array_length(cc.video_ids, 1) >= 3
        ORDER BY 
          CASE cc.trend_status WHEN 'emerging' THEN 1 WHEN 'trending' THEN 2 ELSE 3 END,
          cc.velocity_7d DESC,
          cc.avg_virality_score DESC NULLS LAST
        LIMIT 10
      `);
      res.json({ alerts: alerts.rows, count: alerts.rows.length, userNiches });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/performance/:id/compare', isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      const { id } = req.params;
      const result = await db.execute(sql`
        SELECT 
          vp.*,
          CASE 
            WHEN vp.predicted_views > 0 AND vp.actual_views > 0
            THEN ROUND((1 - ABS(vp.predicted_views - vp.actual_views)::float / 
                 GREATEST(vp.predicted_views, vp.actual_views)) * 100)
            ELSE NULL
          END as accuracy_pct,
          CASE
            WHEN vp.actual_views > vp.predicted_views THEN 'outperformed'
            WHEN vp.actual_views < vp.predicted_views * 0.5 THEN 'underperformed'
            ELSE 'as_expected'
          END as performance_label
        FROM video_performance vp
        WHERE vp.id = ${id} AND vp.user_id = ${req.user.id}
      `);
      
      if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
      res.json(result.rows[0]);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/performance/stats', isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      const stats = await db.execute(sql`
        SELECT
          COUNT(*) as total_tracked,
          COUNT(actual_views) as with_results,
          AVG(accuracy_score) as avg_accuracy,
          SUM(CASE WHEN actual_views > predicted_views THEN 1 ELSE 0 END) as outperformed,
          SUM(CASE WHEN actual_views < predicted_views * 0.5 THEN 1 ELSE 0 END) as underperformed
        FROM video_performance
        WHERE user_id = ${req.user.id}
      `);
      res.json(stats.rows[0]);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/predict', isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      const { hookType, format, niche, duration } = req.body;

      const matchingPatterns = await db.execute(sql`
        SELECT 
          p.pattern_label,
          p.hook_template,
          p.why_it_works,
          p.avg_virality_score,
          p.video_count,
          p.confidence_score,
          p.trend_classification,
          cc.trend_status,
          cc.velocity_7d
        FROM patterns p
        LEFT JOIN content_clusters cc ON cc.id::text = p.cluster_id
        WHERE 
          (p.hook_type = ${hookType} OR ${hookType} IS NULL)
          AND (p.topic_cluster = ${niche} OR ${niche} IS NULL)
        ORDER BY p.avg_virality_score DESC NULLS LAST
        LIMIT 5
      `);

      if (!matchingPatterns.rows.length) {
        return res.json({
          predictedViews: { min: 10000, max: 100000, likely: 50000 },
          confidence: 0.3,
          matchingPatterns: [],
          recommendation: 'Not enough data for this combination yet.'
        });
      }

      const topPattern = matchingPatterns.rows[0] as any;
      const avgVirality = topPattern.avg_virality_score || 50;

      const baseViews = Math.round(Math.pow(10, avgVirality / 100 * 6));
      const confidence = Math.min(0.9, (topPattern.confidence_score || 0.5) * 
        (topPattern.video_count > 10 ? 1.2 : 1));

      res.json({
        predictedViews: {
          min: Math.round(baseViews * 0.3),
          max: Math.round(baseViews * 3),
          likely: baseViews
        },
        confidence: parseFloat(confidence.toFixed(2)),
        viralityScore: Math.round(avgVirality),
        matchingPatterns: matchingPatterns.rows,
        topPattern: {
          label: topPattern.pattern_label,
          hookTemplate: topPattern.hook_template,
          whyItWorks: topPattern.why_it_works,
          trendStatus: topPattern.trend_status || 'stable',
          velocity: topPattern.velocity_7d || 0
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/user/preferences', isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      const user = await db.execute(sql`
        SELECT selected_niches, primary_niche, content_style, user_goal, onboarding_completed, platforms, active_platform
        FROM users WHERE id = ${req.user.id}
      `);
      if (!user.rows.length) return res.status(404).json({ error: 'User not found' });
      const row = user.rows[0] as any;
      res.json({
        selectedNiches: row.selected_niches || [],
        primaryNiche: row.primary_niche || null,
        contentStyle: row.content_style || null,
        userGoal: row.user_goal || null,
        onboardingCompleted: row.onboarding_completed || false,
        platforms: row.platforms || ['tiktok'],
        active_platform: row.active_platform || 'tiktok',
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/patterns/saved', isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      const user = await db.execute(sql`SELECT selected_niches, primary_niche FROM users WHERE id = ${req.user.id}`);
      const row = user.rows[0] as any;
      const niches: string[] = row?.selected_niches || (row?.primary_niche ? [row.primary_niche] : []);

      let patterns;
      if (niches.length > 0) {
        const nichesArr = `{${niches.join(',')}}`;
        patterns = await db.execute(sql`
          SELECT p.*, cc.trend_status, cc.velocity_7d
          FROM patterns p
          LEFT JOIN content_clusters cc ON cc.id::text = p.cluster_id
          WHERE p.topic_cluster = ANY(${nichesArr}::text[])
            AND p.pattern_label IS NOT NULL
          ORDER BY p.avg_virality_score DESC NULLS LAST
          LIMIT 20
        `);
      }

      // Fallback: no niche match or niches empty → return all patterns
      if (!patterns || patterns.rows.length === 0) {
        patterns = await db.execute(sql`
          SELECT p.*, cc.trend_status, cc.velocity_7d
          FROM patterns p
          LEFT JOIN content_clusters cc ON cc.id::text = p.cluster_id
          WHERE p.pattern_label IS NOT NULL
          ORDER BY p.avg_virality_score DESC NULLS LAST
          LIMIT 10
        `);
      }

      res.json(patterns.rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ─── Founder Endpoints ──────────────────────────────────────────────────────

  app.get('/api/founder/pipeline', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");

      const stats = await db.execute(sql`
        SELECT
          COUNT(*) FILTER (WHERE classification_status = 'completed') as classified,
          COUNT(*) FILTER (WHERE classification_status = 'pending') as pending,
          COUNT(*) FILTER (WHERE classification_status = 'failed') as failed,
          COUNT(*) FILTER (WHERE transcription_status = 'completed') as transcribed,
          COUNT(*) FILTER (WHERE transcription_status = 'pending') as pending_transcription,
          COUNT(*) FILTER (WHERE followers_count IS NOT NULL) as with_followers,
          COUNT(*) FILTER (WHERE hook_type_v2 IS NOT NULL) as classified_v2,
          COUNT(*) FILTER (WHERE collected_at >= NOW() - INTERVAL '24 hours') as ingested_24h,
          COUNT(*) FILTER (WHERE collected_at >= NOW() - INTERVAL '7 days') as ingested_7d,
          AVG(virality_score)::numeric(5,1) as avg_virality,
          MAX(collected_at) as last_ingestion
        FROM videos
      `);

      const clusters = await db.execute(sql`
        SELECT
          COUNT(*) as total_clusters,
          COUNT(dominant_hook_type) as with_metadata,
          COUNT(*) FILTER (WHERE trend_status = 'emerging') as emerging,
          COUNT(*) FILTER (WHERE trend_status = 'trending') as trending,
          COUNT(*) FILTER (WHERE analyzed_by_llm = true) as analyzed
        FROM content_clusters
      `);

      const patterns = await db.execute(sql`
        SELECT COUNT(*) as total_patterns,
               COUNT(hook_template) as with_template
        FROM patterns
      `);

      const phaseState = await db.execute(sql`
        SELECT current_phase, updated_at FROM pattern_engine_state WHERE id = 1
      `);

      res.json({
        videos: stats.rows[0],
        clusters: clusters.rows[0],
        patterns: patterns.rows[0],
        phase: phaseState.rows[0] || null,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/founder/users', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");

      const stats = await db.execute(sql`
        SELECT
          COUNT(*) as total_users,
          COUNT(*) FILTER (WHERE onboarding_completed = true) as onboarded,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as new_7d,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as new_24h
        FROM users
        WHERE is_admin = false OR is_admin IS NULL
      `);

      const userList = await db.execute(sql`
        SELECT id, email, name, primary_niche, selected_niches,
               onboarding_completed, created_at
        FROM users
        WHERE is_admin = false OR is_admin IS NULL
        ORDER BY created_at DESC
        LIMIT 50
      `);

      const nicheDistribution = await db.execute(sql`
        SELECT primary_niche, COUNT(*) as count
        FROM users
        WHERE primary_niche IS NOT NULL
        GROUP BY primary_niche
        ORDER BY count DESC
      `);

      res.json({
        stats: stats.rows[0],
        users: userList.rows,
        niches: nicheDistribution.rows,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/founder/actions/:action', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { action } = req.params;
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      const { Queue } = await import('bullmq');
      const { redisConnection } = await import('./config/redis');

      if (action === 'force-clustering') {
        await db.execute(sql`UPDATE pattern_engine_state SET current_phase = 1 WHERE id = 1`);
        await new Queue('phase-transition', { connection: redisConnection }).add('check', {});
        return res.json({ success: true, message: 'Clustering triggered' });
      }

      if (action === 'force-scoring') {
        await new Queue('scoring', { connection: redisConnection }).add('batch', {});
        return res.json({ success: true, message: 'Scoring triggered' });
      }

      if (action === 'force-velocity') {
        await new Queue('velocity', { connection: redisConnection }).add('calculate', {});
        return res.json({ success: true, message: 'Velocity calculation triggered' });
      }

      res.status(400).json({ success: false, message: 'Unknown action' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/founder/waitlist', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");

      const stats = await db.execute(sql`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'invited') as invited,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as new_7d
        FROM waitlist
      `);

      const entries = await db.execute(sql`
        SELECT id, email, "firstName" as first_name, niche, platform, followers_range,
               content_goal, status, created_at
        FROM waitlist
        ORDER BY created_at DESC
        LIMIT 100
      `);

      const nicheStats = await db.execute(sql`
        SELECT niche, COUNT(*) as count FROM waitlist
        WHERE niche IS NOT NULL GROUP BY niche ORDER BY count DESC
      `);

      const platformStats = await db.execute(sql`
        SELECT platform, COUNT(*) as count FROM waitlist
        WHERE platform IS NOT NULL GROUP BY platform ORDER BY count DESC
      `);

      const followersStats = await db.execute(sql`
        SELECT followers_range, COUNT(*) as count FROM waitlist
        WHERE followers_range IS NOT NULL GROUP BY followers_range ORDER BY count DESC
      `);

      res.json({
        stats: stats.rows[0],
        entries: entries.rows,
        nicheStats: nicheStats.rows,
        platformStats: platformStats.rows,
        followersStats: followersStats.rows,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ─── Sidebar Stats ──────────────────────────────────────────────────────────

  app.get('/api/sidebar/stats', isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      const user = await db.execute(sql`SELECT selected_niches FROM users WHERE id = ${req.user.id}`);
      const niches: string[] = (user.rows[0] as any)?.selected_niches || [];
      const nichesArr = `{${niches.length > 0 ? niches.join(',') : 'general'}}`;

      const emerging = await db.execute(sql`
        SELECT COUNT(*) as count FROM content_clusters WHERE trend_status = 'emerging'
      `);

      const opportunities = await db.execute(sql`
        SELECT COUNT(*) as count FROM videos
        WHERE classification_status = 'completed'
          AND virality_score >= 60
          AND niche_cluster = ANY(${nichesArr}::text[])
      `);

      const tracked = await db.execute(sql`
        SELECT COUNT(*) as count FROM video_performance WHERE user_id = ${req.user.id}
      `);

      res.json({
        emergingPatterns: parseInt((emerging.rows[0] as any)?.count) || 0,
        opportunities: parseInt((opportunities.rows[0] as any)?.count) || 0,
        trackedVideos: parseInt((tracked.rows[0] as any)?.count) || 0,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // DAILY BRIEF — personalized morning intelligence
  // ═══════════════════════════════════════════════════════════
  app.get('/api/daily-brief', isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");

      const userResult = await db.execute(sql`
        SELECT first_name, primary_niche, selected_niches FROM users WHERE id = ${req.user.id}
      `);
      const userData = userResult.rows[0] as any;
      const primaryNiche = userData?.primary_niche || 'content_creation';
      const niches: string[] = userData?.selected_niches || [primaryNiche];
      const nichesArr = `{${niches.join(',')}}`;

      const [newEmerging, topOpportunity, declining] = await Promise.all([
        db.execute(sql`
          SELECT cc.dominant_hook_type, cc.dominant_niche, cc.velocity_7d,
                 p.pattern_label, p.hook_template
          FROM content_clusters cc
          LEFT JOIN patterns p ON p.cluster_id = cc.id::text
          WHERE cc.trend_status = 'emerging'
            AND cc.dominant_niche = ANY(${nichesArr}::text[])
            AND cc.updated_at >= NOW() - INTERVAL '24 hours'
          ORDER BY cc.velocity_7d DESC NULLS LAST
          LIMIT 3
        `),
        db.execute(sql`
          SELECT hook_text, hook_type_v2, virality_score, views, niche_cluster
          FROM videos
          WHERE niche_cluster = ANY(${nichesArr}::text[])
            AND classification_status = 'completed'
            AND collected_at >= NOW() - INTERVAL '48 hours'
          ORDER BY virality_score DESC NULLS LAST
          LIMIT 1
        `),
        db.execute(sql`
          SELECT dominant_hook_type, dominant_niche
          FROM content_clusters
          WHERE trend_status = 'declining'
            AND dominant_niche = ANY(${nichesArr}::text[])
          LIMIT 2
        `),
      ]);

      const emergingCount = newEmerging.rows.length;
      const topHook = (topOpportunity.rows[0] as any)?.hook_text || null;
      const decliningTypes = declining.rows.map((r: any) => r.dominant_hook_type).filter(Boolean).join(', ');

      let briefContent = {
        headline: `${emergingCount} new patterns in your niche today`,
        summary: `Your niche is active with ${emergingCount} emerging patterns. Check the opportunities before creating today.`,
        action: "Open Opportunities and filter by Emerging to see what's working right now.",
      };

      try {
        const OpenAI = (await import('openai')).default;
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const briefPrompt = `You are the intelligence assistant of Craflect. Generate a short, actionable Daily Brief for a content creator.

Niche: ${primaryNiche}
Emerging patterns today: ${emergingCount}
Top hook of the day: ${topHook || 'N/A'}
Declining patterns: ${decliningTypes || 'none'}

Generate a JSON with:
{"headline":"catchy brief title (max 10 words)","summary":"2 sentences max, direct and actionable","action":"one concrete action starting with a verb"}
JSON only, no markdown.`;
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: briefPrompt }],
          response_format: { type: 'json_object' },
          temperature: 0.7,
          max_tokens: 200,
        });
        const parsed = JSON.parse(completion.choices[0].message.content || '{}');
        if (parsed.headline) briefContent = parsed;
      } catch (_) { /* use fallback */ }

      res.json({
        date: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
        userName: userData?.first_name?.split(' ')[0] || 'Creator',
        brief: briefContent,
        newEmerging: newEmerging.rows,
        topOpportunity: topOpportunity.rows[0] || null,
        declining: declining.rows,
        emergingCount,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // PERSONALIZED FEED — Netflix-style ranked content
  // ═══════════════════════════════════════════════════════════
  app.get('/api/feed/personalized', isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      const rawPlatform = (req.query.platform as string) || 'all';
      const ALLOWED_PLATFORMS = ['all', 'tiktok', 'instagram', 'youtube'];
      const platformFilter = ALLOWED_PLATFORMS.includes(rawPlatform) ? rawPlatform : 'all';

      const userResult = await db.execute(sql`
        SELECT primary_niche, selected_niches FROM users WHERE id = ${req.user.id}
      `);
      const u = userResult.rows[0] as any;
      const rawSelected: string[] = Array.isArray(u?.selected_niches) ? u.selected_niches : [];
      const primaryNiche = u?.primary_niche || rawSelected[0] || 'finance';
      const selectedNiches = rawSelected.length > 0 ? rawSelected : [primaryNiche];

      // Safe SQL injection: escape niche values manually
      const primaryEsc = primaryNiche.replace(/'/g, "''");
      const nichesSQL = selectedNiches.map((n: string) => `'${n.replace(/'/g, "''")}'`).join(',');
      const platformClause = platformFilter !== 'all'
        ? `AND v.platform = '${platformFilter.replace(/'/g, "''")}'`
        : '';

      // Score de pertinence :
      // +50 niche principale, +30 niche secondaire sélectionnée
      // +20 emerging, +10 trending
      // +velocity_7d * 2, +virality_score * 0.2
      const feed = await db.execute(sql.raw(`
        SELECT
          v.id, v.hook_text, v.hook_type_v2, v.structure_type,
          v.niche_cluster, v.virality_score, v.views, v.thumbnail_url,
          v.creator_name, v.duration_seconds, v.platform,
          cc.trend_status, cc.velocity_7d,
          p.pattern_id as pattern_id_ref,
          p.predicted_views_min, p.predicted_views_max, p.confidence_score,
          (
            CASE WHEN v.niche_cluster = '${primaryEsc}' THEN 50
                 WHEN v.niche_cluster = ANY(ARRAY[${nichesSQL}]::text[]) THEN 30
                 ELSE 0 END +
            CASE WHEN cc.trend_status = 'emerging' THEN 20
                 WHEN cc.trend_status = 'trending' THEN 10
                 ELSE 0 END +
            COALESCE(cc.velocity_7d, 0) * 2 +
            COALESCE(v.virality_score, 0) * 0.2
          ) AS relevance_score
        FROM videos v
        LEFT JOIN content_clusters cc ON v.id = ANY(cc.video_ids)
        LEFT JOIN patterns p ON p.cluster_id = cc.id::text
        WHERE v.classification_status = 'completed'
          AND v.virality_score >= 40
          AND v.hook_text IS NOT NULL
          AND v.niche_cluster = ANY(ARRAY[${nichesSQL}]::text[])
          ${platformClause}
        ORDER BY relevance_score DESC, v.virality_score DESC NULLS LAST
        LIMIT 40
      `));

      res.json({
        videos: feed.rows,
        primaryNiche,
        selectedNiches,
        totalResults: feed.rows.length,
      });
    } catch (error: any) {
      console.error('[feed/personalized] error:', error.message);
      res.json({ videos: [], primaryNiche: 'finance', selectedNiches: ['finance'], totalResults: 0 });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // FOUNDER ACCURACY — prediction engine stats
  // ═══════════════════════════════════════════════════════════
  app.get('/api/founder/accuracy', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      const stats = await db.execute(sql`
        SELECT
          COUNT(*) as total_predictions,
          COUNT(accuracy_score) as with_accuracy,
          AVG(accuracy_score)::numeric(4,2) as avg_accuracy,
          COUNT(*) FILTER (WHERE accuracy_score >= 0.7) as good_predictions,
          COUNT(*) FILTER (WHERE accuracy_score < 0.3) as poor_predictions
        FROM video_performance
        WHERE predicted_views IS NOT NULL
      `);
      res.json(stats.rows[0] || {});
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // PROOF SCREEN — personalized first-login wow moment
  // ═══════════════════════════════════════════════════════════
  app.get('/api/proof-screen', isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");

      const userResult = await db.execute(sql`
        SELECT first_name, primary_niche, selected_niches FROM users WHERE id = ${req.user.id}
      `);
      const userData = userResult.rows[0] as any;
      const niche = userData?.primary_niche || 'content_creation';

      const [topPatterns, nicheStats, emergingCount] = await Promise.all([
        db.execute(sql`
          SELECT
            p.pattern_id,
            p.pattern_label,
            p.hook_template,
            p.why_it_works,
            p.avg_virality_score,
            p.video_count,
            cc.trend_status,
            cc.velocity_7d
          FROM patterns p
          LEFT JOIN content_clusters cc ON cc.id::text = p.cluster_id
          WHERE p.topic_cluster = ${niche}
            AND p.pattern_label IS NOT NULL
          ORDER BY p.avg_virality_score DESC NULLS LAST
          LIMIT 3
        `),
        db.execute(sql`
          SELECT
            COUNT(*) as total_videos,
            AVG(virality_score)::numeric(5,1) as avg_virality,
            MAX(virality_score)::numeric(5,1) as max_virality,
            COUNT(*) FILTER (WHERE collected_at >= NOW() - INTERVAL '7 days') as new_this_week
          FROM videos
          WHERE niche_cluster = ${niche}
            AND classification_status = 'completed'
        `),
        db.execute(sql`
          SELECT COUNT(*) as count FROM content_clusters
          WHERE dominant_niche = ${niche}
            AND trend_status = 'emerging'
        `),
      ]);

      res.json({
        userName: userData?.first_name || 'Creator',
        niche,
        topPatterns: topPatterns.rows,
        nicheStats: nicheStats.rows[0] || { total_videos: 0, new_this_week: 0 },
        emergingCount: parseInt((emergingCount.rows[0] as any)?.count) || 0,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // BACKFILL — fix niche_cluster for existing videos
  // Maps topic_cluster → correct niche_cluster (5 target niches)
  // ═══════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════
  // PHASE 4 — Profile Import + Connected Accounts
  // ═══════════════════════════════════════════════════════════

  app.post('/api/user/import-profile', isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      const { profileUrl, platform } = req.body;
      const userId = req.user.id;

      if (!profileUrl || !platform) {
        return res.status(400).json({ error: 'profileUrl and platform required' });
      }

      const urlField = platform === 'tiktok' ? 'profile_url_tiktok'
        : platform === 'instagram' ? 'profile_url_instagram' : 'profile_url_youtube';

      await db.execute(sql.raw(`
        UPDATE users SET ${urlField} = '${profileUrl.replace(/'/g, "''")}',
          profile_connected = true, profile_imported_at = NOW()
        WHERE id = '${userId}'
      `));

      res.json({ success: true, message: 'Profile import started' });

      // Fire-and-forget background scrape
      scrapeUserProfile(userId, profileUrl, platform).catch(e =>
        console.error('[ProfileImport] Background scrape failed:', e.message)
      );
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/user/import-status', isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      const result = await db.execute(sql`
        SELECT profile_connected, profile_imported_at, profile_videos_count,
               profile_url_tiktok, profile_url_instagram, profile_url_youtube,
               popup_skip_count
        FROM users WHERE id = ${req.user.id}
      `);
      const row = result.rows[0] as any;
      const platforms: Array<{ platform: string; connectedAt: string; videoCount: number }> = [];
      if (row?.profile_url_tiktok) platforms.push({ platform: 'tiktok', connectedAt: row.profile_imported_at || new Date().toISOString(), videoCount: row.profile_videos_count || 0 });
      if (row?.profile_url_instagram) platforms.push({ platform: 'instagram', connectedAt: row.profile_imported_at || new Date().toISOString(), videoCount: row.profile_videos_count || 0 });
      if (row?.profile_url_youtube) platforms.push({ platform: 'youtube', connectedAt: row.profile_imported_at || new Date().toISOString(), videoCount: row.profile_videos_count || 0 });
      res.json({
        profileConnected: platforms.length > 0,
        platforms,
        lastImportedAt: row?.profile_imported_at || null,
        popupSkipCount: row?.popup_skip_count || 0,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/user/disconnect-profile/:platform', isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      const { platform } = req.params;
      const userId = req.user.id;

      const urlField = platform === 'tiktok' ? 'profile_url_tiktok'
        : platform === 'instagram' ? 'profile_url_instagram' : 'profile_url_youtube';

      await db.execute(sql.raw(`UPDATE users SET ${urlField} = NULL WHERE id = '${userId}'`));

      const remaining = await db.execute(sql`
        SELECT profile_url_tiktok, profile_url_instagram, profile_url_youtube
        FROM users WHERE id = ${userId}
      `);
      const r = remaining.rows[0] as any;
      if (!r?.profile_url_tiktok && !r?.profile_url_instagram && !r?.profile_url_youtube) {
        await db.execute(sql`UPDATE users SET profile_connected = false WHERE id = ${userId}`);
      }

      await db.execute(sql`DELETE FROM user_videos WHERE user_id = ${userId} AND platform = ${platform}`);

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ── GET /api/cluster/:id — cluster detail with videos ──
  app.get('/api/cluster/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      const cluster = await db.execute(sql`
        SELECT cc.*,
               json_agg(
                 json_build_object(
                   'id', v.id, 'hook_text', v.hook_text, 'virality_score', v.virality_score,
                   'thumbnail_url', v.thumbnail_url, 'views', v.views, 'niche_cluster', v.niche_cluster
                 ) ORDER BY v.virality_score DESC NULLS LAST
               ) FILTER (WHERE v.id IS NOT NULL) as videos
        FROM content_clusters cc
        LEFT JOIN videos v ON v.id = ANY(cc.video_ids)
        WHERE cc.id = ${req.params.id}
        GROUP BY cc.id
        LIMIT 1
      `);
      res.json(cluster.rows[0] || null);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ── GET /api/patterns/list — ordered by user niche ──
  app.get('/api/patterns/list', isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      const specificPatternId = (req.query.patternId as string) || '';

      const userRes = await db.execute(sql`SELECT selected_niches, primary_niche FROM users WHERE id = ${req.user.id}`);
      const row = userRes.rows[0] as any;
      const rawSelected: string[] = Array.isArray(row?.selected_niches) ? row.selected_niches : [];
      const primaryNiche = row?.primary_niche || rawSelected[0] || null;
      const niches: string[] = rawSelected.length > 0 ? rawSelected : (primaryNiche ? [primaryNiche] : []);

      console.log(`[patterns/list] user=${req.user.id} primaryNiche=${primaryNiche} niches=${JSON.stringify(niches)}`);

      if (niches.length === 0) {
        // Fallback : top 10 toutes niches — specific pattern first if requested
        const specificSafeId = specificPatternId ? specificPatternId.replace(/'/g, "''") : '';
        const orderSpecificFallback = specificSafeId
          ? `CASE WHEN p.pattern_id = '${specificSafeId}' THEN 0 ELSE 1 END,`
          : '';
        const fallback = await db.execute(sql.raw(`
          SELECT p.pattern_id as id, p.pattern_id, p.pattern_label, p.hook_template, p.structure_template,
                 p.optimal_duration, p.why_it_works, p.best_for, p.cta_suggestion,
                 p.avg_virality_score, p.avg_engagement_rate, p.topic_cluster, p.video_count,
                 p.predicted_views_min, p.predicted_views_max, p.confidence_score,
                 p.sub_niche, p.hook_type_v2, p.decay_weight, p.created_at, p.velocity_7d,
                 cc.trend_status, cc.velocity_7d as cc_velocity_7d
          FROM patterns p
          LEFT JOIN content_clusters cc ON cc.id::text = p.cluster_id
          WHERE p.pattern_label IS NOT NULL AND p.hook_template IS NOT NULL
          ORDER BY ${orderSpecificFallback} p.avg_virality_score DESC NULLS LAST
          LIMIT 10
        `));
        const enrichedFallback = (fallback.rows as any[]).map(p => {
          const clusterLevel = p.sub_niche ? 3 : 2;
          const vel = p.velocity_7d ?? p.cc_velocity_7d ?? 0;
          const pat_platform = p.platform || 'tiktok';
          return {
            ...p,
            platform: pat_platform,
            signal_strength: computeSignalStrength({ video_count: p.video_count, velocity_7d: vel, cluster_level: clusterLevel, platform: pat_platform }),
            cluster_key: [p.topic_cluster, p.sub_niche, p.hook_type_v2, pat_platform].filter(Boolean).join('|'),
            cluster_level: clusterLevel,
            velocity_7d: vel,
          };
        });
        return res.json(enrichedFallback);
      }
      const nichesStr = niches.map((n: string) => `'${n.replace(/'/g, "''")}'`).join(',');
      const specificClause = specificPatternId
        ? `OR p.pattern_id = '${specificPatternId.replace(/'/g, "''")}'`
        : '';
      const orderSpecific = specificPatternId
        ? `CASE WHEN p.pattern_id = '${specificPatternId.replace(/'/g, "''")}' THEN 0 ELSE 1 END,`
        : '';

      const patterns = await db.execute(sql.raw(`
        SELECT p.pattern_id as id, p.pattern_id, p.pattern_label, p.hook_template, p.structure_template,
               p.optimal_duration, p.why_it_works, p.best_for, p.cta_suggestion,
               p.avg_virality_score, p.avg_engagement_rate, p.topic_cluster, p.video_count,
               p.predicted_views_min, p.predicted_views_max, p.confidence_score,
               p.sub_niche, p.hook_type_v2, p.decay_weight, p.created_at, p.velocity_7d,
               cc.trend_status, cc.velocity_7d as cc_velocity_7d
        FROM patterns p
        LEFT JOIN content_clusters cc ON cc.id::text = p.cluster_id
        WHERE p.pattern_label IS NOT NULL AND p.hook_template IS NOT NULL
          AND (
            p.topic_cluster = ANY(ARRAY[${nichesStr}]::text[])
            ${specificClause}
          )
        ORDER BY
          ${orderSpecific}
          CASE WHEN p.topic_cluster = '${primaryNiche.replace(/'/g, "''")}' THEN 0 ELSE 1 END,
          p.avg_virality_score DESC NULLS LAST
        LIMIT 20
      `));
      const enriched = (patterns.rows as any[]).map(p => {
        const clusterLevel = p.sub_niche ? 3 : 2;
        const vel = p.velocity_7d ?? p.cc_velocity_7d ?? 0;
        const pat_platform = p.platform || 'tiktok';
        return {
          ...p,
          platform: pat_platform,
          signal_strength: computeSignalStrength({ video_count: p.video_count, velocity_7d: vel, cluster_level: clusterLevel, platform: pat_platform }),
          cluster_key: [p.topic_cluster, p.sub_niche, p.hook_type_v2, pat_platform].filter(Boolean).join('|'),
          cluster_level: clusterLevel,
          velocity_7d: vel,
        };
      });
      res.json(enriched);
    } catch (error: any) {
      console.error('[patterns/list] error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // ── POST /api/workspace/save-brief — save Studio filming brief as idea ──
  app.post('/api/workspace/save-brief', isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { savedIdeas } = await import("@shared/schema");
      const input = z.object({
        hookFinal: z.string().min(1),
        patternId: z.string().optional(),
        duration: z.string().optional(),
      }).parse(req.body);

      const [idea] = await db.insert(savedIdeas).values({
        userId: req.user.id,
        hook: input.hookFinal,
        format: "studio_brief",
        topic: input.patternId || null,
        opportunityScore: null,
        velocity: null,
        videosDetected: null,
        status: "saved",
      }).returning();

      res.status(201).json({ success: true, id: idea?.id });
    } catch (error: any) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message });
      console.error("Save brief error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/admin/backfill-niches', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");

      const result = await db.execute(sql`
        UPDATE videos
        SET niche_cluster = CASE
          WHEN topic_cluster IN ('ai_tools','ai_automation','tech','saas') THEN 'ai_tools'
          WHEN topic_cluster IN ('finance','crypto','real_estate') THEN 'finance'
          WHEN topic_cluster IN ('online_business','entrepreneurship','ecommerce','digital_marketing') THEN 'online_business'
          WHEN topic_cluster IN ('content_creation','personal_branding','education','coaching','entertainment','gaming') THEN 'content_creation'
          WHEN topic_cluster IN ('productivity','motivation','lifestyle','fitness','health','beauty','food','travel','relationships') THEN 'productivity'
          ELSE niche_cluster
        END
        WHERE niche_cluster IS NULL
           OR niche_cluster NOT IN ('ai_tools','finance','online_business','content_creation','productivity')
      `);

      // Also run keyword-based backfill for videos where topic_cluster didn't match
      // (videos where niche_cluster is still null after the CASE update)
      const stillNull = await db.execute(sql`
        SELECT COUNT(*) as count FROM videos
        WHERE classification_status = 'completed'
          AND niche_cluster IS NULL
      `);

      res.json({
        message: 'Backfill complete',
        rowsUpdated: (result as any).rowCount || 0,
        stillNullAfter: parseInt((stillNull.rows[0] as any)?.count) || 0,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ── GET /api/video/:id — Page détail vidéo ──────────────────────────────────
  app.get('/api/video/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      const videoId = req.params.id;

      const videoResult = await db.execute(sql`
        SELECT
          v.*,
          cc.id as cluster_id, cc.trend_status, cc.velocity_7d, cc.dominant_niche,
          p.pattern_id, p.pattern_label, p.hook_template, p.why_it_works,
          p.cta_suggestion, p.optimal_duration, p.structure_template,
          p.predicted_views_min, p.predicted_views_max, p.confidence_score,
          p.video_count, p.avg_virality_score as pattern_virality
        FROM videos v
        LEFT JOIN content_clusters cc ON v.id = ANY(cc.video_ids)
        LEFT JOIN patterns p ON p.cluster_id = cc.id::text
        WHERE v.id = ${videoId}
        LIMIT 1
      `);

      if (!videoResult.rows.length) return res.status(404).json({ error: 'Not found' });
      const video = videoResult.rows[0] as any;

      const similar = await db.execute(sql`
        SELECT v.id, v.hook_text, v.hook_type_v2, v.niche_cluster,
               v.virality_score, v.thumbnail_url,
               cc.trend_status,
               p.predicted_views_min, p.predicted_views_max, p.confidence_score
        FROM videos v
        LEFT JOIN content_clusters cc ON v.id = ANY(cc.video_ids)
        LEFT JOIN patterns p ON p.cluster_id = cc.id::text
        WHERE v.niche_cluster = ${video.niche_cluster}
          AND v.id != ${videoId}
          AND v.classification_status = 'completed'
          AND v.virality_score >= 40
        ORDER BY v.virality_score DESC NULLS LAST
        LIMIT 10
      `);

      const patterns = await db.execute(sql`
        SELECT pattern_id, pattern_label, hook_template, avg_virality_score,
               predicted_views_min, predicted_views_max, confidence_score
        FROM patterns
        WHERE topic_cluster = ${video.niche_cluster}
          AND pattern_label IS NOT NULL
        ORDER BY confidence_score DESC NULLS LAST
        LIMIT 6
      `);

      res.json({ video, similar: similar.rows, patterns: patterns.rows });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ── POST /api/video/:id/like — Toggle like on a video ─────────────────────
  app.post('/api/video/:id/like', isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      const videoId = req.params.id;

      const userResult = await db.execute(sql`
        SELECT liked_video_ids FROM users WHERE id = ${req.user.id}
      `);
      const likedIds: string[] = (userResult.rows[0] as any)?.liked_video_ids || [];
      const isLiked = likedIds.includes(videoId);

      if (isLiked) {
        await db.execute(sql`
          UPDATE users SET liked_video_ids = array_remove(liked_video_ids, ${videoId})
          WHERE id = ${req.user.id}
        `);
      } else {
        await db.execute(sql`
          UPDATE users SET liked_video_ids = array_append(COALESCE(liked_video_ids, ARRAY[]::text[]), ${videoId})
          WHERE id = ${req.user.id}
        `);
      }
      res.json({ liked: !isLiked });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ── POST /api/patterns/compute-predictions ──────────────────────────────────
  app.post('/api/patterns/compute-predictions', isAuthenticated, async (_req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      await db.execute(sql`
        UPDATE patterns SET
          predicted_views_min = (avg_virality_score * 10000)::integer,
          predicted_views_max = (avg_virality_score * 50000)::integer,
          confidence_score = LEAST(95, (video_count * 3) + (avg_virality_score * 0.5))
        WHERE pattern_label IS NOT NULL AND avg_virality_score IS NOT NULL
      `);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ── GET /api/daily-signal ────────────────────────────────────────────────────
  app.get('/api/daily-signal', isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");

      const userResult = await db.execute(sql`
        SELECT primary_niche, selected_niches, daily_signal_pattern_id, daily_signal_date, daily_signal_used
        FROM users WHERE id = ${req.user.id}
      `);
      const u = userResult.rows[0] as any;
      const today = new Date().toISOString().split('T')[0];

      // Normalize date: DB returns date as string 'YYYY-MM-DD' or Date object
      const signalDate = u?.daily_signal_date instanceof Date
        ? u.daily_signal_date.toISOString().split('T')[0]
        : typeof u?.daily_signal_date === 'string'
          ? u.daily_signal_date.split('T')[0]
          : null;

      // Robust niche fallback
      const selectedNiches: string[] = Array.isArray(u?.selected_niches) ? u.selected_niches : [];
      const niche = u?.primary_niche || selectedNiches[0] || 'finance';

      // Signal du jour déjà utilisé
      if (u?.daily_signal_used && signalDate === today) {
        return res.json({ used: true, message: "Come back tomorrow for your next signal 🔥" });
      }

      // Signal du jour déjà assigné (pas encore utilisé)
      if (u?.daily_signal_pattern_id && signalDate === today) {
        const existing = await db.execute(sql`
          SELECT p.*, cc.trend_status, cc.velocity_7d
          FROM patterns p
          LEFT JOIN content_clusters cc ON cc.id::text = p.cluster_id
          WHERE p.pattern_id = ${u.daily_signal_pattern_id}
        `);
        const existPat = existing.rows[0] as any || null;
        if (existPat) {
          const clusterLevel = existPat.sub_niche ? 3 : 2;
          const pat_platform = existPat.platform || 'tiktok';
          existPat.platform = pat_platform;
          existPat.signal_strength = computeSignalStrength({ video_count: existPat.video_count, velocity_7d: existPat.velocity_7d, cluster_level: clusterLevel, platform: pat_platform });
          existPat.cluster_key = [existPat.topic_cluster, existPat.sub_niche, existPat.hook_type_v2, pat_platform].filter(Boolean).join('|');
          existPat.cluster_level = clusterLevel;
          existPat.days_since_emerged = existPat.created_at ? Math.floor((Date.now() - new Date(existPat.created_at).getTime()) / 86400000) : null;
          existPat.last_refreshed_at = new Date().toISOString();
          existPat.refresh_cycle_hours = 72;
        }
        return res.json({ signal: existPat, used: false });
      }

      // Nouveau signal — avoid patterns shown in last 7 days
      const recentResult = await db.execute(sql`
        SELECT COALESCE(array_agg(daily_signal_pattern_id) FILTER (WHERE daily_signal_pattern_id IS NOT NULL), ARRAY[]::text[])
        FROM users WHERE id = ${req.user.id} AND daily_signal_date >= CURRENT_DATE - INTERVAL '7 days'
      `);
      const recentIds: string[] = (recentResult.rows[0] as any)?.coalesce || [];
      const excludeClause = recentIds.length > 0
        ? `AND p.pattern_id != ALL(ARRAY[${recentIds.map(id => `'${id.replace(/'/g, "''")}'`).join(',')}]::text[])`
        : '';

      const signal = await db.execute(sql.raw(`
        SELECT p.*, cc.trend_status, cc.velocity_7d
        FROM patterns p
        LEFT JOIN content_clusters cc ON cc.id::text = p.cluster_id
        WHERE p.topic_cluster = '${niche.replace(/'/g, "''")}'
          AND p.pattern_label IS NOT NULL
          AND p.confidence_score IS NOT NULL
          ${excludeClause}
        ORDER BY p.confidence_score DESC, p.avg_virality_score DESC NULLS LAST
        LIMIT 1
      `));

      if (signal.rows.length > 0) {
        const pat = signal.rows[0] as any;
        await db.execute(sql`
          UPDATE users SET
            daily_signal_pattern_id = ${pat.pattern_id},
            daily_signal_date = CURRENT_DATE,
            daily_signal_used = false
          WHERE id = ${req.user.id}
        `);
        const clusterLevel = pat.sub_niche ? 3 : 2;
        const pat_platform = pat.platform || 'tiktok';
        pat.platform = pat_platform;
        pat.signal_strength = computeSignalStrength({ video_count: pat.video_count, velocity_7d: pat.velocity_7d, cluster_level: clusterLevel, platform: pat_platform });
        pat.cluster_key = [pat.topic_cluster, pat.sub_niche, pat.hook_type_v2, pat_platform].filter(Boolean).join('|');
        pat.cluster_level = clusterLevel;
        pat.days_since_emerged = pat.created_at ? Math.floor((Date.now() - new Date(pat.created_at).getTime()) / 86400000) : null;
        pat.last_refreshed_at = new Date().toISOString();
        pat.refresh_cycle_hours = 72;
        return res.json({ signal: pat, used: false });
      }

      res.json({ signal: null, used: false });
    } catch (error: any) {
      console.error('[daily-signal] error:', error.message);
      res.json({ signal: null, used: false }); // graceful fallback, never 500
    }
  });

  // ── POST /api/daily-signal/use ───────────────────────────────────────────────
  app.post('/api/daily-signal/use', isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      await db.execute(sql`UPDATE users SET daily_signal_used = true WHERE id = ${req.user.id}`);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ── GET /api/playbook/today ──────────────────────────────────────────────────
  app.get('/api/playbook/today', isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      const userId = req.user.id;
      const today = new Date().toISOString().split('T')[0];

      let playbook = await db.execute(sql`
        SELECT * FROM daily_playbook WHERE user_id = ${userId} AND date = ${today}
      `);

      if (!playbook.rows.length) {
        await db.execute(sql`
          INSERT INTO daily_playbook (user_id, date)
          VALUES (${userId}, ${today})
          ON CONFLICT DO NOTHING
        `);
        playbook = await db.execute(sql`
          SELECT * FROM daily_playbook WHERE user_id = ${userId} AND date = ${today}
        `);
      }

      const row = playbook.rows[0] as any;

      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const yesterdayRow = await db.execute(sql`
        SELECT streak_count FROM daily_playbook WHERE user_id = ${userId} AND date = ${yesterday}
      `);
      const streak = yesterdayRow.rows.length > 0
        ? ((yesterdayRow.rows[0] as any).streak_count || 0) + 1
        : 1;

      const completedCount = [row.task_signal, row.task_patterns, row.task_brief, row.task_track]
        .filter(Boolean).length;

      res.json({
        tasks: {
          signal: row.task_signal,
          patterns: row.task_patterns,
          brief: row.task_brief,
          track: row.task_track,
        },
        completedCount,
        streak,
      });
    } catch (error: any) {
      console.error('[playbook/today] error:', error.message);
      res.json({ tasks: { signal: false, patterns: false, brief: false, track: false }, completedCount: 0, streak: 1 });
    }
  });

  // ── POST /api/playbook/complete ──────────────────────────────────────────────
  app.post('/api/playbook/complete', isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      const userId = req.user.id;
      const today = new Date().toISOString().split('T')[0];
      const { task } = req.body as { task: 'signal' | 'patterns' | 'brief' | 'track' };

      const colMap: Record<string, string> = {
        signal: 'task_signal',
        patterns: 'task_patterns',
        brief: 'task_brief',
        track: 'task_track',
      };
      const col = colMap[task];
      if (!col) return res.status(400).json({ message: 'Invalid task' });

      await db.execute(sql.raw(`
        UPDATE daily_playbook SET ${col} = true
        WHERE user_id = '${userId.replace(/'/g, "''")}' AND date = '${today}'
      `));

      res.json({ success: true });
    } catch (error: any) {
      console.error('[playbook/complete] error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}

  app.get('/api/user/streak', isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      const today = new Date().toISOString().split('T')[0];
      const row = await db.execute(sql`
        SELECT streak_count FROM daily_playbook
        WHERE user_id = ${req.user.id} AND date = ${today}
      `);
      const streak = (row.rows[0] as any)?.streak_count ?? 0;
      return res.json({ streak });
    } catch {
      return res.json({ streak: 0 });
    }
  });

function formatViewCount(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(0)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)}k`;
  return num.toString();
}

// ─── Profile Import helpers ───────────────────────────────────────────────────

async function scrapeUserProfile(userId: string, profileUrl: string, platform: string) {
  const { db } = await import("./db");
  const { sql } = await import("drizzle-orm");
  const { ApifyClient } = await import('apify-client');
  const apify = new ApifyClient({ token: process.env.APIFY_API_KEY });

  try {
    console.log(`[ProfileImport] Scraping ${platform} profile: ${profileUrl}`);

    let actorId = 'clockworks/tiktok-scraper';
    let input: any = {};

    if (platform === 'tiktok') {
      input = { profiles: [profileUrl], resultsPerPage: 30, shouldDownloadVideos: false, shouldDownloadCovers: true };
    } else if (platform === 'instagram') {
      actorId = 'apify/instagram-reel-scraper';
      const handle = profileUrl.replace(/\/$/, '').split('/').pop() || '';
      input = { username: handle, resultsLimit: 30 };
    } else {
      actorId = 'streamers/youtube-scraper';
      input = { startUrls: [{ url: profileUrl }], maxResults: 30, type: 'shorts' };
    }

    const run = await apify.actor(actorId).call(input, { waitSecs: 120 });
    const { items } = await apify.dataset(run.defaultDatasetId).listItems();

    let imported = 0;
    for (const item of items as any[]) {
      try {
        const views = item.playCount || item.viewCount || item.stats?.viewCount || 0;
        const likes = item.diggCount || item.likeCount || item.stats?.likeCount || 0;
        const pvId = String(item.id || item.videoId || `${platform}_${Date.now()}_${Math.random().toString(36).slice(2,7)}`);
        await db.execute(sql`
          INSERT INTO user_videos (user_id, platform, platform_video_id, video_url, thumbnail_url, caption, views, likes, duration_seconds, published_at)
          VALUES (${userId}, ${platform}, ${pvId},
            ${item.webVideoUrl || item.url || null},
            ${item.videoMeta?.coverUrl || item.thumbnail || null},
            ${item.text || item.description || null},
            ${views}, ${likes},
            ${item.videoMeta?.duration || item.duration || null},
            ${item.createTime ? new Date(item.createTime * 1000).toISOString() : null})
          ON CONFLICT (user_id, platform_video_id) DO NOTHING
        `);
        imported++;
      } catch (_) {}
    }

    await db.execute(sql`UPDATE users SET profile_videos_count = ${imported} WHERE id = ${userId}`);
    await buildUserDnaFromVideos(userId);
    console.log(`[ProfileImport] Imported ${imported} videos for user ${userId}`);
  } catch (error: any) {
    console.error(`[ProfileImport] Error for user ${userId}: ${error.message}`);
  }
}

async function buildUserDnaFromVideos(userId: string) {
  const { db } = await import("./db");
  const { sql } = await import("drizzle-orm");

  const result = await db.execute(sql`
    SELECT views, likes, hook_type, structure_type, duration_seconds FROM user_videos WHERE user_id = ${userId}
  `);
  if (!result.rows.length) return;

  const rows = result.rows as any[];
  const hookPerf: Record<string, { count: number; avgViews: number }> = {};
  rows.forEach((r: any) => {
    if (r.hook_type) {
      if (!hookPerf[r.hook_type]) hookPerf[r.hook_type] = { count: 0, avgViews: 0 };
      hookPerf[r.hook_type].count++;
      hookPerf[r.hook_type].avgViews += r.views || 0;
    }
  });
  Object.keys(hookPerf).forEach(k => {
    hookPerf[k].avgViews = Math.round(hookPerf[k].avgViews / hookPerf[k].count);
  });

  await db.execute(sql`
    INSERT INTO user_content_dna (user_id, hook_type_performance, total_tracked_videos, updated_at)
    VALUES (${userId}, ${JSON.stringify(hookPerf)}, ${rows.length}, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      hook_type_performance = ${JSON.stringify(hookPerf)},
      total_tracked_videos = ${rows.length},
      updated_at = NOW()
  `);
}
