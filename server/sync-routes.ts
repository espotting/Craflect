import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import path from "path";
import fs from "fs";
import { pool } from "./db";

const SYNC_API_KEY = process.env.SYNC_API_KEY;
const syncBodyParser = express.json({ limit: "20mb" });

function syncAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!SYNC_API_KEY) {
    return res.status(500).json({ error: "SYNC_API_KEY not configured" });
  }
  if (!authHeader || authHeader !== `Bearer ${SYNC_API_KEY}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

function n(v: any): any {
  return v === undefined ? null : v;
}

export function registerSyncRoutes(app: Express) {

  app.post("/api/sync/videos", syncBodyParser, syncAuth, async (req: Request, res: Response) => {
    try {
      const { videos } = req.body;
      if (!Array.isArray(videos) || videos.length === 0) {
        return res.status(400).json({ error: "videos array required" });
      }

      let upserted = 0;
      let errors = 0;

      for (const v of videos) {
        try {
          await pool.query(`
            INSERT INTO videos (
              id, platform, video_url, download_url, caption, transcript, hashtags,
              duration_seconds, duration_bucket, views, likes, comments, shares,
              creator_name, creator_niche, collected_at,
              hook_mechanism, hook_format, hook_text, emotional_trigger,
              content_structure, content_format, visual_style,
              storytelling_presence, content_pace, creator_archetype,
              topic_category, call_to_action, controversy_level,
              information_density, pattern_notes,
              classified_at, classified_by, classification_status,
              classification_started_at, hook_topic, content_goal,
              platform_video_id, creator_id, published_at, updated_at,
              taxonomy_version, hook_type_v2, hook_pattern, hook_duration,
              hook_position, structure_type, beats_count,
              reveal_time, demo_presence, proof_presence, cta_type_v2,
              facecam, screen_recording, broll_usage, text_overlay_density,
              cut_frequency, visual_switch_rate,
              emotion_primary, emotion_secondary,
              topic_cluster, topic_subcluster,
              engagement_rate, view_velocity, virality_score,
              pattern_id_ref, v2_classified_at, v2_classified_by,
              classification_attempts, hook_mechanism_primary,
              trend_score_processed_at, thumbnail_url, creator_url,
              creator_platform_id, geo_zone, geo_country, geo_language,
              target_markets, is_archived, confidence, niche_cluster,
              content_hash, views_per_hour, is_deep_selected,
              deep_selection_reason, transcription_status, audio_url,
              transcript_language, transcript_generated,
              is_us_content, country_detected
            ) VALUES (
              $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
              $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
              $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,
              $31,$32,$33,$34,$35,$36,$37,$38,$39,$40,
              $41,$42,$43,$44,$45,$46,$47,$48,$49,$50,
              $51,$52,$53,$54,$55,$56,$57,$58,$59,$60,
              $61,$62,$63,$64,$65,$66,$67,$68,$69,$70,
              $71,$72,$73,$74,$75,$76,$77,$78,$79,$80,
              $81,$82,$83,$84,$85,$86,$87,$88,$89,$90,$91
            )
            ON CONFLICT (id) DO UPDATE SET
              transcript = COALESCE(EXCLUDED.transcript, videos.transcript),
              views = COALESCE(EXCLUDED.views, videos.views),
              likes = COALESCE(EXCLUDED.likes, videos.likes),
              comments = COALESCE(EXCLUDED.comments, videos.comments),
              shares = COALESCE(EXCLUDED.shares, videos.shares),
              classification_status = COALESCE(EXCLUDED.classification_status, videos.classification_status),
              classified_at = COALESCE(EXCLUDED.classified_at, videos.classified_at),
              classified_by = COALESCE(EXCLUDED.classified_by, videos.classified_by),
              hook_type_v2 = COALESCE(EXCLUDED.hook_type_v2, videos.hook_type_v2),
              hook_pattern = COALESCE(EXCLUDED.hook_pattern, videos.hook_pattern),
              structure_type = COALESCE(EXCLUDED.structure_type, videos.structure_type),
              emotion_primary = COALESCE(EXCLUDED.emotion_primary, videos.emotion_primary),
              topic_cluster = COALESCE(EXCLUDED.topic_cluster, videos.topic_cluster),
              thumbnail_url = COALESCE(EXCLUDED.thumbnail_url, videos.thumbnail_url),
              virality_score = COALESCE(EXCLUDED.virality_score, videos.virality_score),
              engagement_rate = COALESCE(EXCLUDED.engagement_rate, videos.engagement_rate),
              niche_cluster = COALESCE(EXCLUDED.niche_cluster, videos.niche_cluster),
              transcription_status = COALESCE(EXCLUDED.transcription_status, videos.transcription_status),
              updated_at = now()
          `, [
            v.id, n(v.platform), n(v.video_url), n(v.download_url), n(v.caption), n(v.transcript),
            n(v.hashtags), n(v.duration_seconds), n(v.duration_bucket), n(v.views), n(v.likes),
            n(v.comments), n(v.shares), n(v.creator_name), n(v.creator_niche),
            v.collected_at || new Date().toISOString(),
            n(v.hook_mechanism), n(v.hook_format), n(v.hook_text), n(v.emotional_trigger),
            n(v.content_structure), n(v.content_format), n(v.visual_style),
            n(v.storytelling_presence), n(v.content_pace), n(v.creator_archetype),
            n(v.topic_category), n(v.call_to_action), n(v.controversy_level),
            n(v.information_density), n(v.pattern_notes),
            n(v.classified_at), n(v.classified_by), v.classification_status || 'pending',
            n(v.classification_started_at), n(v.hook_topic), n(v.content_goal),
            n(v.platform_video_id), n(v.creator_id), n(v.published_at),
            v.updated_at || new Date().toISOString(),
            v.taxonomy_version || '1.0', n(v.hook_type_v2), n(v.hook_pattern),
            n(v.hook_duration), n(v.hook_position), n(v.structure_type),
            n(v.beats_count), n(v.reveal_time), n(v.demo_presence),
            n(v.proof_presence), n(v.cta_type_v2),
            v.facecam ?? null, v.screen_recording ?? null,
            n(v.broll_usage), n(v.text_overlay_density), n(v.cut_frequency),
            n(v.visual_switch_rate), n(v.emotion_primary), n(v.emotion_secondary),
            n(v.topic_cluster), n(v.topic_subcluster),
            n(v.engagement_rate), n(v.view_velocity), n(v.virality_score),
            n(v.pattern_id_ref), n(v.v2_classified_at), n(v.v2_classified_by),
            v.classification_attempts ?? 0, n(v.hook_mechanism_primary),
            n(v.trend_score_processed_at), v.thumbnail_url || `http://178.104.52.64:3000/thumbnails/${v.id}.jpg`, n(v.creator_url),
            n(v.creator_platform_id), n(v.geo_zone), n(v.geo_country), n(v.geo_language),
            n(v.target_markets), v.is_archived ?? false, n(v.confidence), n(v.niche_cluster),
            n(v.content_hash), n(v.views_per_hour),
            v.is_deep_selected ?? false, n(v.deep_selection_reason),
            n(v.transcription_status), n(v.audio_url), n(v.transcript_language),
            v.transcript_generated ?? false,
            v.is_us_content ?? false, n(v.country_detected)
          ]);
          upserted++;
        } catch (err: any) {
          console.error(`Sync video ${v.id} error:`, err.message);
          errors++;
        }
      }

      res.json({ upserted, errors, total: videos.length });
    } catch (err: any) {
      console.error("Sync videos error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/sync/classifications", syncBodyParser, syncAuth, async (req: Request, res: Response) => {
    try {
      const { classifications } = req.body;
      if (!Array.isArray(classifications) || classifications.length === 0) {
        return res.status(400).json({ error: "classifications array required" });
      }

      let upserted = 0;
      let errors = 0;

      for (const c of classifications) {
        try {
          await pool.query(`
            INSERT INTO video_classification (
              id, video_id, hook_type, structure_type, topic_cluster,
              emotion_value, format_type, cta_type, visual_style,
              cut_frequency, niche_cluster, classified_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
            ON CONFLICT (id) DO UPDATE SET
              hook_type = COALESCE(EXCLUDED.hook_type, video_classification.hook_type),
              structure_type = COALESCE(EXCLUDED.structure_type, video_classification.structure_type),
              topic_cluster = COALESCE(EXCLUDED.topic_cluster, video_classification.topic_cluster),
              emotion_value = COALESCE(EXCLUDED.emotion_value, video_classification.emotion_value),
              format_type = COALESCE(EXCLUDED.format_type, video_classification.format_type),
              niche_cluster = COALESCE(EXCLUDED.niche_cluster, video_classification.niche_cluster)
          `, [
            c.id, c.video_id, n(c.hook_type), n(c.structure_type),
            n(c.topic_cluster), n(c.emotion_value), n(c.format_type),
            n(c.cta_type), n(c.visual_style), n(c.cut_frequency),
            n(c.niche_cluster), c.classified_at || new Date().toISOString()
          ]);
          upserted++;
        } catch (err: any) {
          console.error(`Sync classification ${c.id} error:`, err.message);
          errors++;
        }
      }

      res.json({ upserted, errors, total: classifications.length });
    } catch (err: any) {
      console.error("Sync classifications error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/sync/patterns", syncBodyParser, syncAuth, async (req: Request, res: Response) => {
    try {
      const { patterns } = req.body;
      if (!Array.isArray(patterns) || patterns.length === 0) {
        return res.status(400).json({ error: "patterns array required" });
      }

      let upserted = 0;
      let errors = 0;

      for (const p of patterns) {
        try {
          await pool.query(`
            INSERT INTO patterns (
              pattern_id, dimension_keys, hook_type, structure_type,
              emotion_primary, topic_cluster, topic_category, facecam,
              cut_frequency, text_overlay_density, platform,
              video_count, avg_virality_score, median_virality_score,
              avg_engagement_rate, performance_rank, pattern_label,
              last_updated, pattern_score, velocity_mid, pattern_novelty,
              trend_classification, pattern_type, pattern_text,
              pattern_frequency, pattern_velocity, geo_zone
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27)
            ON CONFLICT (pattern_id) DO UPDATE SET
              video_count = EXCLUDED.video_count,
              avg_virality_score = EXCLUDED.avg_virality_score,
              median_virality_score = EXCLUDED.median_virality_score,
              avg_engagement_rate = EXCLUDED.avg_engagement_rate,
              performance_rank = EXCLUDED.performance_rank,
              pattern_label = COALESCE(EXCLUDED.pattern_label, patterns.pattern_label),
              pattern_score = EXCLUDED.pattern_score,
              velocity_mid = EXCLUDED.velocity_mid,
              pattern_novelty = EXCLUDED.pattern_novelty,
              trend_classification = EXCLUDED.trend_classification,
              pattern_frequency = EXCLUDED.pattern_frequency,
              pattern_velocity = EXCLUDED.pattern_velocity,
              last_updated = now()
          `, [
            p.pattern_id, p.dimension_keys || '{}',
            n(p.hook_type), n(p.structure_type), n(p.emotion_primary),
            n(p.topic_cluster), n(p.topic_category), p.facecam ?? null,
            n(p.cut_frequency), n(p.text_overlay_density), n(p.platform),
            p.video_count || 0, n(p.avg_virality_score), n(p.median_virality_score),
            n(p.avg_engagement_rate), n(p.performance_rank), n(p.pattern_label),
            p.last_updated || new Date().toISOString(),
            n(p.pattern_score), n(p.velocity_mid), n(p.pattern_novelty),
            n(p.trend_classification), n(p.pattern_type), n(p.pattern_text),
            p.pattern_frequency || 0, n(p.pattern_velocity), n(p.geo_zone)
          ]);
          upserted++;
        } catch (err: any) {
          console.error(`Sync pattern ${p.pattern_id} error:`, err.message);
          errors++;
        }
      }

      res.json({ upserted, errors, total: patterns.length });
    } catch (err: any) {
      console.error("Sync patterns error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/sync/video-patterns", syncBodyParser, syncAuth, async (req: Request, res: Response) => {
    try {
      const { videoPatterns } = req.body;
      if (!Array.isArray(videoPatterns) || videoPatterns.length === 0) {
        return res.status(400).json({ error: "videoPatterns array required" });
      }

      let upserted = 0;
      let errors = 0;

      for (const vp of videoPatterns) {
        try {
          await pool.query(`
            INSERT INTO video_patterns (id, video_id, pattern_id, match_score, created_at)
            VALUES ($1,$2,$3,$4,$5)
            ON CONFLICT (id) DO UPDATE SET
              match_score = EXCLUDED.match_score
          `, [
            vp.id, vp.video_id, vp.pattern_id, n(vp.match_score),
            vp.created_at || new Date().toISOString()
          ]);
          upserted++;
        } catch (err: any) {
          console.error(`Sync video_pattern ${vp.id} error:`, err.message);
          errors++;
        }
      }

      res.json({ upserted, errors, total: videoPatterns.length });
    } catch (err: any) {
      console.error("Sync video-patterns error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/sync/opportunities", syncBodyParser, syncAuth, async (req: Request, res: Response) => {
    try {
      const { opportunities } = req.body;
      if (!Array.isArray(opportunities) || opportunities.length === 0) {
        return res.status(400).json({ error: "opportunities array required" });
      }

      let upserted = 0;
      let errors = 0;

      for (const o of opportunities) {
        try {
          await pool.query(`
            INSERT INTO opportunities (id, pattern_template_id, hook, topic, structure, format, generated_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7)
            ON CONFLICT (id) DO UPDATE SET
              hook = COALESCE(EXCLUDED.hook, opportunities.hook),
              topic = COALESCE(EXCLUDED.topic, opportunities.topic),
              structure = COALESCE(EXCLUDED.structure, opportunities.structure),
              format = COALESCE(EXCLUDED.format, opportunities.format)
          `, [
            o.id, o.pattern_template_id, n(o.hook), n(o.topic),
            n(o.structure), n(o.format),
            o.generated_at || new Date().toISOString()
          ]);
          upserted++;
        } catch (err: any) {
          console.error(`Sync opportunity ${o.id} error:`, err.message);
          errors++;
        }
      }

      res.json({ upserted, errors, total: opportunities.length });
    } catch (err: any) {
      console.error("Sync opportunities error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/sync/thumbnails", syncBodyParser, syncAuth, async (req: Request, res: Response) => {
    try {
      const { thumbnails } = req.body;
      if (!Array.isArray(thumbnails) || thumbnails.length === 0) {
        return res.status(400).json({ error: "thumbnails array required" });
      }

      const dir = path.join(process.cwd(), "thumbnails");
      fs.mkdirSync(dir, { recursive: true });

      let saved = 0;
      const errors: string[] = [];

      for (const item of thumbnails) {
        try {
          const { videoId, imageBase64 } = item;
          if (!videoId || !imageBase64) continue;
          const buffer = Buffer.from(imageBase64, "base64");
          fs.writeFileSync(path.join(dir, `${videoId}.jpg`), buffer);
          saved++;
        } catch (e: any) {
          errors.push(`${item.videoId}: ${e.message}`);
        }
      }

      res.json({ saved, errors, total: thumbnails.length });
    } catch (err: any) {
      console.error("Sync thumbnails error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/sync/reset-videos", syncAuth, async (_req: Request, res: Response) => {
    try {
      const result = await pool.query("DELETE FROM videos");
      res.json({ deleted: result.rowCount, message: "Videos cleared, cursor reset to null" });
    } catch (err: any) {
      console.error("Sync reset error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/sync/status", syncAuth, async (_req: Request, res: Response) => {
    try {
      const result = await pool.query(`
        SELECT
          (SELECT COUNT(*) FROM videos) as video_count,
          (SELECT COUNT(*) FROM videos WHERE classification_status = 'classified') as classified_count,
          (SELECT COUNT(*) FROM patterns) as pattern_count,
          (SELECT COUNT(*) FROM video_classification) as classification_count,
          (SELECT COUNT(*) FROM video_patterns) as video_pattern_count,
          (SELECT COUNT(*) FROM opportunities) as opportunity_count,
          (SELECT MAX(collected_at) FROM videos) as last_video_collected,
          (SELECT MAX(classified_at) FROM video_classification) as last_classification_at,
          (SELECT MAX(last_updated) FROM patterns) as last_pattern_at,
          (SELECT MAX(created_at) FROM video_patterns) as last_video_pattern_at,
          (SELECT MAX(generated_at) FROM opportunities) as last_opportunity_at
      `);

      const row = result.rows[0];
      res.json({
        videos: parseInt(row.video_count) || 0,
        classified: parseInt(row.classified_count) || 0,
        patterns: parseInt(row.pattern_count) || 0,
        classifications: parseInt(row.classification_count) || 0,
        videoPatterns: parseInt(row.video_pattern_count) || 0,
        opportunities: parseInt(row.opportunity_count) || 0,
        cursors: {
          videos: row.last_video_collected,
          classifications: row.last_classification_at,
          patterns: row.last_pattern_at,
          videoPatterns: row.last_video_pattern_at,
          opportunities: row.last_opportunity_at,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error("Sync status error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  console.log("[Sync] Sync endpoints registered: /api/sync/{videos,classifications,patterns,video-patterns,opportunities,thumbnails,status}");
}
