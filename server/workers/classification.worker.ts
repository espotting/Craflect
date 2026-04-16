import { Worker } from 'bullmq';
import { db } from '../db';
import { videos } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { redisConnection } from '../config/redis';
import { ollama } from '../config/ollama';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Niche keyword classifier ─────────────────────────────────────────────────
// Deterministic, runs on caption + transcript + hashtags.
// Scores each niche and returns the best match (min score threshold = 1).

const NICHE_SIGNALS: Record<string, string[]> = {
  ai_tools: [
    'chatgpt', 'gpt-4', 'gpt4', 'openai', 'claude', 'gemini', 'copilot',
    'midjourney', 'stable diffusion', 'dall-e', 'sora',
    'ai tools', 'artificial intelligence', 'machine learning', 'deep learning',
    'llm', 'large language model', 'prompt engineering', 'ai agent',
    'automation', 'n8n', 'zapier', 'make.com', 'workflow automation',
    'chatbot', 'ai app', 'ai software', 'ai model', 'ai startup',
  ],
  finance: [
    'money', 'investing', 'investment', 'stocks', 'stock market', 'trading',
    'crypto', 'bitcoin', 'ethereum', 'defi', 'nft',
    'passive income', 'wealth', 'rich', 'financial freedom', 'financial independence',
    'budget', 'savings', 'debt', 'credit', 'dividends', 'portfolio',
    'real estate', 'rental property', 'mortgage', 'etf', 'index fund',
    's&p 500', 'hedge fund', 'venture capital', 'net worth', 'millionaire',
  ],
  online_business: [
    'online business', 'entrepreneur', 'entrepreneurship', 'startup',
    'side hustle', 'dropshipping', 'ecommerce', 'shopify', 'amazon fba',
    'digital product', 'saas', 'agency', 'freelance', 'clients',
    'scale', 'sales funnel', 'lead generation', 'b2b', 'b2c',
    'consulting', 'coaching business', 'digital marketing', 'facebook ads',
    'google ads', 'email list', 'marketing strategy', 'brand',
  ],
  content_creation: [
    'youtube', 'tiktok', 'instagram reels', 'content creator', 'creator',
    'viral video', 'viral content', 'trending', 'algorithm', 'grow',
    'subscribers', 'followers', 'views', 'engagement', 'video editing',
    'thumbnail', 'hook', 'script', 'personal brand', 'influencer',
    'audience', 'shorts', 'reels', 'podcast', 'newsletter',
    'brand deal', 'sponsorship', 'monetization', 'adsense',
  ],
  productivity: [
    'productivity', 'habits', 'routine', 'morning routine', 'night routine',
    'time management', 'focus', 'pomodoro', 'deep work', 'flow state',
    'notion', 'obsidian', 'second brain', 'pkm', 'note taking',
    'system', 'organization', 'goals', 'discipline', 'consistency',
    'work life balance', 'stress', 'burnout', 'remote work', 'work from home',
    'self improvement', 'personal development', 'mindset', 'motivation',
  ],
};

function classifyNiche(text: string): string | null {
  if (!text || text.trim().length === 0) return null;
  const lower = text.toLowerCase();
  const scores: Record<string, number> = {};
  for (const [niche, keywords] of Object.entries(NICHE_SIGNALS)) {
    scores[niche] = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) scores[niche]++;
    }
  }
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return best && best[1] >= 1 ? best[0] : null;
}

