import { Worker } from 'bullmq';
import { db } from '../db';
import { videos } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { redisConnection } from '../config/redis';
import { ollama } from '../config/ollama';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const DNA_PROMPT = `Analyse cette vidéo short-form et extrais son Content DNA au format JSON strict.

CONTENU:
Titre: {caption}
Transcript: {transcript}
Hashtags: {hashtags}
Durée: {duration}s
Vues: {views}

Réponds UNIQUEMENT avec ce JSON:
{
  "hook_mechanism_primary": "contrarian|question|statistic|story|curiosity_gap|warning|mistake|list",
  "structure_type": "hook_value_cta|problem_solution|story_lesson|list_format|tutorial_step|before_after",
  "topic_cluster": "ai_tools|online_business|productivity|finance|content_creation|fitness|lifestyle|education|tech",
  "emotion_primary": "curiosity|fear|excitement|empathy|urgency|novelty|status",
  "visual_style": ["cinematic","raw","polished","lofi"],
  "cut_frequency": "low|medium|high",
  "cta_type": "follow|comment|share|link|save|subscribe|none",
  "confidence": 0.0-1.0
}`;

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
      .replace('{transcript}', video.transcript || 'N/A')
      .replace('{hashtags}', (video.hashtags || []).join(', '))
      .replace('{duration}', String(video.durationSeconds || 0))
      .replace('{views}', String(video.views || 0));

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

      if (dna.confidence < 0.7 || !dna.hook_mechanism_primary) {
        throw new Error('Low confidence local');
      }
    } catch {
      console.log(`[Fallback OpenAI] Video ${videoId}`);
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Expert Content DNA. Réponse JSON uniquement.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3
      });

      dna = JSON.parse(completion.choices[0].message.content || '{}');
      source = 'openai';
    }

    await db.update(videos).set({
      hookMechanismPrimary: dna.hook_mechanism_primary,
      structureType: dna.structure_type,
      topicCluster: dna.topic_cluster,
      emotionPrimary: dna.emotion_primary,
      visualStyle: dna.visual_style,
      cutFrequency: dna.cut_frequency,
      ctaType: dna.cta_type,
      durationBucket: calculateBucket(video.durationSeconds),
      classificationStatus: 'completed',
      classifiedAt: new Date(),
      classifiedBy: source,
      taxonomyVersion: '2.0',
      confidence: dna.confidence
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
