import { db } from '../db';
import { videoEmbeddings, contentClusters } from '@shared/schema';
import { sql } from 'drizzle-orm';

export async function clusterVideos(): Promise<number> {
  const rows = await db.execute(sql`
    SELECT video_id, embedding FROM video_embeddings
    WHERE embedding IS NOT NULL
  `);

  const embeddings = rows.rows as { video_id: string; embedding: number[] }[];

  if (embeddings.length < 10) {
    console.log(`[Clustering] Pas assez de vidéos (${embeddings.length}/10 minimum)`);
    return 0;
  }

  const clusters: Map<number, string[]> = new Map();
  const assigned = new Set<string>();

  for (let i = 0; i < embeddings.length; i++) {
    if (assigned.has(embeddings[i].video_id)) continue;

    const cluster = [embeddings[i].video_id];
    assigned.add(embeddings[i].video_id);

    for (let j = i + 1; j < embeddings.length; j++) {
      if (assigned.has(embeddings[j].video_id)) continue;

      const similarity = cosineSimilarity(
        embeddings[i].embedding,
        embeddings[j].embedding
      );

      if (similarity > 0.85) {
        cluster.push(embeddings[j].video_id);
        assigned.add(embeddings[j].video_id);
      }
    }

    if (cluster.length >= 3) {
      clusters.set(i, cluster);
    }
  }

  for (const [idx, videoIds] of clusters) {
    await db.insert(contentClusters).values({
      clusterLabel: `cluster_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      videoIds: videoIds,
      confidenceScore: 0.85,
      analyzedByLlm: false
    });
  }

  console.log(`[Clustering] ${clusters.size} clusters créés`);
  return clusters.size;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dotProduct / denom;
}
