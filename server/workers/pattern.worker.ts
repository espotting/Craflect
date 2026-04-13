import { Worker } from 'bullmq';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { redisConnection } from '../config/redis';
import { generateAllPatterns } from '../services/pattern-generator';

export const patternWorker = new Worker('pattern', async () => {
  console.log('[PatternWorker] Job received, starting...');

  // ── Phase 1: Statistical pattern detection ────────────────────────────────
  // Wrapped in try/catch so a failure here never blocks LLM generation below
  try {
    const result = await db.execute(sql`
      INSERT INTO patterns (
        dimension_keys, hook_type, structure_type, topic_cluster, geo_zone,
        video_count, avg_virality_score, avg_engagement_rate, pattern_score,
        velocity_mid, trend_classification, last_updated
      )
      SELECT
        ARRAY[v.hook_mechanism_primary, v.structure_type, v.topic_cluster],
        v.hook_mechanism_primary, v.structure_type, v.topic_cluster, v.geo_zone,
        COUNT(*),
        ROUND(AVG(v.virality_score)::numeric, 2),
        ROUND(AVG(v.engagement_rate)::numeric, 4),
        LEAST(100, (COUNT(*) * 2) + (AVG(v.virality_score) * 0.3)),
        (COUNT(*) FILTER (WHERE v.collected_at > NOW() - INTERVAL '24 hours'))::float /
          GREATEST(1, COUNT(*) FILTER (WHERE v.collected_at > NOW() - INTERVAL '7 days')),
        CASE
          WHEN (COUNT(*) FILTER (WHERE v.collected_at > NOW() - INTERVAL '24 hours'))::float /
               GREATEST(1, COUNT(*) FILTER (WHERE v.collected_at > NOW() - INTERVAL '7 days')) > 0.3
          THEN 'rising' ELSE 'stable'
        END,
        NOW()
      FROM videos v
      WHERE v.classification_status = 'completed'
        AND v.is_archived = false
        AND v.hook_mechanism_primary IS NOT NULL
        AND v.structure_type IS NOT NULL
        AND v.topic_cluster IS NOT NULL
        AND (v.is_us_content = true OR v.geo_zone IN ('US', 'UK'))
        AND v.virality_score IS NOT NULL
        AND v.virality_score > 0
      GROUP BY v.hook_mechanism_primary, v.structure_type, v.topic_cluster, v.geo_zone
      HAVING COUNT(*) >= 5
        AND AVG(v.virality_score) >= 20
      ON CONFLICT DO NOTHING
    `);

    console.log(`[PatternWorker] Statistical: ${result.rows.length} patterns upserted`);
  } catch (err: any) {
    console.error('[PatternWorker] Statistical INSERT failed (non-fatal):', err.message);
  }

  // ── Phase 2: LLM pattern generation from clusters ─────────────────────────
  console.log('[PatternWorker] Starting LLM generation phase...');
  const patternsGenerated = await generateAllPatterns();
  console.log(`[PatternWorker] Done — ${patternsGenerated} LLM patterns generated`);
}, { connection: redisConnection, concurrency: 1 });

