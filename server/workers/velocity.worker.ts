import { Worker } from 'bullmq';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { redisConnection } from '../config/redis';

export const velocityWorker = new Worker('velocity', async () => {
  console.log('[Velocity] Calcul vélocité patterns...');

  // Calcul vélocité 7j, 14j, 30j par pattern
  // Basé sur le nombre de vidéos ajoutées dans chaque fenêtre temporelle
  await db.execute(sql`
    WITH pattern_velocity AS (
      SELECT
        cc.id as cluster_id,
        -- Vidéos dans les 7 derniers jours
        COUNT(CASE WHEN v.collected_at >= NOW() - INTERVAL '7 days' THEN 1 END) as count_7d,
        -- Vidéos entre J-14 et J-7 (pour comparer)
        COUNT(CASE WHEN v.collected_at >= NOW() - INTERVAL '14 days'
                    AND v.collected_at < NOW() - INTERVAL '7 days' THEN 1 END) as count_prev_7d,
        -- Vidéos dans les 14 derniers jours
        COUNT(CASE WHEN v.collected_at >= NOW() - INTERVAL '14 days' THEN 1 END) as count_14d,
        -- Vidéos dans les 30 derniers jours
        COUNT(CASE WHEN v.collected_at >= NOW() - INTERVAL '30 days' THEN 1 END) as count_30d,
        -- Score moyen de viralité des vidéos récentes (7j)
        AVG(CASE WHEN v.collected_at >= NOW() - INTERVAL '7 days'
                 THEN v.virality_score END) as avg_virality_7d
      FROM content_clusters cc
      CROSS JOIN LATERAL (
        SELECT v.collected_at, v.virality_score
        FROM videos v
        WHERE v.id = ANY(cc.video_ids)
      ) v
      GROUP BY cc.id
    )
    UPDATE content_clusters cc
    SET
      -- Vélocité 7j : ratio nouvelles vidéos vs semaine précédente
      velocity_7d = pv.count_7d,
      velocity_14d = pv.count_14d,
      velocity_30d = pv.count_30d,
      -- Statut de trend basé sur la vélocité
      trend_status = CASE
        -- Emerging : forte croissance récente (2x plus que la semaine précédente)
        WHEN pv.count_7d >= 3 AND pv.count_7d >= pv.count_prev_7d * 2 THEN 'emerging'
        -- Trending : activité soutenue
        WHEN pv.count_7d >= 2 AND pv.count_7d >= pv.count_prev_7d THEN 'trending'
        -- Peak : beaucoup de vidéos mais croissance ralentit
        WHEN pv.count_30d >= 10 AND pv.count_7d < pv.count_prev_7d THEN 'peak'
        -- Declining : très peu d'activité récente
        WHEN pv.count_7d = 0 AND pv.count_30d > 0 THEN 'declining'
        -- Stable : activité normale
        ELSE 'stable'
      END,
      updated_at = NOW()
    FROM pattern_velocity pv
    WHERE cc.id = pv.cluster_id
  `);

  // Log des clusters par statut
  const stats = await db.execute(sql`
    SELECT trend_status, COUNT(*) as count
    FROM content_clusters
    GROUP BY trend_status
    ORDER BY count DESC
  `);

  stats.rows.forEach((row: any) => {
    console.log(`[Velocity] ${row.trend_status}: ${row.count} clusters`);
  });

  console.log('[Velocity] Calcul terminé');
}, {
  connection: redisConnection,
  concurrency: 1,
});
