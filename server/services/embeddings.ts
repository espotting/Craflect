import { db } from '../db';
import { videos, videoEmbeddings } from '@shared/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateEmbeddings(): Promise<number> {
  const unprocessedVideos = await db.execute(sql`
    SELECT v.id, v.caption, v.transcript, v.hook_text
    FROM videos v
    LEFT JOIN video_embeddings ve ON ve.video_id = v.id
    WHERE v.classification_status = 'completed'
      AND ve.id IS NULL
    LIMIT 600
  `);

  let processed = 0;

  for (const video of unprocessedVideos.rows) {
    try {
      const textToEmbed = [
        video.caption || '',
        video.transcript || '',
        video.hook_text || ''
      ].filter(Boolean).join(' ');

      if (!textToEmbed.trim()) continue;

      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: textToEmbed.substring(0, 8000),
        encoding_format: 'float'
      });

      await db.insert(videoEmbeddings).values({
        videoId: video.id as string,
        embedding: response.data[0].embedding,
        modelUsed: 'text-embedding-3-small'
      }).onConflictDoNothing();

      processed++;
    } catch (error) {
      console.error(`[Embeddings] Erreur vidéo ${video.id}:`, error);
    }
  }

  console.log(`[Embeddings] ${processed} embeddings générés`);
  return processed;
}
