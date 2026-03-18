import { db } from '../db';
import { videoPerformance } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import { ApifyClient } from 'apify-client';

const apify = new ApifyClient({ token: process.env.APIFY_API_KEY });

export async function trackVideoPerformance(userId: string, videoUrl: string, predictedViews?: number) {
  const metrics = await fetchPublicMetrics(videoUrl);

  const accuracyScore = predictedViews && metrics.views
    ? Math.max(0, 1 - Math.abs(predictedViews - metrics.views) / Math.max(predictedViews, metrics.views))
    : null;

  const [entry] = await db.insert(videoPerformance).values({
    userId,
    platformVideoUrl: videoUrl,
    platform: detectPlatform(videoUrl),
    predictedViews: predictedViews || null,
    actualViews: metrics.views || null,
    actualLikes: metrics.likes || null,
    actualComments: metrics.comments || null,
    accuracyScore: accuracyScore ? Math.round(accuracyScore * 10000) / 10000 : null,
    lastFetchedAt: new Date(),
  }).returning();

  return entry;
}

export async function refreshVideoMetrics(performanceId: string) {
  const existing = await db.execute(sql`
    SELECT * FROM video_performance WHERE id = ${performanceId}
  `);

  if (!existing.rows[0]) return null;
  const row = existing.rows[0] as any;

  const metrics = await fetchPublicMetrics(row.platform_video_url);

  const accuracyScore = row.predicted_views && metrics.views
    ? Math.max(0, 1 - Math.abs(row.predicted_views - metrics.views) / Math.max(row.predicted_views, metrics.views))
    : null;

  await db.update(videoPerformance).set({
    actualViews: metrics.views || row.actual_views,
    actualLikes: metrics.likes || row.actual_likes,
    actualComments: metrics.comments || row.actual_comments,
    accuracyScore: accuracyScore ? Math.round(accuracyScore * 10000) / 10000 : null,
    lastFetchedAt: new Date(),
  }).where(eq(videoPerformance.id, performanceId));

  return { ...row, ...metrics, accuracyScore };
}

async function fetchPublicMetrics(videoUrl: string): Promise<{ views: number; likes: number; comments: number }> {
  try {
    const run = await apify.actor('clockworks/tiktok-scraper').call({
      directUrls: [videoUrl],
      maxItems: 1,
    }, {
      timeout: 120,
    });

    const { items } = await apify.dataset(run.defaultDatasetId).listItems();

    if (items.length === 0) {
      console.warn(`[Performance] No data returned for: ${videoUrl}`);
      return { views: 0, likes: 0, comments: 0 };
    }

    const item = items[0] as any;
    return {
      views: item.playCount || item.stats?.playCount || 0,
      likes: item.diggCount || item.stats?.diggCount || 0,
      comments: item.commentCount || item.stats?.commentCount || 0,
    };
  } catch (error: any) {
    console.error(`[Performance] Apify fetch error:`, error.message);
    return { views: 0, likes: 0, comments: 0 };
  }
}

function detectPlatform(url: string): string {
  if (url.includes('tiktok.com')) return 'tiktok';
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  return 'unknown';
}
