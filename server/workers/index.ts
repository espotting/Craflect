import { setupSchedules } from './scheduler';
import { ingestionWorker } from './ingestion.worker';
import { classificationWorker } from './classification.worker';
import { scoringWorker } from './scoring.worker';
import { patternWorker } from './pattern.worker';
import { checkOllamaHealth } from '../config/ollama';

async function startWorkers() {
  console.log('🚀 Démarrage Craflect v2.0 Workers...');

  const ollamaReady = await checkOllamaHealth();
  console.log(`[Ollama] ${ollamaReady ? '✅ OK' : '⚠️ HORS LIGNE (fallback OpenAI)'}`);

  await setupSchedules();

  console.log('✅ Workers actifs :');
  console.log('  • Ingestion (toutes les 2h)');
  console.log('  • Classification (continu)');
  console.log('  • Scoring (toutes les 15min)');
  console.log('  • Pattern Engine (toutes les 6h)');

  process.on('SIGTERM', async () => {
    console.log('Arrêt des workers...');
    await ingestionWorker.close();
    await classificationWorker.close();
    await scoringWorker.close();
    await patternWorker.close();
    process.exit(0);
  });
}

startWorkers().catch(console.error);
