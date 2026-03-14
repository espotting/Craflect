import { db } from '../db';
import { patternEngineState, videos } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import { generateEmbeddings } from '../services/embeddings';
import { clusterVideos } from '../services/clustering';
import { analyzeClustersWithLLM } from '../services/llm-analysis';

const PHASE_THRESHOLDS = {
  PHASE_2: 500,
  PHASE_3: 2000,
};

export class PhaseTransitionWorker {
  private isRunning = false;

  async checkAndTransition(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      const state = await db.select().from(patternEngineState).limit(1);
      if (!state.length) return;
      const current = state[0];

      const stats = await db.execute(sql`
        SELECT
          COUNT(*) FILTER (WHERE is_deep_selected = true) AS deep_count,
          COUNT(*) FILTER (WHERE classification_status = 'completed') AS classified_count
        FROM videos
      `);

      const deepCount = Number(stats.rows[0]?.deep_count || 0);
      const classifiedCount = Number(stats.rows[0]?.classified_count || 0);

      await db.update(patternEngineState)
        .set({
          totalDeepVideos: deepCount,
          totalClassifiedVideos: classifiedCount,
          updatedAt: new Date()
        })
        .where(eq(patternEngineState.id, 1));

      console.log(`[PhaseTransition] Phase: ${current.currentPhase}, Deep: ${deepCount}, Classified: ${classifiedCount}`);

      if (current.currentPhase === 1 && classifiedCount >= PHASE_THRESHOLDS.PHASE_2) {
        console.log('[PhaseTransition] Transition vers Phase 2: Clustering');
        await this.activatePhase2();
        await db.update(patternEngineState)
          .set({
            currentPhase: 2,
            phase2ActivatedAt: new Date(),
            lastTransitionAt: new Date()
          })
          .where(eq(patternEngineState.id, 1));
      }

      if (current.currentPhase === 2 && classifiedCount >= PHASE_THRESHOLDS.PHASE_3) {
        console.log('[PhaseTransition] Transition vers Phase 3: LLM Synthesis');
        await this.activatePhase3();
        await db.update(patternEngineState)
          .set({
            currentPhase: 3,
            phase3ActivatedAt: new Date(),
            lastTransitionAt: new Date()
          })
          .where(eq(patternEngineState.id, 1));
      }
    } catch (error) {
      console.error('[PhaseTransition] Erreur:', error);
    } finally {
      this.isRunning = false;
    }
  }

  private async activatePhase2(): Promise<void> {
    console.log('[Phase 2] Génération des embeddings...');
    const embeddingCount = await generateEmbeddings();

    console.log('[Phase 2] Clustering...');
    const clusterCount = await clusterVideos();

    await db.update(patternEngineState)
      .set({ clusterCount })
      .where(eq(patternEngineState.id, 1));

    console.log(`[Phase 2] Activée: ${embeddingCount} embeddings, ${clusterCount} clusters`);
  }

  private async activatePhase3(): Promise<void> {
    console.log('[Phase 3] Analyse LLM des clusters...');
    const analyzed = await analyzeClustersWithLLM();
    console.log(`[Phase 3] Activée: ${analyzed} patterns générés`);
  }
}

export const phaseTransitionWorker = new PhaseTransitionWorker();
