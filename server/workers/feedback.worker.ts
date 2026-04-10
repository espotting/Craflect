import { Worker } from 'bullmq';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { redisConnection } from '../config/redis';

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
}, {
  connection: redisConnection,
  concurrency: 1,
});
