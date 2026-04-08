import { db } from '../db';
import { sql } from 'drizzle-orm';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const PATTERN_PROMPT = `Tu es un expert en contenu viral TikTok/Reels/Shorts.
Analyse ce cluster de vidéos virales et génère un pattern actionnable.

DONNÉES DU CLUSTER :
- Niche dominante : {niche}
- Hook type dominant : {hook_type}
- Structure dominante : {structure}
- Format dominant : {format}
- Score viralité moyen : {avg_virality}
- Nombre de vidéos : {video_count}
- Exemples de hooks : {hook_examples}
- Exemples de transcriptions : {transcript_examples}

Génère un JSON avec exactement ces champs :
{
  "pattern_label": "Nom court et mémorable du pattern (ex: 'The Curiosity Stack')",
  "hook_template": "Template du hook avec [VARIABLE] pour les parties à personnaliser",
  "structure_template": "Structure en 3-5 étapes claires",
  "optimal_duration": "Durée optimale en secondes",
  "why_it_works": "Explication en 1-2 phrases pourquoi ce pattern fonctionne",
  "best_for": "Type de créateur / niche / audience pour qui c'est le plus adapté",
  "content_angle": "Angle de contenu recommandé",
  "cta_suggestion": "Call-to-action suggéré"
}

RÈGLES :
- JSON uniquement, aucun texte avant ou après
- hook_template doit être réutilisable et actionnable
- why_it_works doit être précis et factuel
- Tout en anglais`;

export async function generatePatternFromCluster(clusterId: string): Promise<boolean> {
  try {
    const clusterResult = await db.execute(sql`
      SELECT 
        cc.*,
        array_length(cc.video_ids, 1) as video_count
      FROM content_clusters cc
      WHERE cc.id = ${clusterId}
    `);

    if (!clusterResult.rows.length) return false;
    const cluster = clusterResult.rows[0] as any;

    const videosResult = await db.execute(sql`
      SELECT 
        hook_text,
        transcript,
        hook_type_v2,
        structure_type,
        virality_score,
        duration_seconds
      FROM videos
      WHERE id = ANY(${cluster.video_ids}::text[])
        AND hook_text IS NOT NULL
        AND virality_score >= 50
      ORDER BY virality_score DESC
      LIMIT 5
    `);

    const videos = videosResult.rows as any[];
    if (videos.length === 0) return false;

    const hookExamples = videos
      .map(v => v.hook_text)
      .filter(Boolean)
      .slice(0, 3)
      .join('\n- ');

    const transcriptExamples = videos
      .map(v => v.transcript?.substring(0, 200))
      .filter(Boolean)
      .slice(0, 2)
      .join('\n---\n');

    const prompt = PATTERN_PROMPT
      .replace('{niche}', cluster.dominant_niche || 'general')
      .replace('{hook_type}', cluster.dominant_hook_type || 'unknown')
      .replace('{structure}', cluster.dominant_structure || 'unknown')
      .replace('{format}', cluster.dominant_format || 'unknown')
      .replace('{avg_virality}', Math.round(cluster.avg_virality_score || 0).toString())
      .replace('{video_count}', (cluster.video_count || 0).toString())
      .replace('{hook_examples}', hookExamples || 'N/A')
      .replace('{transcript_examples}', transcriptExamples || 'N/A');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const patternData = JSON.parse(completion.choices[0].message.content || '{}');

    await db.execute(sql`
      INSERT INTO patterns (
        id,
        hook_type,
        structure_type,
        topic_cluster,
        pattern_label,
        hook_template,
        structure_template,
        optimal_duration,
        why_it_works,
        best_for,
        content_angle,
        cta_suggestion,
        video_count,
        avg_virality_score,
        pattern_score,
        confidence_score,
        cluster_id,
        trend_classification,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        ${cluster.dominant_hook_type},
        ${cluster.dominant_structure},
        ${cluster.dominant_niche},
        ${patternData.pattern_label},
        ${patternData.hook_template},
        ${patternData.structure_template},
        ${parseInt(patternData.optimal_duration) || 60},
        ${patternData.why_it_works},
        ${patternData.best_for},
        ${patternData.content_angle},
        ${patternData.cta_suggestion},
        ${cluster.video_count || 0},
        ${cluster.avg_virality_score || 0},
        ${Math.min(100, Math.round((cluster.avg_virality_score || 0) * 1.1))},
        ${cluster.confidence_score || 0.5},
        ${clusterId},
        ${cluster.trend_status || 'stable'},
        NOW(),
        NOW()
      )
      ON CONFLICT DO NOTHING
    `);

    await db.execute(sql`
      UPDATE content_clusters 
      SET analyzed_by_llm = true 
      WHERE id = ${clusterId}
    `);

    return true;
  } catch (error: any) {
    console.error(`[PatternGen] Erreur cluster ${clusterId}: ${error.message}`);
    return false;
  }
}

export async function generateAllPatterns(): Promise<number> {
  console.log('[PatternGen] Génération des patterns depuis les clusters...');

  const clusters = await db.execute(sql`
    SELECT id, video_ids, dominant_hook_type, dominant_niche, avg_virality_score
    FROM content_clusters
    WHERE analyzed_by_llm = false
      AND array_length(video_ids, 1) >= 3
      AND dominant_hook_type IS NOT NULL
    ORDER BY avg_virality_score DESC NULLS LAST
    LIMIT 20
  `);

  let generated = 0;
  for (const cluster of clusters.rows as any[]) {
    const success = await generatePatternFromCluster(cluster.id);
    if (success) {
      generated++;
      console.log(`[PatternGen] Pattern généré pour cluster ${cluster.id} (${cluster.dominant_hook_type}/${cluster.dominant_niche})`);
    }
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`[PatternGen] ${generated} patterns générés`);
  return generated;
}
