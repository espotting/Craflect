import { Worker } from 'bullmq';
import { db } from '../db';
import { videos, geoZones, resolveNicheCluster } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import { redisConnection } from '../config/redis';
import { transcriptionQueue } from './scheduler';
import { ApifyClient } from 'apify-client';

const apify = new ApifyClient({ token: process.env.APIFY_API_KEY });

const DATASET_LIMITS = {
  MAX_VIDEOS_PER_CREATOR: 3,
  MAX_VIDEOS_PER_TOPIC_CLUSTER: 120,
};

const NICHE_KEYWORDS: Record<string, string[]> = {
  'ai_tools': ['ai tools', 'chatgpt', 'midjourney', 'automation'],
  'online_business': ['online business', 'entrepreneurship', 'digital marketing'],
  'productivity': ['productivity', 'time management', 'habits'],
  'finance': ['personal finance', 'investing', 'crypto'],
  'content_creation': ['content creation', 'viral content', 'youtube growth']
};

async function getCreatorVideoCount(creatorId: string): Promise<number> {
  const result = await db.execute(sql`
    SELECT COUNT(*)::int AS cnt FROM videos WHERE creator_platform_id = ${creatorId}
  `);
  return Number(result.rows[0]?.cnt || 0);
}

async function getTopicClusterCount(topicCluster: string): Promise<number> {
  const result = await db.execute(sql`
    SELECT COUNT(*)::int AS cnt FROM videos WHERE topic_cluster = ${topicCluster}
  `);
  return Number(result.rows[0]?.cnt || 0);
}

async function scrapeVideos(zone: any, niche: string): Promise<any[]> {
  const keywords = NICHE_KEYWORDS[niche] || [];

  if (keywords.length === 0) {
    console.log(`[scrapeVideos] No keywords for niche: ${niche}`);
    return [];
  }

  const language = zone.languagesPriority?.[0] || 'en';
  const country = zone.proxyCountryCode || 'US';

  console.log(`[scrapeVideos] Starting Apify scrape — niche: ${niche}, keywords: ${keywords.join(', ')}, lang: ${language}, country: ${country}`);

  try {
    const run = await apify.actor('clockworks/tiktok-scraper').call({
      searchQueries: keywords,
      resultsPerPage: 50,
      maxItems: 200,
      language,
      country,
    }, {
      timeout: 300,
    });

    console.log(`[scrapeVideos] Apify run completed — runId: ${run.id}, status: ${run.status}`);

    const { items } = await apify.dataset(run.defaultDatasetId).listItems();

    console.log(`[scrapeVideos] Retrieved ${items.length} items from dataset`);

    return items.map((item: any) => ({
      platform: 'tiktok',
      platformVideoId: item.id || item.videoId || `tiktok_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      videoUrl: item.videoUrl || item.video?.playAddr || null,
      thumbnailUrl: item.coverUrl || item.covers?.default || null,
      caption: item.text || item.desc || '',
      hashtags: (item.hashtags || item.challenges || []).map((h: any) => typeof h === 'string' ? h : h.name || h.title || ''),
      durationSeconds: item.videoMeta?.duration || item.video?.duration || 0,
      views: item.playCount || item.stats?.playCount || 0,
      likes: item.diggCount || item.stats?.diggCount || 0,
      comments: item.commentCount || item.stats?.commentCount || 0,
      shares: item.shareCount || item.stats?.shareCount || 0,
      creatorName: item.authorMeta?.name || item.author?.uniqueId || 'unknown',
      creatorPlatformId: item.authorMeta?.id || item.author?.id || null,
      creatorUrl: item.authorMeta?.name
        ? `https://tiktok.com/@${item.authorMeta.name}`
        : item.author?.uniqueId
          ? `https://tiktok.com/@${item.author.uniqueId}`
          : null,
      publishedAt: item.createTime
        ? new Date(item.createTime * 1000)
        : new Date(),
      topicCluster: niche,
    }));
  } catch (error: any) {
    console.error(`[scrapeVideos] Apify error for niche ${niche}:`, error.message || error);
    return [];
  }
}

