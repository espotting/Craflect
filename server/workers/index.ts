import { setupSchedules } from './scheduler';
import { ingestionWorker } from './ingestion.worker';
import { transcriptionWorker } from './transcription.worker';
import { classificationWorker } from './classification.worker';
import { scoringWorker } from './scoring.worker';
import { patternWorker } from './pattern.worker';
import { phaseTransitionWorker } from './phase-transition.worker';
import './sync-to-replit.worker';
import './velocity.worker';
import './feedback.worker';
import { checkOllamaHealth } from '../config/ollama';
import { Worker } from 'bullmq';
import { redisConnection } from '../config/redis';
import { db } from '../db';
import { sql } from 'drizzle-orm';

const phaseTransitionBullWorker = new Worker('phase-transition', async () => {
  await phaseTransitionWorker.checkAndTransition();
}, { connection: redisConnection, concurrency: 1 });

// 30-day decay: weak patterns (video_count < 10) drift back toward neutral weight (1.0)
// Formula: new_weight = 0.95 * current_weight + 0.05 * 1.0
const patternDecayWorker = new Worker('pattern-decay', async () => {
  await db.execute(sql`
    UPDATE patterns
    SET
      pattern_weight_adjustment = GREATEST(0.5, LEAST(2.0,
        0.95 * COALESCE(pattern_weight_adjustment, 1.0) + 0.05
      )),
      last_updated = NOW()
    WHERE video_count < 10
      AND pattern_weight_adjustment IS NOT NULL
      AND pattern_weight_adjustment != 1.0
  `);
  console.log('[PatternDecay] Weak pattern weights decayed toward neutral');
}, { connection: redisConnection, concurrency: 1 });

async function startWorkers() {
  console.log('🚀 Démarrage Craflect v2.0 Workers...');

  const ollamaReady = await checkOllamaHealth();
  console.log(`[Ollama] ${ollamaReady ? '✅ OK' : '⚠️ HORS LIGNE (fallback OpenAI)'}`);

  await setupSchedules();

  console.log('✅ Workers actifs :');
  console.log('  • Ingestion (toutes les 2h)');
  console.log('  • Transcription (continu, concurrency: 2)');
  console.log('  • Classification (continu)');
  console.log('  • Scoring (toutes les 15min)');
  console.log('  • Pattern Engine (toutes les 6h)');
  console.log('  • Phase Transition (toutes les 30min)');

  process.on('SIGTERM', async () => {
    console.log('Arrêt des workers...');
    await ingestionWorker.close();
    await transcriptionWorker.close();
    await classificationWorker.close();
    await scoringWorker.close();
    await patternWorker.close();
    await phaseTransitionBullWorker.close();
    await patternDecayWorker.close();
    process.exit(0);
  });
}

startWorkers().catch(console.error);
