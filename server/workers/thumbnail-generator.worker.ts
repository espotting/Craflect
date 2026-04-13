import { Worker } from 'bullmq';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { redisConnection } from '../config/redis';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

const THUMBNAILS_DIR = '/app/thumbnails';
const MAX_PER_RUN = 30;

const NICHE_STYLES: Record<string, string> = {
  finance: 'professional finance content creator, modern office, business attire, confident expression, financial charts visible on screen',
  ai_tools: 'tech content creator, dark ambient workspace, multiple monitors with code, futuristic lighting',
  online_business: 'young entrepreneur, home office setup, laptop open, casual professional, motivated expression',
  productivity: 'focused content creator, minimalist clean desk, notebook and coffee, organized environment',
  content_creation: 'content creator with ring light, camera visible, creative colorful workspace, authentic expression',
  health_wellness: 'wellness creator, bright natural light, healthy lifestyle setting, calm confident expression',
  fitness: 'fitness creator, gym environment, athletic wear, strong motivated expression',
  mindset: 'motivational creator, clean minimal background, direct eye contact, powerful presence',
  digital_marketing: 'marketing creator, modern coworking space, laptop with analytics visible, professional casual',
  real_estate: 'real estate creator, modern property background, professional attire, confident smile',
  default: 'content creator, professional modern background, engaging authentic expression, good lighting',
};

async function downloadImage(url: string, filepath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(filepath);
    protocol.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => { file.close(); resolve(true); });
    }).on('error', () => { fs.unlink(filepath, () => {}); resolve(false); });
  });
}

export const thumbnailGeneratorWorker = new Worker('thumbnail-generator', async () => {
  console.log('[ThumbnailGen] Starting run...');

  if (!process.env.REPLICATE_API_TOKEN) {
    console.log('[ThumbnailGen] No REPLICATE_API_TOKEN — skipping');
    return;
  }

  // Dynamic import to avoid crash if replicate not installed
  let Replicate: any;
  try {
    Replicate = (await import('replicate')).default;
  } catch {
    console.log('[ThumbnailGen] replicate package not installed — skipping');
    return;
  }

  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

  if (!fs.existsSync(THUMBNAILS_DIR)) fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });

  const videos = await db.execute(sql`
    SELECT id, hook_text, niche_cluster
    FROM videos
    WHERE classification_status = 'completed'
      AND hook_text IS NOT NULL
      AND (thumbnail_url IS NULL OR thumbnail_url NOT LIKE '/api/thumbnails/%')
    ORDER BY virality_score DESC NULLS LAST
    LIMIT ${MAX_PER_RUN}
  `);

  if (!videos.rows.length) { console.log('[ThumbnailGen] No videos need thumbnails'); return; }

  let generated = 0;
  for (const video of videos.rows as any[]) {
    try {
      const style = NICHE_STYLES[video.niche_cluster] || NICHE_STYLES.default;
      const hookText = (video.hook_text || '').substring(0, 60).replace(/"/g, '');
      const prompt = `Vertical 9:16 social media video thumbnail, photorealistic, ${style}, authentic TikTok/Instagram Reels style, cinematic mobile photography quality, text overlay showing: "${hookText}", high production value`;

      const output = await replicate.run('black-forest-labs/flux-schnell', {
        input: {
          prompt,
          aspect_ratio: '9:16',
          output_format: 'jpg',
          output_quality: 85,
          num_inference_steps: 4,
        }
      }) as string[];

      if (output?.[0]) {
        const filepath = path.join(THUMBNAILS_DIR, video.id + '.jpg');
        const ok = await downloadImage(output[0], filepath);
        if (ok) {
          await db.execute(sql`
            UPDATE videos SET thumbnail_url = ${'/api/thumbnails/' + video.id + '.jpg'}
            WHERE id = ${video.id}
          `);
          generated++;
          console.log('[ThumbnailGen] Generated: ' + video.id + ' (' + video.niche_cluster + ')');
        }
      }
      await new Promise(r => setTimeout(r, 2000));
    } catch (e: any) {
      console.error('[ThumbnailGen] Error for ' + video.id + ': ' + e.message);
    }
  }
  console.log('[ThumbnailGen] Done — ' + generated + ' thumbnails generated');
}, { connection: redisConnection, concurrency: 1 });

// Also add a predictions worker so the queue is handled
export const predictionsWorker = new Worker('compute-predictions', async () => {
  console.log('[Predictions] Computing view predictions...');
  try {
    await db.execute(sql`
      UPDATE patterns SET
        predicted_views_min = (avg_virality_score * 10000)::integer,
        predicted_views_max = (avg_virality_score * 50000)::integer,
        confidence_score = LEAST(95, (video_count * 3) + (avg_virality_score * 0.5))
      WHERE pattern_label IS NOT NULL AND avg_virality_score IS NOT NULL
    `);
    console.log('[Predictions] Done');
  } catch (e: any) {
    console.error('[Predictions] Error:', e.message);
  }
}, { connection: redisConnection, concurrency: 1 });
