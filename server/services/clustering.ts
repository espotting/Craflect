import { db } from '../db';
import { videoEmbeddings, contentClusters, videos } from '@shared/schema';
import { sql, inArray } from 'drizzle-orm';

const SIMILARITY_THRESHOLD = 0.70;
const MIN_CLUSTER_SIZE = 2;

export async function clusterVideos(): Promise<number> {
  // Récupérer embeddings + métadonnées structurelles
  const rows = await db.execute(sql`
    SELECT 
      ve.video_id,
      ve.embedding,
      v.hook_type_v2,
      v.structure_type,
      v.format_type,
      v.virality_score,
      v.niche_cluster,
      v.topic_cluster,
      v.duration_bucket
    FROM video_embeddings ve
    JOIN videos v ON v.id = ve.video_id
    WHERE ve.embedding IS NOT NULL
      AND v.classification_status = 'completed'
      AND v.virality_score IS NOT NULL
  `);

  const embeddings = rows.rows as {
    video_id: string;
    embedding: number[];
    hook_type_v2: string | null;
    structure_type: string | null;
    format_type: string | null;
    virality_score: number;
    niche_cluster: string | null;
    topic_cluster: string | null;
    duration_bucket: string | null;
  }[];

  if (embeddings.length < 10) {
    console.log(`[Clustering] Pas assez de vidéos (${embeddings.length}/10 minimum)`);
    return 0;
  }

  console.log(`[Clustering] Clustering multi-dim sur ${embeddings.length} vidéos...`);

  // Supprimer les anciens clusters
  await db.execute(sql`DELETE FROM content_clusters`);

  const clusters: Map<number, string[]> = new Map();
  const assigned = new Set<string>();

  for (let i = 0; i < embeddings.length; i++) {
    if (assigned.has(embeddings[i].video_id)) continue;

    const cluster = [embeddings[i].video_id];
    assigned.add(embeddings[i].video_id);

    for (let j = i + 1; j < embeddings.length; j++) {
      if (assigned.has(embeddings[j].video_id)) continue;

      // Score multi-dimensionnel
      const score = multiDimScore(embeddings[i], embeddings[j]);

      if (score >= SIMILARITY_THRESHOLD) {
        cluster.push(embeddings[j].video_id);
        assigned.add(embeddings[j].video_id);
      }
    }

    if (cluster.length >= MIN_CLUSTER_SIZE) {
      clusters.set(i, cluster);
    }
  }

  let created = 0;
  for (const [, videoIds] of clusters) {
    const densityScore = await calculateDensityScore(videoIds);
    const clusterMeta = await getClusterMeta(videoIds);

    await db.insert(contentClusters).values({
      clusterLabel: `cluster_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      videoIds: videoIds,
      confidenceScore: clusterMeta.avgConfidence,
      densityScore,
      analyzedByLlm: false,
      // Métadonnées du cluster
      dominantHookType: clusterMeta.dominantHookType,
      dominantStructure: clusterMeta.dominantStructure,
      dominantFormat: clusterMeta.dominantFormat,
      dominantNiche: clusterMeta.dominantNiche,
      avgViralityScore: clusterMeta.avgVirality,
      trendStatus: 'stable',
      velocity7d: 0,
      velocity14d: 0,
      velocity30d: 0,
    });
    created++;
  }

  console.log(`[Clustering] ${created} clusters créés`);
  return created;
}

function multiDimScore(a: any, b: any): number {
  // Dimension 1 : similarité sémantique (embeddings) — poids 50%
  const semanticSim = cosineSimilarity(a.embedding, b.embedding);

  // Dimension 2 : similarité structurelle — poids 30%
  let structuralSim = 0;
  let structuralFactors = 0;

  if (a.hook_type_v2 && b.hook_type_v2) {
    structuralSim += a.hook_type_v2 === b.hook_type_v2 ? 1 : 0;
    structuralFactors++;
  }
  if (a.structure_type && b.structure_type) {
    structuralSim += a.structure_type === b.structure_type ? 1 : 0;
    structuralFactors++;
  }
  if (a.duration_bucket && b.duration_bucket) {
    structuralSim += a.duration_bucket === b.duration_bucket ? 0.5 : 0;
    structuralFactors++;
  }
  if (a.niche_cluster && b.niche_cluster) {
    structuralSim += a.niche_cluster === b.niche_cluster ? 1 : 0;
    structuralFactors++;
  }

  const normalizedStructural = structuralFactors > 0 ? structuralSim / structuralFactors : 0.5;

  // Dimension 3 : similarité de performance — poids 20%
  const perfSim = a.virality_score && b.virality_score
    ? 1 - Math.abs(a.virality_score - b.virality_score) / 100
    : 0.5;

  return (semanticSim * 0.50) + (normalizedStructural * 0.30) + (perfSim * 0.20);
}

async function getClusterMeta(videoIds: string[]) {
  const result = await db.execute(sql`
    SELECT
      MODE() WITHIN GROUP (ORDER BY hook_type_v2) as dominant_hook_type,
      MODE() WITHIN GROUP (ORDER BY structure_type) as dominant_structure,
      MODE() WITHIN GROUP (ORDER BY content_format) as dominant_format,
      MODE() WITHIN GROUP (ORDER BY niche_cluster) as dominant_niche,
      AVG(virality_score) as avg_virality,
      AVG(confidence) as avg_confidence
    FROM videos
    WHERE id = ANY(${videoIds}::text[])
      AND hook_type_v2 IS NOT NULL
  `);

  const top = result.rows[0] as any;
  return {
    dominantHookType: top?.dominant_hook_type || null,
    dominantStructure: top?.dominant_structure || null,
    dominantFormat: top?.dominant_format || null,
    dominantNiche: top?.dominant_niche || null,
    avgVirality: parseFloat(top?.avg_virality) || 0,
    avgConfidence: parseFloat(top?.avg_confidence) || 0.5,
  };
}

async function calculateDensityScore(videoIds: string[]): Promise<number> {
  if (videoIds.length === 0) return 0;
  const clusterVideos = await db.select({
    creatorPlatformId: videos.creatorPlatformId,
    nicheCluster: videos.nicheCluster,
  })
    .from(videos)
    .where(inArray(videos.id, videoIds));

  const uniqueCreators = new Set(clusterVideos.map(v => v.creatorPlatformId).filter(Boolean));
  const uniqueNiches = new Set(clusterVideos.map(v => v.nicheCluster).filter(Boolean));
  return videoIds.length * uniqueCreators.size * Math.max(1, uniqueNiches.size);
}

export function isDenseEnough(densityScore: number | null): boolean {
  return (densityScore ?? 0) > 50;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
