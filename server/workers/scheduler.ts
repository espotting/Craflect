import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';

export const ingestionQueue = new Queue('ingestion', { connection: redisConnection });
export const classificationQueue = new Queue('classification', { connection: redisConnection });
export const scoringQueue = new Queue('scoring', { connection: redisConnection });
export const patternQueue = new Queue('pattern', { connection: redisConnection });

export async function setupSchedules() {
  await ingestionQueue.add('cycle-zones', {}, {
    repeat: { cron: '0 */2 * * *' },
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

  console.log('✅ Schedules configurés : Ingestion (2h), Scoring (15min), Patterns (6h)');
}