export const ingestionWorker = new Worker('ingestion', async (job) => {
  const { zoneCode, niche } = job.data;

  console.log(`[Ingestion] Zone: ${zoneCode}, Niche: ${niche}`);

  const zone = await db.query.geoZones.findFirst({
    where: eq(geoZones.zoneCode, zoneCode)
  });

  if (!zone?.isActive) {
    console.log(`[Ingestion] Zone ${zoneCode} inactive`);
    return;
  }

  const scrapedVideos = await scrapeVideos(zone, niche);

  let created = 0, filtered = 0, duplicates = 0, skippedCreatorLimit = 0, skippedTopicLimit = 0;

  for (const videoData of scrapedVideos) {
    const existing = await db.query.videos.findFirst({
      where: eq(videos.platformVideoId, videoData.platformVideoId)
    });
    if (existing) {
      duplicates++;
      continue;
    }

    if (videoData.creatorPlatformId) {
      const creatorCount = await getCreatorVideoCount(videoData.creatorPlatformId);
      if (creatorCount >= DATASET_LIMITS.MAX_VIDEOS_PER_CREATOR) {
        skippedCreatorLimit++;
        continue;
      }
    }

    if (videoData.topicCluster) {
      const topicCount = await getTopicClusterCount(videoData.topicCluster);
      if (topicCount >= DATASET_LIMITS.MAX_VIDEOS_PER_TOPIC_CLUSTER) {
        skippedTopicLimit++;
        continue;
      }
    }

    const ageHours = Math.max(1, (Date.now() - new Date(videoData.publishedAt).getTime()) / 3600000);
    const viewVelocity = (videoData.views || 0) / ageHours;

    if ((videoData.views || 0) < 1000 && viewVelocity < 100) {
      filtered++;
      continue;
    }

    const nicheCluster = resolveNicheCluster(videoData.topicCluster);

    const [inserted] = await db.insert(videos).values({
      ...videoData,
      nicheCluster,
      viewsPerHour: viewVelocity,
      geoZone: zoneCode,
      geoCountry: zone.proxyCountryCode,
      geoLanguage: zone.languagesPriority[0],
      targetMarkets: calculateTargetMarkets(zoneCode, zone.languagesPriority[0]),
      classificationStatus: 'pending',
      isArchived: false
    }).returning();

    created++;

    await transcriptionQueue.add('transcribe', {
      videoId: inserted.id
    }, {
      priority: viewVelocity > 500 ? 1 : 2
    });
  }

  console.log(`[Ingestion] ${zoneCode}/${niche}: ${created} créées, ${filtered} filtrées, ${duplicates} doublons, ${skippedCreatorLimit} skip créateur, ${skippedTopicLimit} skip topic`);
  return { created, filtered, duplicates, skippedCreatorLimit, skippedTopicLimit, zone: zoneCode };

}, {
  connection: redisConnection,
  concurrency: 2,
  limiter: { max: 50, duration: 60000 }
});

function calculateTargetMarkets(zoneCode: string, language: string): string[] {
  const markets: Record<string, string[]> = {
    'FR': ['FR', 'BE', 'CH', 'LU', 'CA-QC', 'DZ', 'MA', 'TN'],
    'ES': ['ES', 'MX', 'AR', 'CO', 'CL', 'PE', 'VE'],
    'DE': ['DE', 'AT', 'CH', 'LI'],
    'EN': ['US', 'UK', 'CA', 'AU', 'NZ', 'IE', 'ZA', 'NG'],
    'PT': ['BR', 'PT', 'AO', 'MZ']
  };

  const base = markets[language] || ['US'];
  const country = zoneCode.split('-')[0];
  return [country, ...base.filter(m => m !== country)];
}
