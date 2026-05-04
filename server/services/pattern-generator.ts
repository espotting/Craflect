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

// ─── Shared LLM call ──────────────────────────────────────────────────────────

const s = (v: any): string | null => {
  if (v === null || v === undefined) return null;
  if (Array.isArray(v)) return v.join('\n');
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};

async function callLLM(prompt: string): Promise<any> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });
  return JSON.parse(completion.choices[0].message.content || '{}');
}

// ─── Pass 1+2: cluster-based generation ──────────────────────────────────────

export async function generatePatternFromCluster(clusterId: string): Promise<boolean> {
  try {
    const clusterResult = await db.execute(sql`
      SELECT cc.*, array_length(cc.video_ids, 1) as video_count
      FROM content_clusters cc
      WHERE cc.id = ${clusterId}
    `);

    if (!clusterResult.rows.length) {
      console.warn(`[PatternGen] Cluster ${clusterId} not found`);
      return false;
    }
    const cluster = clusterResult.rows[0] as any;

    const rawIds = (Array.isArray(cluster.video_ids) ? cluster.video_ids : [])
      .map((id: string) => `'${String(id).replace(/'/g, "''")}'`)
      .join(',');
    const videoIdsSQL = rawIds.length > 0
      ? sql.raw(`ARRAY[${rawIds}]`)
      : sql.raw(`ARRAY[]::text[]`);

    const videosResult = await db.execute(sql`
      SELECT hook_text, transcript, hook_type_v2, structure_type, virality_score, duration_seconds
      FROM videos
      WHERE id = ANY(${videoIdsSQL})
        AND hook_text IS NOT NULL
        AND virality_score >= 20
      ORDER BY virality_score DESC
      LIMIT 5
    `);

    const videos = videosResult.rows as any[];
    if (videos.length === 0) {
      console.warn(`[PatternGen] Cluster ${clusterId}: no hook_text videos (niche=${cluster.dominant_niche}, video_ids.length=${cluster.video_ids?.length ?? 0})`);
      return false;
    }

    const hookExamples = videos.map(v => v.hook_text).filter(Boolean).slice(0, 3).join('\n- ');
    const transcriptExamples = videos.map(v => v.transcript?.substring(0, 200)).filter(Boolean).slice(0, 2).join('\n---\n');

    const prompt = PATTERN_PROMPT
      .replace('{niche}', cluster.dominant_niche || 'general')
      .replace('{hook_type}', cluster.dominant_hook_type || 'unknown')
      .replace('{structure}', cluster.dominant_structure || 'unknown')
      .replace('{format}', cluster.dominant_format || 'unknown')
      .replace('{avg_virality}', Math.round(cluster.avg_virality_score || 0).toString())
      .replace('{video_count}', (cluster.video_count || 0).toString())
      .replace('{hook_examples}', hookExamples || 'N/A')
      .replace('{transcript_examples}', transcriptExamples || 'N/A');

    console.log(`[PatternGen] OpenAI call — cluster ${clusterId} (${cluster.dominant_hook_type}/${cluster.dominant_niche})`);
    const patternData = await callLLM(prompt);

    console.log(`[PatternGen] OpenAI response for cluster ${clusterId}:`, {
      pattern_label: patternData.pattern_label,
      hook_template: patternData.hook_template?.substring(0, 80),
      why_it_works: patternData.why_it_works?.substring(0, 80),
    });

    const dimKey0 = String(cluster.dominant_hook_type || 'unknown').replace(/'/g, "''");
    const dimKey1 = String(cluster.dominant_structure || 'unknown').replace(/'/g, "''");
    const dimKey2 = String(cluster.dominant_niche || 'general').replace(/'/g, "''");
    const dimKeysRaw = sql.raw(`ARRAY['${dimKey0}','${dimKey1}','${dimKey2}']`);

    const existing = await db.execute(sql`
      SELECT pattern_id FROM patterns WHERE dimension_keys = ${dimKeysRaw} LIMIT 1
    `);

    if (existing.rows.length > 0) {
      console.log(`[PatternGen] Updating existing pattern (dimension_keys match) — cluster ${clusterId}`);
      await db.execute(sql`
        UPDATE patterns SET
          pattern_label      = ${s(patternData.pattern_label)},
          hook_template      = ${s(patternData.hook_template)},
          structure_template = ${s(patternData.structure_template)},
          optimal_duration   = ${parseInt(s(patternData.optimal_duration) || '60') || 60},
          why_it_works       = ${s(patternData.why_it_works)},
          best_for           = ${s(patternData.best_for)},
          content_angle      = ${s(patternData.content_angle)},
          cta_suggestion     = ${s(patternData.cta_suggestion)},
          cluster_id         = ${clusterId},
          last_updated       = NOW()
        WHERE dimension_keys = ${dimKeysRaw}
      `);
    } else {
      console.log(`[PatternGen] Inserting new pattern — cluster ${clusterId}`);
      await db.execute(sql`
        INSERT INTO patterns (
          pattern_id, dimension_keys, hook_type, structure_type, topic_cluster,
          pattern_label, hook_template, structure_template, optimal_duration,
          why_it_works, best_for, content_angle, cta_suggestion,
          video_count, avg_virality_score, pattern_score, cluster_id, trend_classification, last_updated
        ) VALUES (
          gen_random_uuid(), ${dimKeysRaw},
          ${s(cluster.dominant_hook_type)}, ${s(cluster.dominant_structure)}, ${s(cluster.dominant_niche)},
          ${s(patternData.pattern_label)}, ${s(patternData.hook_template)}, ${s(patternData.structure_template)},
          ${parseInt(s(patternData.optimal_duration) || '60') || 60},
          ${s(patternData.why_it_works)}, ${s(patternData.best_for)}, ${s(patternData.content_angle)}, ${s(patternData.cta_suggestion)},
          ${cluster.video_count || 0}, ${cluster.avg_virality_score || 0},
          ${Math.min(100, Math.round((cluster.avg_virality_score || 0) * 1.1))},
          ${clusterId}, ${s(cluster.trend_status) || 'stable'}, NOW()
        )
        ON CONFLICT DO NOTHING
      `);
    }

    await db.execute(sql`UPDATE content_clusters SET analyzed_by_llm = true WHERE id = ${clusterId}`);
    return true;
  } catch (error: any) {
    console.error(`[PatternGen] Error cluster ${clusterId}: ${error.message}`);
    if (error.message?.includes('API key')) console.error('[PatternGen] FATAL: OpenAI API key issue');
    return false;
  }
}

// ─── Pass 3: direct generation from patterns with hook_template IS NULL ───────
// Bypasses content_clusters entirely. Works even when the embedding/clustering
// pipeline (Phase 2) has never run. Uses dimension_keys to find matching videos.

async function generatePatternFromDimensions(
  patternId: string,
  hookType: string,
  structureType: string,
  topicCluster: string,
): Promise<boolean> {
  try {
    const hookTypeSafe  = hookType.replace(/'/g, "''");
    const structSafe    = structureType.replace(/'/g, "''");
    const nicheSafe     = topicCluster.replace(/'/g, "''");

    const videosResult = await db.execute(sql.raw(`
      SELECT hook_text, transcript, hook_type_v2, structure_type, virality_score, duration_seconds
      FROM videos
      WHERE classification_status = 'completed'
        AND hook_mechanism_primary = '${hookTypeSafe}'
        AND structure_type         = '${structSafe}'
        AND topic_cluster          = '${nicheSafe}'
        AND hook_text IS NOT NULL
        AND virality_score >= 20
      ORDER BY virality_score DESC
      LIMIT 5
    `));

    const videos = videosResult.rows as any[];
    if (videos.length === 0) {
      console.warn(`[PatternGen] P3 ${patternId}: no videos for (${hookType}/${structureType}/${topicCluster})`);
      return false;
    }

    const hookExamples = videos.map(v => v.hook_text).filter(Boolean).slice(0, 3).join('\n- ');
    const transcriptExamples = videos.map(v => v.transcript?.substring(0, 200)).filter(Boolean).slice(0, 2).join('\n---\n');

    const avgVirality = Math.round(
      videos.reduce((sum, v) => sum + (v.virality_score || 0), 0) / videos.length
    );

    const prompt = PATTERN_PROMPT
      .replace('{niche}', topicCluster)
      .replace('{hook_type}', hookType)
      .replace('{structure}', structureType)
      .replace('{format}', 'unknown')
      .replace('{avg_virality}', avgVirality.toString())
      .replace('{video_count}', videos.length.toString())
      .replace('{hook_examples}', hookExamples || 'N/A')
      .replace('{transcript_examples}', transcriptExamples || 'N/A');

    console.log(`[PatternGen] P3 OpenAI call — pattern ${patternId} (${hookType}/${topicCluster})`);
    const patternData = await callLLM(prompt);

    console.log(`[PatternGen] P3 response for ${patternId}:`, {
      pattern_label: patternData.pattern_label,
      hook_template: patternData.hook_template?.substring(0, 80),
    });

    await db.execute(sql`
      UPDATE patterns SET
        pattern_label      = ${s(patternData.pattern_label)},
        hook_template      = ${s(patternData.hook_template)},
        structure_template = ${s(patternData.structure_template)},
        optimal_duration   = ${parseInt(s(patternData.optimal_duration) || '60') || 60},
        why_it_works       = ${s(patternData.why_it_works)},
        best_for           = ${s(patternData.best_for)},
        content_angle      = ${s(patternData.content_angle)},
        cta_suggestion     = ${s(patternData.cta_suggestion)},
        last_updated       = NOW()
      WHERE pattern_id = ${patternId}
    `);

    return true;
  } catch (error: any) {
    console.error(`[PatternGen] P3 error pattern ${patternId}: ${error.message}`);
    return false;
  }
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function generateAllPatterns(): Promise<number> {
  console.log('[PatternGen] ══ generateAllPatterns START ══');

  if (!process.env.OPENAI_API_KEY) {
    console.error('[PatternGen] FATAL: OPENAI_API_KEY is not set — aborting');
    return 0;
  }

  // ── Debug snapshot ────────────────────────────────────────────────────────
  try {
    const snap = await db.execute(sql`
      SELECT
        (SELECT COUNT(*) FROM content_clusters)                                             AS total_clusters,
        (SELECT COUNT(*) FROM content_clusters WHERE analyzed_by_llm = true)                AS analyzed_clusters,
        (SELECT COUNT(*) FROM content_clusters
           WHERE analyzed_by_llm = false
             AND array_length(video_ids, 1) >= 3
             AND dominant_hook_type IS NOT NULL)                                            AS eligible_clusters,
        (SELECT COUNT(*) FROM video_embeddings)                                             AS total_embeddings,
        (SELECT COUNT(*) FROM patterns)                                                     AS total_patterns,
        (SELECT COUNT(*) FROM patterns WHERE hook_template IS NULL)                         AS patterns_missing_hook,
        (SELECT COUNT(*) FROM patterns WHERE hook_template IS NOT NULL)                     AS patterns_with_hook,
        (SELECT COUNT(*) FROM patterns
           WHERE hook_template IS NULL
             AND hook_type IS NOT NULL
             AND structure_type IS NOT NULL
             AND topic_cluster IS NOT NULL)                                                 AS patterns_fixable,
        (SELECT COUNT(*) FROM videos
           WHERE classification_status = 'completed'
             AND hook_text IS NOT NULL AND virality_score >= 20)                            AS videos_with_hook_text,
        (SELECT COUNT(*) FROM videos WHERE classification_status = 'completed')             AS videos_completed
    `);
    const r = snap.rows[0] as any;
    console.log(`[PatternGen] DB snapshot:`);
    console.log(`  clusters    : ${r.total_clusters} total / ${r.analyzed_clusters} analyzed / ${r.eligible_clusters} eligible`);
    console.log(`  embeddings  : ${r.total_embeddings}`);
    console.log(`  patterns    : ${r.total_patterns} total / ${r.patterns_with_hook} with hook / ${r.patterns_missing_hook} missing`);
    console.log(`  fixable P3  : ${r.patterns_fixable} patterns (have dimensions, no hook_template)`);
    console.log(`  videos      : ${r.videos_completed} completed / ${r.videos_with_hook_text} with hook_text+virality≥20`);
  } catch (snapErr: any) {
    console.warn('[PatternGen] Could not fetch DB snapshot:', snapErr.message);
  }

  let generated = 0;

  // ── Pass 1: unanalyzed clusters ───────────────────────────────────────────
  const clusters = await db.execute(sql`
    SELECT id, video_ids, dominant_hook_type, dominant_niche, dominant_structure,
           dominant_format, avg_virality_score, trend_status, confidence_score
    FROM content_clusters
    WHERE analyzed_by_llm = false
      AND array_length(video_ids, 1) >= 3
      AND dominant_hook_type IS NOT NULL
    ORDER BY avg_virality_score DESC NULLS LAST
    LIMIT 20
  `);
  console.log(`[PatternGen] Pass 1 — ${clusters.rows.length} unanalyzed clusters`);

  for (const cluster of clusters.rows as any[]) {
    console.log(`[PatternGen] P1 ${cluster.id} (${cluster.dominant_hook_type}/${cluster.dominant_niche}, virality=${cluster.avg_virality_score})`);
    const ok = await generatePatternFromCluster(cluster.id);
    if (ok) generated++;
    else console.warn(`[PatternGen] ✗ P1 failed ${cluster.id}`);
    await new Promise(r => setTimeout(r, 500));
  }

  // ── Pass 2: analyzed clusters whose pattern still lacks hook_template ─────
  const needRefresh = await db.execute(sql`
    SELECT cc.id, cc.video_ids, cc.dominant_hook_type, cc.dominant_niche, cc.dominant_structure,
           cc.dominant_format, cc.avg_virality_score, cc.trend_status, cc.confidence_score
    FROM content_clusters cc
    WHERE cc.analyzed_by_llm = true
      AND array_length(cc.video_ids, 1) >= 3
      AND cc.dominant_hook_type IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM patterns p
        WHERE p.cluster_id = cc.id::text AND p.hook_template IS NULL
      )
    LIMIT 20
  `);
  console.log(`[PatternGen] Pass 2 — ${needRefresh.rows.length} clusters needing hook_template refresh`);

  for (const cluster of needRefresh.rows as any[]) {
    console.log(`[PatternGen] P2 ${cluster.id} (${cluster.dominant_hook_type}/${cluster.dominant_niche})`);
    const ok = await generatePatternFromCluster(cluster.id);
    if (ok) generated++;
    else console.warn(`[PatternGen] ✗ P2 failed ${cluster.id}`);
    await new Promise(r => setTimeout(r, 500));
  }

  // ── Pass 3: direct from patterns missing hook_template (no cluster needed) ─
  // This path works even when content_clusters is empty (Phase 2 never ran).
  // It finds patterns created by Phase 1 (statistical) that have dimension_keys
  // but no hook_template, and generates LLM content directly from matching videos.
  const fixablePatterns = await db.execute(sql`
    SELECT pattern_id, hook_type, structure_type, topic_cluster,
           avg_virality_score, video_count
    FROM patterns
    WHERE hook_template IS NULL
      AND hook_type IS NOT NULL
      AND structure_type IS NOT NULL
      AND topic_cluster IS NOT NULL
    ORDER BY COALESCE(avg_virality_score, 0) DESC
    LIMIT 30
  `);
  console.log(`[PatternGen] Pass 3 — ${fixablePatterns.rows.length} patterns fixable via direct video query`);

  for (const pat of fixablePatterns.rows as any[]) {
    console.log(`[PatternGen] P3 pattern ${pat.pattern_id} (${pat.hook_type}/${pat.topic_cluster})`);
    const ok = await generatePatternFromDimensions(
      pat.pattern_id,
      pat.hook_type,
      pat.structure_type,
      pat.topic_cluster,
    );
    if (ok) generated++;
    else console.warn(`[PatternGen] ✗ P3 failed pattern ${pat.pattern_id}`);
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`[PatternGen] ══ Done — ${generated} patterns generated/updated ══`);
  await recalibratePatternScores();
  return generated;
}

// ─── Score recalibration ──────────────────────────────────────────────────────

async function recalibratePatternScores(): Promise<void> {
  await db.execute(sql`
    UPDATE patterns
    SET
      adjusted_score = LEAST(100, GREATEST(0,
        COALESCE(pattern_score, 0) * COALESCE(pattern_weight_adjustment, 1.0)
      )),
      signal_strength = CASE
        WHEN video_count >= 25 THEN 'strong'
        WHEN video_count >= 15 THEN 'building'
        ELSE 'emerging'
      END,
      last_updated = NOW()
    WHERE pattern_score IS NOT NULL
  `);
  console.log('[PatternGen] Pattern scores recalibrated (adjusted_score + signal_strength)');
}
