import { Worker } from 'bullmq';
import { db } from '../db';
import { videos, geoZones, resolveNicheCluster } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import { redisConnection } from '../config/redis';
import { ingestionQueue, transcriptionQueue } from './scheduler';
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

const ALL_NICHES = Object.keys(NICHE_KEYWORDS);

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

  const country = zone.proxyCountryCode || 'US';

  console.log(`[scrapeVideos] Starting Apify scrape — niche: ${niche}, keywords: ${keywords.join(', ')}, lang: en, country: ${country}`);

  try {
    const run = await apify.actor('clockworks/tiktok-scraper').call({
      searchQueries: keywords,
      resultsPerPage: 50,
      maxItems: 100,
      language: 'en',
      country: 'US',
    }, {
      timeout: 300,
    });

    console.log(`[scrapeVideos] Apify run completed — runId: ${run.id}, status: ${run.status}`);

    const { items } = await apify.dataset(run.defaultDatasetId).listItems();

    console.log(`[scrapeVideos] Retrieved ${items.length} items from dataset`);

    return items.map((item: any) => ({
      platform: 'tiktok',
      platformVideoId: item.id || item.videoId || `tiktok_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      videoUrl: item.webVideoUrl || `https://www.tiktok.com/@${item.authorMeta?.name || item.author?.uniqueId || 'unknown'}/video/${item.id || item.videoId || ''}`,
      downloadUrl: item.videoUrl || item.video?.playAddr || null,
      thumbnailUrl: item.videoMeta?.coverUrl || item.coverUrl || null,
      _debug: (() => { if (!item.coverUrl) { console.log("[Debug] Item keys:", Object.keys(item).join(", ")); console.log("[Debug] videoMeta:", JSON.stringify(item.videoMeta)); console.log("[Debug] mediaUrls:", JSON.stringify(item.mediaUrls)); } return undefined; })(),
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
  if (job.name === 'cycle-zones') {
    console.log(`[Ingestion] 🔄 cycle-zones triggered — dispatching zone+niche jobs...`);

    const US_ONLY_MODE = true;

    const zones = await db.execute(sql`
      SELECT zone_code FROM geo_zones WHERE is_active = true
    `);

    const allActiveZones = zones.rows.map((r: any) => r.zone_code);
    const activeZones = US_ONLY_MODE
      ? allActiveZones.filter((z: string) => z === 'US')
      : allActiveZones;

    if (US_ONLY_MODE) {
      console.log(`[Ingestion] 🇺🇸 US-ONLY mode — ${allActiveZones.length - activeZones.length} zones paused (${allActiveZones.filter((z: string) => z !== 'US').join(', ')})`);
    }
    let dispatched = 0;

    for (const zoneCode of activeZones) {
      for (const niche of ALL_NICHES) {
        await ingestionQueue.add('scrape-zone-niche', {
          zoneCode,
          niche,
        }, {
          priority: 2,
          removeOnComplete: 100,
          removeOnFail: 50,
        });
        dispatched++;
      }
    }

    console.log(`[Ingestion] ✅ Dispatched ${dispatched} jobs (${activeZones.length} zones × ${ALL_NICHES.length} niches)`);
    return { dispatched, zones: activeZones, niches: ALL_NICHES };
  }

  const { zoneCode, niche } = job.data;

  if (!zoneCode || !niche) {
    console.warn(`[Ingestion] ⚠️ Missing zoneCode or niche in job data:`, job.data);
    return;
  }

  console.log(`[Ingestion] Processing — Zone: ${zoneCode}, Niche: ${niche}`);

  const zone = await db.query.geoZones.findFirst({
    where: eq(geoZones.zoneCode, zoneCode)
  });

  if (!zone) { console.log(`[Ingestion] Zone ${zoneCode} not found`); return; } if (!zone.isActive) {
    console.log(`[Ingestion] Zone ${zoneCode} inactive, skipping`);
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

    if (!videoData.caption || videoData.caption.trim().length === 0) {
      filtered++;
      continue;
    }

    console.log(`[Debug] views: ${videoData.views}, duration: ${videoData.durationSeconds}, caption: ${videoData.caption?.length}`); if ((videoData.views || 0) < 10000) {
      filtered++;
      continue;
    }

    if ((videoData.durationSeconds || 0) > 120) {
      filtered++;
      continue;
    }

    const ageHours = Math.max(1, (Date.now() - new Date(videoData.publishedAt).getTime()) / 3600000);
    const viewVelocity = (videoData.views || 0) / ageHours;

    const nicheCluster = resolveNicheCluster(videoData.topicCluster);

    const geoInfo = detectGeo(videoData, zone);

    const publishDate = videoData.publishedAt instanceof Date && !isNaN(videoData.publishedAt.getTime())
      ? videoData.publishedAt
      : new Date();

    try {
      const [inserted] = await db.insert(videos).values({
        platform: videoData.platform || 'tiktok',
        platformVideoId: videoData.platformVideoId,
        videoUrl: videoData.videoUrl || null,
        // downloadUrl removed — column does not exist
        thumbnailUrl: videoData.thumbnailUrl || null,
        caption: videoData.caption || '',
        hashtags: videoData.hashtags || [],
        durationSeconds: videoData.durationSeconds || 0,
        views: videoData.views || 0,
        likes: videoData.likes || 0,
        comments: videoData.comments || 0,
        shares: videoData.shares || 0,
        creatorName: videoData.creatorName || 'unknown',
        creatorPlatformId: videoData.creatorPlatformId || null,
        creatorUrl: videoData.creatorUrl || null,
        publishedAt: publishDate,
        topicCluster: videoData.topicCluster || niche,
        nicheCluster,
        viewsPerHour: viewVelocity,
        geoZone: zoneCode,
        geoCountry: zone.proxyCountryCode,
        geoLanguage: zone.languagesPriority[0],
        targetMarkets: calculateTargetMarkets(zoneCode, zone.languagesPriority[0]),
        isUsContent: geoInfo.isUs,
        countryDetected: geoInfo.country,
        classificationStatus: 'pending',
        isArchived: false
      }).returning();

      created++;

      await transcriptionQueue.add('transcribe', {
        videoId: inserted.id
      }, {
        priority: viewVelocity > 500 ? 1 : 2
      });
    } catch (insertError: any) {
      console.error(`[Ingestion] ❌ Insert failed for ${videoData.platformVideoId}: ${insertError.message}`);
      filtered++;
    }
  }

  console.log(`[Ingestion] ${zoneCode}/${niche}: ${created} créées, ${filtered} filtrées, ${duplicates} doublons, ${skippedCreatorLimit} skip créateur, ${skippedTopicLimit} skip topic`);
  return { created, filtered, duplicates, skippedCreatorLimit, skippedTopicLimit, zone: zoneCode };

}, {
  connection: redisConnection,
  concurrency: 2,
  limiter: { max: 50, duration: 60000 }
});

const US_HASHTAGS = ['fyp', 'foryou', 'foryoupage', 'viral', 'trending', 'usa', 'america', 'american'];

function detectGeo(videoData: any, zone: any): { isUs: boolean; country: string } {
  const language = zone.languagesPriority?.[0] || 'en';
  const country = zone.proxyCountryCode || 'US';

  if (country === 'US' || country === 'GB') {
    return { isUs: country === 'US', country };
  }

  if (language.toLowerCase() === 'en') {
    const hashtags = (videoData.hashtags || []).map((h: string) => h.toLowerCase());
    const hasUsIndicators = hashtags.some((h: string) => US_HASHTAGS.includes(h));
    if (hasUsIndicators) {
      return { isUs: true, country: 'US' };
    }
    return { isUs: false, country: country || 'EN' };
  }

  return { isUs: false, country };
}

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

ingestionWorker.on('failed', (job, err) => {
  console.error(`[Ingestion] ❌ Job failed: ${job?.name} — ${err.message}`);
});
