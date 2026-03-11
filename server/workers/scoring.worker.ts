import { Worker } from 'bullmq';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { redisConnection } from '../config/redis';

export const scoringWorker = new Worker('scoring', async () => {
  console.log('[Scoring] Calcul metrics en cours...');

  await db.execute(sql`
    UPDATE videos
    SET
      view_velocity = CASE
        WHEN EXTRACT(EPOCH FROM (NOW() - COALESCE(published_at, collected_at))) > 3600
        THEN views / (EXTRACT(EPOCH FROM (NOW() - COALESCE(published_at, collected_at))) / 3600)
        ELSE views
      END,
      engagement_rate = CASE
        WHEN views > 0
        THEN (COALESCE(likes, 0) + COALESCE(comments, 0) + COALESCE(shares, 0))::float / views
        ELSE 0
      END
    WHERE classification_status = 'completed'
      AND (view_velocity IS NULL OR engagement_rate IS NULL)
  `);

  await db.execute(sql`
    UPDATE videos
    SET
      virality_score = LEAST(100, GREATEST(0, (
        (COALESCE(view_velocity, 0) * 0.4) +
        (COALESCE(engagement_rate, 0) * 1000 * 0.25) +
        (LN(GREATEST(views, 1)) * 3 * 0.2) +
        (CASE
          WHEN collected_at > NOW() - INTERVAL '24 hours' THEN 15
          WHEN collected_at > NOW() - INTERVAL '7 days' THEN 5
          ELSE 10
        END * 0.15)
      ))),
      trend_score_processed_at = NOW()
    WHERE classification_status = 'completed'
      AND virality_score IS NULL
      AND views IS NOT NULL
  `);

  console.log('[Scoring] Batch terminé');
}, {
  connection: redisConnection,
  concurrency: 1
});
