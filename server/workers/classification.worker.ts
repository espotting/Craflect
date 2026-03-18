import { Worker } from 'bullmq';
import { db } from '../db';
import { videos } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { redisConnection } from '../config/redis';
import { ollama } from '../config/ollama';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const DNA_PROMPT = `Tu es un analyste de contenu viral spécialisé dans les vidéos courtes (TikTok, Reels, Shorts).

Analyse la vidéo et retourne un JSON structuré.

INPUT :

* Caption : {caption}
* Transcript : {transcript}

RÈGLES :

* JSON uniquement
* aucune explication
* ne rien inventer
* null si incertain

FORMAT :

{
  "hook_text": "...",
  "hook_type": "...",
  "structure_type": "...",
  "format_type": "...",
  "topic_level_1": "...",
  "topic_level_2": "...",
  "emotion_primary": "...",
  "confidence": 0.0
}

VALEURS :

hook_type :
curiosity, list, shock, question, statement

structure_type :
listicle, storytelling, tutorial, reaction, before_after

format_type :
facecam, broll, captions, mixed

topic_level_1 :
business, ai, money, productivity, marketing, lifestyle

emotion_primary :
curiosity, urgency, fear, excitement, surprise

IMPORTANT :
hook_text = première phrase forte
confidence = score de confiance entre 0.0 et 1.0`;

export const classificationWorker = new Worker('classification', async (job) => {
  const { videoId } = job.data;

  const video = await db.query.videos.findFirst({
    where: eq(videos.id, videoId)
  });

  if (!video || video.classificationStatus !== 'pending') return;

  await db.update(videos).set({
    classificationStatus: 'processing',
    classificationStartedAt: new Date()
  }).where(eq(videos.id, videoId));

  try {
    const prompt = DNA_PROMPT
      .replace('{caption}', video.caption || 'N/A')
      .replace('{transcript}', video.transcript || 'N/A');

    let dna: any;
    let source = 'ollama';

    try {
      const response = await ollama.generate({
        model: 'llama3.1:8b',
        prompt,
        format: 'json',
        options: { temperature: 0.3, num_predict: 500 }
      });

      dna = JSON.parse(response.response);

      if (dna.confidence < 0.7 || !dna.hook_type) {
        throw new Error('Low confidence local');
      }
    } catch {
      console.log(`[Fallback OpenAI] Video ${videoId}`);
      const completion = await openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: 'Expert Content DNA analyst. Réponse JSON uniquement.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3
      });

      dna = JSON.parse(completion.choices[0].message.content || '{}');
      source = 'openai';
    }

    await db.update(videos).set({
      hookText: dna.hook_text || null,
      hookMechanismPrimary: dna.hook_type || null,
      structureType: dna.structure_type || null,
      topicCategory: dna.topic_level_1 || null,
      topicCluster: dna.topic_level_2 || null,
      emotionPrimary: dna.emotion_primary || null,
      durationBucket: calculateBucket(video.durationSeconds),
      classificationStatus: 'completed',
      classifiedAt: new Date(),
      classifiedBy: source,
      taxonomyVersion: '3.0',
      confidence: dna.confidence || 0.5
    }).where(eq(videos.id, videoId));

    console.log(`[Classified] ${videoId} via ${source}`);

  } catch (error: any) {
    const attempts = (video.classificationAttempts || 0) + 1;
    await db.update(videos).set({
      classificationStatus: attempts >= 3 ? 'failed' : 'pending',
      classificationAttempts: attempts,
      patternNotes: `Error: ${error.message}`
    }).where(eq(videos.id, videoId));

    if (attempts >= 3) throw error;
  }
}, {
  connection: redisConnection,
  concurrency: 3,
  limiter: { max: 60, duration: 60000 }
});

function calculateBucket(seconds: number | null): string {
  if (!seconds) return '30-60s';
  if (seconds <= 15) return '0-15s';
  if (seconds <= 30) return '15-30s';
  if (seconds <= 60) return '30-60s';
  if (seconds <= 90) return '60-90s';
  if (seconds <= 180) return '90-180s';
  return '180s+';
}
