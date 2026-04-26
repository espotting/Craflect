import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';
import { db } from '../db';
import { sql } from 'drizzle-orm';

export const ingestionQueue = new Queue('ingestion', { connection: redisConnection });
export const reelsIngestionQueue = new Queue('ingestion-reels', { connection: redisConnection });
export const shortsIngestionQueue = new Queue('ingestion-shorts', { connection: redisConnection });
export const patternDecayQueue = new Queue('pattern-decay', { connection: redisConnection });
export const transcriptionQueue = new Queue('transcription', { connection: redisConnection });
export const classificationQueue = new Queue('classification', { connection: redisConnection });
export const scoringQueue = new Queue('scoring', { connection: redisConnection });
export const patternQueue = new Queue('pattern', { connection: redisConnection });
export const phaseTransitionQueue = new Queue('phase-transition', { connection: redisConnection });
export const velocityQueue = new Queue('velocity', { connection: redisConnection });
export const feedbackQueue = new Queue('feedback', { connection: redisConnection });
export const thumbnailQueue = new Queue('thumbnail-generator', { connection: redisConnection });
export const predictionsQueue = new Queue('compute-predictions', { connection: redisConnection });

export async function setupSchedules() {
  await ingestionQueue.add('cycle-zones', {}, {
    repeat: { cron: '0 */6 * * *' },
    jobId: 'scheduled-ingestion'
  });

  await scoringQueue.add('batch-scoring', {}, {
    repeat: { every: 15 * 60 * 1000 },
    jobId: 'scheduled-scoring'
  });

  await patternQueue.add('detect-patterns', {}, {
    repeat: { cron: '0 */6 * * *' },
    jobId: 'scheduled-patterns'
  });

  await phaseTransitionQueue.add('check-transition', {}, {
    repeat: { every: 30 * 60 * 1000 },
    jobId: 'scheduled-phase-transition'
  });

  await velocityQueue.add('calculate', {}, {
    repeat: { cron: '0 */6 * * *' },
    removeOnComplete: 10,
    removeOnFail: 5,
  });

  await feedbackQueue.add('check', {}, {
    repeat: { cron: '0 * * * *' },
    removeOnComplete: 5,
    removeOnFail: 3,
  });

  await thumbnailQueue.add('generate', {}, {
    repeat: { cron: '0 */6 * * *' },
    removeOnComplete: 5,
    removeOnFail: 3,
  });

  // Compute view predictions every 24h
  await predictionsQueue.add('compute', {}, {
    repeat: { cron: '0 3 * * *' },
    removeOnComplete: 5,
    removeOnFail: 3,
  });

  // 30-day decay: weak patterns (video_count < 10) drift back toward neutral weight
  await patternDecayQueue.add('decay-weak-patterns', {}, {
    repeat: { cron: '0 4 * * *' },
    removeOnComplete: 5,
    removeOnFail: 3,
  });

  if (process.env.ENABLE_REELS_INGESTION === 'true') {
    await reelsIngestionQueue.add('cycle-zones', {}, {
      repeat: { cron: '0 */12 * * *' },
      jobId: 'scheduled-ingestion-reels',
    });
    console.log('  • Reels ingestion enabled (ENABLE_REELS_INGESTION=true)');
  } else {
    console.log('  • Reels ingestion DISABLED (set ENABLE_REELS_INGESTION=true to enable)');
  }

  if (process.env.ENABLE_SHORTS_INGESTION === 'true') {
    await shortsIngestionQueue.add('cycle-zones', {}, {
      repeat: { cron: '0 */12 * * *' },
      jobId: 'scheduled-ingestion-shorts',
    });
    console.log('  • Shorts ingestion enabled (ENABLE_SHORTS_INGESTION=true)');
  } else {
    console.log('  • Shorts ingestion DISABLED (set ENABLE_SHORTS_INGESTION=true to enable)');
  }

  console.log('✅ Schedules configurés : Ingestion (6h), Scoring (15min), Patterns (6h), Velocity (6h), Phase Transition (30min), Feedback (1h), Thumbnails (6h), Predictions (24h), PatternDecay (daily)');
}
