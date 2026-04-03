import { Worker } from 'bullmq';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { redisConnection } from '../config/redis';

export const scoringWorker = new Worker('scoring', async () => {
  console.log('[Scoring] Calcul metrics en cours...');

  // Step 1 — Calcul engagement_rate et view_velocity (fix bug NULLIF)
  await db.execute(sql`
    UPDATE videos
    SET
      view_velocity = CASE
        WHEN EXTRACT(EPOCH FROM (NOW() - COALESCE(published_at, collected_at))) > 3600
        THEN views / NULLIF(EXTRACT(EPOCH FROM (NOW() - COALESCE(published_at, collected_at))) / 3600, 0)
        ELSE views
      END,
      engagement_rate = CASE
        WHEN views > 0
        THEN (COALESCE(likes, 0) + COALESCE(comments, 0) + COALESCE(shares, 0))::float / views
        ELSE 0
      END
    WHERE classification_status = 'completed'
  `);

  // Step 2 — Score composite pondéré
  // 40% views      — distribution brute (log scale)
  // 30% shares     — meilleur signal viral sur TikTok
  // 15% comments   — engagement qualitatif
  // 15% likes      — approval signal
  //
  // virality_score IS NULL retiré → recalcul à chaque batch
  await db.execute(sql`
    UPDATE videos
    SET
      virality_score = LEAST(100, GREATEST(0, (
        (LN(GREATEST(views, 1)) / LN(1000000) * 100 * 0.40) +
        (CASE WHEN views > 0 THEN COALESCE(shares, 0)::float / NULLIF(views, 0) * 100 * 30 ELSE 0 END * 0.30) +
        (CASE WHEN views > 0 THEN COALESCE(comments, 0)::float / NULLIF(views, 0) * 100 * 30 ELSE 0 END * 0.15) +
        (CASE WHEN views > 0 THEN COALESCE(likes, 0)::float / NULLIF(views, 0) * 100 * 5 ELSE 0 END * 0.15)
      ))),
      trend_score_processed_at = NOW()
    WHERE classification_status = 'completed'
      AND views IS NOT NULL
  `);

  console.log('[Scoring] Batch terminé');
}, {
  connection: redisConnection,
  concurrency: 1
});