const DNA_PROMPT = `You are a viral content analyst for short-form videos (TikTok, Reels, Shorts).

Analyze the video and return a structured JSON.

INPUT:
Caption: {caption}
Transcript: {transcript}

RULES:
- JSON only, no explanation, no markdown
- null if uncertain or not applicable

FORMAT:
{
  "hook_text": "first strong sentence of the video",
  "hook_type": "curiosity|list|shock|question|statement",
  "structure_type": "listicle|storytelling|tutorial|reaction|before_after",
  "format_type": "facecam|broll|captions|mixed",
  "topic_cluster": "ai_tools|finance|online_business|content_creation|productivity",
  "sub_niche": "see taxonomy below",
  "content_angle": "tutorial|listicle|story|reaction|comparison|transformation|rant|interview|day_in_life|case_study",
  "audience_gender": "male|female|mixed",
  "audience_age_range": "18-24|25-34|35-44|45+",
  "is_faceless": true,
  "emotion_primary": "curiosity|urgency|fear|excitement|surprise",
  "confidence": 0.0
}

topic_cluster MUST be one of these exact values:
- ai_tools : AI, ChatGPT, automation, machine learning
- finance : money, investing, crypto, wealth, stocks
- online_business : entrepreneurship, ecommerce, marketing, agency, freelance
- content_creation : YouTube, TikTok growth, personal brand, creator
- productivity : habits, time management, focus, self-improvement

sub_niche taxonomy (pick ONE from the matching topic_cluster):
- finance → stocks_trading | crypto | real_estate | budgeting | passive_income | investing_101
- ai_tools → chatgpt_tips | automation | ai_apps | prompt_engineering | ai_business | ai_art
- online_business → dropshipping | agency_model | saas | freelancing | ecommerce | consulting
- content_creation → youtube_growth | tiktok_strategy | personal_brand | monetization | video_production
- productivity → morning_routine | time_management | deep_work | tools_systems | habits

is_faceless = true if no human face appears in the video (screen recordings, animations, text only, broll without presenter)
audience_gender = best guess based on content theme and creator tone
audience_age_range = best guess based on content references and platform norms
confidence = 0.0 to 1.0`;

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
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Expert Content DNA analyst. Return JSON only.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3
      });

      dna = JSON.parse(completion.choices[0].message.content || '{}');
      source = 'openai';
    }

    // Resolve niche: LLM result → keyword fallback → existing topicCluster → null
    const TARGET_NICHES = ['ai_tools', 'finance', 'online_business', 'content_creation', 'productivity'];
    let nicheCluster: string | null = null;

    // 1. LLM topic_cluster if it's a valid target niche
    if (dna.topic_cluster && TARGET_NICHES.includes(dna.topic_cluster)) {
      nicheCluster = dna.topic_cluster;
    }

    // 2. Keyword classifier on full text
    if (!nicheCluster) {
      const fullText = [video.caption, video.transcript, (video.hashtags || []).join(' ')].filter(Boolean).join(' ');
      nicheCluster = classifyNiche(fullText);
    }

    // 3. Remap existing topicCluster via TOPIC_TO_NICHE_CLUSTER
    if (!nicheCluster && video.topicCluster) {
      const { resolveNicheCluster } = await import('@shared/schema');
      nicheCluster = resolveNicheCluster(video.topicCluster);
    }

    // topicCluster: use LLM value if canonical, else keep existing ingestion value
    const topicCluster = (dna.topic_cluster && TARGET_NICHES.includes(dna.topic_cluster))
      ? dna.topic_cluster
      : (video.topicCluster || null);

    // Validate new dimension fields
    const VALID_CONTENT_ANGLES = ['tutorial', 'listicle', 'story', 'reaction', 'comparison', 'transformation', 'rant', 'interview', 'day_in_life', 'case_study'];
    const VALID_GENDERS = ['male', 'female', 'mixed'];
    const VALID_AGE_RANGES = ['18-24', '25-34', '35-44', '45+'];

    const contentAngle = VALID_CONTENT_ANGLES.includes(dna.content_angle) ? dna.content_angle : null;
    const audienceGender = VALID_GENDERS.includes(dna.audience_gender) ? dna.audience_gender : null;
    const audienceAgeRange = VALID_AGE_RANGES.includes(dna.audience_age_range) ? dna.audience_age_range : null;
    const isFaceless = typeof dna.is_faceless === 'boolean' ? dna.is_faceless : null;
    const subNiche = typeof dna.sub_niche === 'string' && dna.sub_niche.length > 0 ? dna.sub_niche : null;

    await db.update(videos).set({
      hookText: dna.hook_text || null,
      hookMechanismPrimary: dna.hook_type || null,
      hookTypeV2: dna.hook_type || null,
      structureType: dna.structure_type || null,
      topicCategory: dna.format_type || null,
      topicCluster,
      nicheCluster,
      emotionPrimary: dna.emotion_primary || null,
      durationBucket: calculateBucket(video.durationSeconds),
      subNiche,
      audienceGender,
      audienceAgeRange,
      isFaceless: isFaceless ?? false,
      classificationStatus: 'completed',
      classifiedAt: new Date(),
      classifiedBy: source,
      taxonomyVersion: '5.0',
      confidence: dna.confidence || 0.5
    }).where(eq(videos.id, videoId));

    console.log(`[Classified] ${videoId} via ${source} → niche: ${nicheCluster}`);

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
