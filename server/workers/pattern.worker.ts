import { Worker } from 'bullmq';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { redisConnection } from '../config/redis';

export const patternWorker = new Worker('pattern', async () => {
  console.log('[Pattern Engine] Détection...');

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
    GROUP BY v.hook_mechanism_primary, v.structure_type, v.topic_cluster, v.geo_zone
    HAVING COUNT(*) >= 3
    ON CONFLICT (dimension_keys) DO UPDATE SET
      video_count = EXCLUDED.video_count,
      avg_virality_score = EXCLUDED.avg_virality_score,
      pattern_score = EXCLUDED.pattern_score,
      velocity_mid = EXCLUDED.velocity_mid,
      trend_classification = EXCLUDED.trend_classification,
      last_updated = NOW()
    RETURNING pattern_id, dimension_keys, geo_zone
  `);

  for (const pattern of result.rows) {
    const dims = pattern.dimension_keys as string[];
    await db.execute(sql`
      INSERT INTO video_patterns (video_id, pattern_id, match_score)
      SELECT v.id, ${pattern.pattern_id}, 0.95
      FROM videos v
      WHERE v.hook_mechanism_primary = ${dims[0]}
        AND v.structure_type = ${dims[1]}
        AND v.topic_cluster = ${dims[2]}
        AND v.geo_zone = ${pattern.geo_zone}
        AND v.classification_status = 'completed'
        AND v.is_archived = false
      ON CONFLICT DO NOTHING
    `);
  }

  console.log(`[Pattern Engine] ${result.rows.length} patterns mis à jour`);
}, { connection: redisConnection, concurrency: 1 });
