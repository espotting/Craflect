import { Worker } from 'bullmq';
import { db } from '../db';
import { videos, geoZones, resolveNicheCluster } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import { redisConnection } from '../config/redis';
import { reelsIngestionQueue, transcriptionQueue } from './scheduler';
import { ApifyClient } from 'apify-client';

const apify = new ApifyClient({ token: process.env.APIFY_API_KEY });

const DATASET_LIMITS = {
  MAX_VIDEOS_PER_CREATOR: 3,
  MAX_VIDEOS_PER_TOPIC_CLUSTER: 500,
};

const NICHE_KEYWORDS: Record<string, string[]> = {
  'ai_tools': ['chatgpt', 'ai tools', 'midjourney', 'automation', 'openai', 'claude ai', 'gemini ai', 'n8n', 'zapier', 'ai agent', 'llm'],
  'online_business': ['online business', 'entrepreneurship', 'digital marketing', 'dropshipping', 'shopify', 'agency', 'side hustle', 'ecommerce', 'freelance'],
  'productivity': ['productivity', 'time management', 'habits', 'morning routine', 'deep work', 'notion', 'second brain', 'focus'],
  'finance': ['personal finance', 'investing', 'crypto', 'stocks', 'passive income', 'wealth', 'financial freedom', 'trading', 'bitcoin'],
  'content_creation': ['content creation', 'viral content', 'youtube growth', 'tiktok growth', 'personal brand', 'grow on instagram', 'content creator', 'subscribers'],
  'health_wellness': ['health tips', 'wellness routine', 'mental health', 'healthy lifestyle', 'self care', 'nutrition tips', 'sleep optimization', 'stress management'],
  'fitness': ['workout routine', 'gym motivation', 'weight loss', 'muscle building', 'home workout', 'fitness tips', 'training program', 'body transformation'],
  'mindset': ['mindset shift', 'motivation', 'success mindset', 'morning routine', 'discipline', 'personal growth', 'abundance mindset', 'manifestation'],
  'digital_marketing': ['digital marketing', 'social media marketing', 'personal branding', 'grow on instagram', 'grow on tiktok', 'email marketing', 'SEO tips', 'brand strategy'],
  'real_estate': ['real estate investing', 'rental property', 'house flipping', 'passive income real estate', 'mortgage tips', 'property investment', 'landlord tips', 'real estate agent'],
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
    console.log(`[scrapeVideos-reels] No keywords for niche: ${niche}`);
    return [];
  }

  console.log(`[scrapeVideos-reels] Starting Apify Instagram scrape — niche: ${niche}, hashtags: ${keywords.slice(0, 3).join(', ')}...`);

  try {
    const run = await apify.actor('apify/instagram-scraper').call({
      directUrls: [],
      resultsType: 'posts',
      resultsLimit: 50,
      addParentData: false,
      searchType: 'hashtag',
      searchLimit: 10,
      hashtags: keywords.map((k: string) => k.replace(/\s+/g, '')),
    }, { timeout: 600 });

    console.log(`[scrapeVideos-reels] Apify run completed — runId: ${run.id}, status: ${run.status}`);

    const { items } = await apify.dataset(run.defaultDatasetId).listItems();

    console.log(`[scrapeVideos-reels] Retrieved ${items.length} items from dataset`);

    return items.map((item: any) => ({
      platform: 'reels',
      platformVideoId: item.id || item.shortCode || `reels_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      videoUrl: item.url || (item.shortCode ? `https://www.instagram.com/p/${item.shortCode}/` : null),
      thumbnailUrl: item.displayUrl || item.thumbnailUrl || null,
      followersCount: item.ownerFullName ? null : item.videoViewCount || null,
      caption: item.caption || item.alt || '',
      hashtags: (item.hashtags || []).map((h: any) => typeof h === 'string' ? h : h.name || ''),
      durationSeconds: item.videoDuration || item.duration || 0,
      views: item.videoViewCount || item.likesCount || 0,
      likes: item.likesCount || 0,
      comments: item.commentsCount || 0,
      shares: 0,
      creatorName: item.ownerUsername || item.username || 'unknown',
      creatorPlatformId: item.ownerId || item.userId || null,
      creatorUrl: item.ownerUsername
        ? `https://instagram.com/${item.ownerUsername}`
        : null,
      publishedAt: item.timestamp
        ? new Date(item.timestamp * 1000)
        : item.takenAtTimestamp
          ? new Date(item.takenAtTimestamp * 1000)
          : new Date(),
      topicCluster: niche,
    }));
  } catch (error: any) {
    console.error(`[scrapeVideos-reels] Apify error for niche ${niche}:`, error.message || error);
    return [];
  }
}

