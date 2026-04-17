import { Worker } from 'bullmq';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { redisConnection } from '../config/redis';

export const scoringWorker = new Worker('scoring', async () => {
  console.log('[Scoring] Calcul metrics en cours...');

  // Step 1 — Calcul engagement_rate et view_velocity
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

  // Step 2 — Score normalisé par audience
  // Formule :
  // 40% — ratio views/followers (performance relative à l'audience)
  // 35% — engagement_rate (qualité de l'interaction)
  // 25% — shares_ratio (signal viral pur)
  //
  // Si followers_count absent → fallback sur l'ancienne formule log scale
  await db.execute(sql`
    UPDATE videos
    SET
      virality_score = LEAST(100, GREATEST(0, (
        CASE
          -- Formule normalisée si followers_count disponible
          WHEN followers_count IS NOT NULL AND followers_count > 0 THEN (
            -- 40% : ratio views/followers normalisé (cap à 10x = score 100)
            (LEAST(views::float / NULLIF(followers_count, 0) / 10, 1) * 100 * 0.40) +
            -- 35% : engagement rate (cap à 15% = score 100)
            (LEAST(engagement_rate / 0.15, 1) * 100 * 0.35) +
            -- 25% : shares ratio (cap à 5% = score 100)
            (LEAST(COALESCE(shares, 0)::float / NULLIF(views, 0) / 0.05, 1) * 100 * 0.25)
          )
          -- Fallback log scale si pas de followers_count
          ELSE (
            (LN(GREATEST(views, 1)) / LN(1000000) * 100 * 0.40) +
            (CASE WHEN views > 0 THEN COALESCE(shares, 0)::float / NULLIF(views, 0) * 100 * 30 ELSE 0 END * 0.30) +
            (CASE WHEN views > 0 THEN COALESCE(comments, 0)::float / NULLIF(views, 0) * 100 * 30 ELSE 0 END * 0.15) +
            (CASE WHEN views > 0 THEN COALESCE(likes, 0)::float / NULLIF(views, 0) * 100 * 5 ELSE 0 END * 0.15)
          )
        END
      ))),
      trend_score_processed_at = NOW()
    WHERE classification_status = 'completed'
      AND views IS NOT NULL
      AND views >= 50000
  `);

  // Step 3 — Decay temporel : les vidéos récentes pèsent plus
  // Seuils : >7j=0.85, >14j=0.70, >30j=0.50, >60j=0.25
  await db.execute(sql`
    UPDATE videos
    SET decay_weight = CASE
      WHEN EXTRACT(EPOCH FROM (NOW() - COALESCE(collected_at, NOW()))) / 86400 > 60 THEN 0.25
      WHEN EXTRACT(EPOCH FROM (NOW() - COALESCE(collected_at, NOW()))) / 86400 > 30 THEN 0.50
      WHEN EXTRACT(EPOCH FROM (NOW() - COALESCE(collected_at, NOW()))) / 86400 > 14 THEN 0.70
      WHEN EXTRACT(EPOCH FROM (NOW() - COALESCE(collected_at, NOW()))) / 86400 > 7  THEN 0.85
      ELSE 1.0
    END
    WHERE classification_status = 'completed'
  `);

  console.log('[Scoring] Batch terminé (avec decay)');
}, {
  connection: redisConnection,
  concurrency: 1,
});
