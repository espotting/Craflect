import { Worker } from 'bullmq';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { redisConnection } from '../config/redis';

// Feedback Loop C5→C3: reinject video performance accuracy back into pattern weights.
// EMA formula: new_weight = 0.70 * old_weight + 0.30 * performance_ratio
// performance_ratio = actual_views / (virality_score * 10000), capped [0.1, 2.0]
async function reinjectFeedback(): Promise<void> {
  await db.execute(sql`
    UPDATE patterns p
    SET
      pattern_weight_adjustment = GREATEST(0.1, LEAST(2.0,
        0.70 * COALESCE(p.pattern_weight_adjustment, 1.0) +
        0.30 * (
          SELECT AVG(
            CASE
              WHEN v.views > 0 AND v.virality_score > 0
              THEN LEAST(2.0, GREATEST(0.1, v.views::float / NULLIF(v.virality_score * 10000, 0)))
              ELSE 1.0
            END
          )
          FROM video_patterns vp
          JOIN videos v ON v.id = vp.video_id
          WHERE vp.pattern_id = p.pattern_id
            AND v.collected_at >= NOW() - INTERVAL '30 days'
            AND v.views IS NOT NULL
            AND v.views > 0
        )
      )),
      last_updated = NOW()
    WHERE video_count > 0
      AND EXISTS (
        SELECT 1 FROM video_patterns vp
        JOIN videos v ON v.id = vp.video_id
        WHERE vp.pattern_id = p.pattern_id
          AND v.collected_at >= NOW() - INTERVAL '30 days'
          AND v.views > 0
      )
  `);

  console.log('[Feedback] Pattern weights reinjected via EMA');
}

export const feedbackWorker = new Worker('feedback', async () => {
  console.log('[Feedback] Checking predictions vs reality...');

  const toCheck = await db.execute(sql`
    SELECT id, user_id, predicted_views, actual_views
    FROM video_performance
    WHERE actual_views IS NOT NULL
      AND predicted_views IS NOT NULL
      AND accuracy_score IS NULL
      AND created_at >= NOW() - INTERVAL '30 days'
    LIMIT 50
  `);

  for (const row of toCheck.rows as any[]) {
    const accuracy = 1 - Math.abs(row.predicted_views - row.actual_views) /
                     Math.max(row.predicted_views, row.actual_views, 1);

    await db.execute(sql`
      UPDATE video_performance
      SET accuracy_score = ${Math.max(0, Math.min(1, accuracy))}
      WHERE id = ${row.id}
    `);

    await db.execute(sql`
      UPDATE user_content_dna
      SET avg_prediction_accuracy = (
        SELECT AVG(accuracy_score) FROM video_performance
        WHERE user_id = ${row.user_id} AND accuracy_score IS NOT NULL
      ),
      total_tracked_videos = (
        SELECT COUNT(*) FROM video_performance WHERE user_id = ${row.user_id}
      ),
      updated_at = NOW()
      WHERE user_id = ${row.user_id}
    `);
  }

  console.log(`[Feedback] Processed ${toCheck.rows.length} predictions`);

  // Reinject pattern quality feedback via EMA
  await reinjectFeedback();
}, {
  connection: redisConnection,
  concurrency: 1,
});
