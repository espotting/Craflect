import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';

export const ingestionQueue = new Queue('ingestion', { connection: redisConnection });
export const transcriptionQueue = new Queue('transcription', { connection: redisConnection });
export const classificationQueue = new Queue('classification', { connection: redisConnection });
export const scoringQueue = new Queue('scoring', { connection: redisConnection });
export const patternQueue = new Queue('pattern', { connection: redisConnection });
export const phaseTransitionQueue = new Queue('phase-transition', { connection: redisConnection });
export const velocityQueue = new Queue('velocity', { connection: redisConnection });

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

  console.log('✅ Schedules configurés : Ingestion (2h), Scoring (15min), Patterns (6h), Velocity (6h), Phase Transition (30min)');
}
