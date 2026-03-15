import { db } from '../db';
import { contentClusters, patternTemplates, videos } from '@shared/schema';
import { eq, sql, inArray, and, gt } from 'drizzle-orm';
import OpenAI from 'openai';
import { isDenseEnough } from './clustering';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const DENSITY_THRESHOLD = 50;

export async function analyzeClustersWithLLM(): Promise<number> {
  const clusters = await db.select()
    .from(contentClusters)
    .where(
      and(
        eq(contentClusters.analyzedByLlm, false),
        gt(contentClusters.densityScore, DENSITY_THRESHOLD)
      )
    )
    .limit(50);

  let analyzed = 0;

  for (const cluster of clusters) {
    try {
      if (!cluster.videoIds || cluster.videoIds.length === 0) continue;

      if (!isDenseEnough(cluster.densityScore)) {
        console.log(`[LLM Analysis] Cluster ${cluster.id} skipped (density: ${cluster.densityScore})`);
        continue;
      }

      const clusterVideos = await db.select()
        .from(videos)
        .where(inArray(videos.id, cluster.videoIds));

      if (clusterVideos.length === 0) continue;

      const prompt = `Analyse ce cluster de ${clusterVideos.length} vidéos short-form et identifie le pattern commun.

${clusterVideos.map(v => `- Caption: ${v.caption || 'N/A'}\n  Hook: ${(v.transcript || '').substring(0, 200)}...\n  Hook Type: ${v.hookMechanismPrimary || 'N/A'}\n  Structure: ${v.structureType || 'N/A'}`).join('\n\n')}

Réponds UNIQUEMENT avec ce JSON:
{
  "hook_type": "le type de hook dominant",
  "structure_type": "la structure narrative commune",
  "format_type": "le format visuel dominant",
  "template_formula": "un template réutilisable avec variables [audience], [topic], [benefit]",
  "pattern_description": "description courte du pattern en 2-3 phrases"
}`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: 'Expert Content DNA analyst. Réponse JSON uniquement.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3
      });

      const analysis = JSON.parse(response.choices[0].message.content || '{}');

      await db.insert(patternTemplates).values({
        patternId: cluster.id,
        templateName: `Pattern_${cluster.clusterLabel}`,
        templateDescription: analysis.pattern_description || null,
        hookType: analysis.hook_type || null,
        structureType: analysis.structure_type || null,
        formatType: analysis.format_type || null,
        templateFormula: analysis.template_formula || '[Hook] about [Topic]',
        confidenceScore: 0.85,
        usageCount: 0,
      });

      await db.update(contentClusters)
        .set({
          analyzedByLlm: true,
          patternDetected: analysis.pattern_description?.substring(0, 200) || null
        })
        .where(eq(contentClusters.id, cluster.id));

      analyzed++;
    } catch (error) {
      console.error(`[LLM Analysis] Erreur cluster ${cluster.id}:`, error);
    }
  }

  console.log(`[LLM Analysis] ${analyzed} clusters analysés`);
  return analyzed;
}
