import { Worker } from 'bullmq';
import { db } from '../db';
import { videos, geoZones } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { redisConnection } from '../config/redis';
import { classificationQueue } from './scheduler';

const NICHE_KEYWORDS: Record<string, string[]> = {
  'ai_tools': ['ai tools', 'chatgpt', 'midjourney', 'automation'],
  'online_business': ['online business', 'entrepreneurship', 'digital marketing'],
  'productivity': ['productivity', 'time management', 'habits'],
  'finance': ['personal finance', 'investing', 'crypto'],
  'content_creation': ['content creation', 'viral content', 'youtube growth']
};

export const ingestionWorker = new Worker('ingestion', async (job) => {
  const { zoneCode, niche } = job.data;

  console.log(`[Ingestion] Zone: ${zoneCode}, Niche: ${niche}`);

  const zone = await db.query.geoZones.findFirst({
    where: eq(geoZones.zoneCode, zoneCode)
  });

  if (!zone?.isActive) return;

  const scrapedVideos = await scrapeVideosStub(zone, niche);

  let created = 0, filtered = 0, duplicates = 0;

  for (const videoData of scrapedVideos) {
    const existing = await db.query.videos.findFirst({
      where: eq(videos.platformVideoId, videoData.platformVideoId)
    });
    if (existing) { duplicates++; continue; }

    const ageHours = Math.max(1, (Date.now() - new Date(videoData.publishedAt).getTime()) / 3600000);
    const viewVelocity = (videoData.views || 0) / ageHours;

    if ((videoData.views || 0) < 1000 && viewVelocity < 100) {
      filtered++;
      continue;
    }

    const [inserted] = await db.insert(videos).values({
      ...videoData,
      geoZone: zoneCode,
      geoCountry: zone.proxyCountryCode,
      geoLanguage: zone.languagesPriority[0],
      targetMarkets: calculateTargetMarkets(zoneCode, zone.languagesPriority[0]),
      classificationStatus: 'pending',
      isArchived: false
    }).returning();

    created++;

    await classificationQueue.add('classify', {
      videoId: inserted.id
    }, { priority: viewVelocity > 500 ? 1 : 2 });
  }

  console.log(`[Ingestion] ${zoneCode}: ${created} créées, ${filtered} filtrées, ${duplicates} doublons`);
  return { created, filtered, duplicates };

}, { connection: redisConnection, concurrency: 2 });

function calculateTargetMarkets(zoneCode: string, language: string): string[] {
  const markets: Record<string, string[]> = {
    'FR': ['FR', 'BE', 'CH', 'LU', 'CA-QC', 'DZ', 'MA', 'TN'],
    'ES': ['ES', 'MX', 'AR', 'CO', 'CL', 'PE'],
    'DE': ['DE', 'AT', 'CH', 'LI'],
    'EN': ['US', 'UK', 'CA', 'AU', 'NZ', 'IE', 'ZA', 'NG'],
    'PT': ['BR', 'PT', 'AO', 'MZ']
  };
  const base = markets[language] || ['US'];
  const country = zoneCode.split('-')[0];
  return [country, ...base.filter(m => m !== country)];
}

async function scrapeVideosStub(_zone: any, _niche: string) {
  return [];
}