export const reelsIngestionWorker = new Worker('ingestion-reels', async (job) => {
  if (job.name === 'cycle-zones') {
    console.log(`[Ingestion-Reels] 🔄 cycle-zones triggered — dispatching zone+niche jobs...`);

    const US_ONLY_MODE = true;

    const zones = await db.execute(sql`
      SELECT zone_code FROM geo_zones WHERE is_active = true
    `);

    const allActiveZones = zones.rows.map((r: any) => r.zone_code);
    const activeZones = US_ONLY_MODE
      ? allActiveZones.filter((z: string) => z === 'US')
      : allActiveZones;

    if (US_ONLY_MODE) {
      console.log(`[Ingestion-Reels] 🇺🇸 US-ONLY mode — ${allActiveZones.length - activeZones.length} zones paused`);
    }
    let dispatched = 0;

    for (const zoneCode of activeZones) {
      for (const niche of ALL_NICHES) {
        await reelsIngestionQueue.add('scrape-zone-niche', {
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

    console.log(`[Ingestion-Reels] ✅ Dispatched ${dispatched} jobs (${activeZones.length} zones × ${ALL_NICHES.length} niches)`);
    return { dispatched, zones: activeZones, niches: ALL_NICHES };
  }

  const { zoneCode, niche } = job.data;

  if (!zoneCode || !niche) {
    console.warn(`[Ingestion-Reels] ⚠️ Missing zoneCode or niche in job data:`, job.data);
    return;
  }

  console.log(`[Ingestion-Reels] Processing — Zone: ${zoneCode}, Niche: ${niche}`);

  const zone = await db.query.geoZones.findFirst({
    where: eq(geoZones.zoneCode, zoneCode)
  });

  if (!zone) { console.log(`[Ingestion-Reels] Zone ${zoneCode} not found`); return; }
  if (!zone.isActive) {
    console.log(`[Ingestion-Reels] Zone ${zoneCode} inactive, skipping`);
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

    // Reels: lower view threshold than TikTok
    if ((videoData.views || 0) < 20000) {
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
        platform: videoData.platform || 'reels',
        platformVideoId: videoData.platformVideoId,
        videoUrl: videoData.videoUrl || null,
        thumbnailUrl: videoData.thumbnailUrl || null,
        followersCount: videoData.followersCount || null,
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
      console.error(`[Ingestion-Reels] ❌ Insert failed for ${videoData.platformVideoId}: ${insertError.message}`);
      filtered++;
    }
  }

  console.log(`[Ingestion-Reels] ${zoneCode}/${niche}: ${created} créées, ${filtered} filtrées, ${duplicates} doublons, ${skippedCreatorLimit} skip créateur, ${skippedTopicLimit} skip topic`);
  return { created, filtered, duplicates, skippedCreatorLimit, skippedTopicLimit, zone: zoneCode };

}, {
  connection: redisConnection,
  concurrency: 2,
  limiter: { max: 30, duration: 60000 }
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

reelsIngestionWorker.on('failed', (job, err) => {
  console.error(`[Ingestion-Reels] ❌ Job failed: ${job?.name} — ${err.message}`);
});
