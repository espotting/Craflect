import { storage } from "../storage";
import {
  HOOK_MECHANISMS, HOOK_FORMATS, EMOTIONAL_TRIGGERS, CONTENT_STRUCTURES,
  CONTENT_FORMATS, VISUAL_STYLES, STORYTELLING_PRESENCES, CONTENT_PACES,
  CREATOR_ARCHETYPES, TOPIC_CATEGORIES, CTA_TYPES, CONTROVERSY_LEVELS,
  INFORMATION_DENSITIES, DURATION_BUCKETS, HOOK_TOPICS, CONTENT_GOALS,
  type InsertVideo,
} from "@shared/schema";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

function validateEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  if (!value || typeof value !== "string") return fallback;
  const lower = value.toLowerCase().replace(/[\s-]+/g, "_");
  for (const item of allowed) {
    if (item === value || item === lower || item.toLowerCase() === lower) return item as T;
  }
  return fallback;
}

function validateEnumArray<T extends string>(values: unknown, allowed: readonly T[], fallback: T): T[] {
  if (!Array.isArray(values)) {
    if (typeof values === "string") return [validateEnum(values, allowed, fallback)];
    return [fallback];
  }
  return values.map(v => validateEnum(v, allowed, fallback));
}

function getDurationBucket(seconds: number | null): typeof DURATION_BUCKETS[number] {
  if (!seconds) return "30-60s";
  if (seconds <= 15) return "0-15s";
  if (seconds <= 30) return "15-30s";
  if (seconds <= 60) return "30-60s";
  if (seconds <= 90) return "60-90s";
  if (seconds <= 180) return "90-180s";
  return "180s+";
}

const CLASSIFICATION_PROMPT = `You are a short-form video content analyst using the Craflect taxonomy.
Analyze the provided video data and classify it across ALL dimensions.

IMPORTANT:
- Use ONLY the provided data. Do NOT invent information.
- Return ONLY a valid JSON object.
- For array fields, return arrays. For single fields, return a single string.
- Use only values from the allowed lists provided.

Respond with this exact JSON structure:
{
  "hook_mechanism": ["array of 1-3 values from: ${HOOK_MECHANISMS.join(", ")}"],
  "hook_format": "one of: ${HOOK_FORMATS.join(", ")}",
  "hook_text": "the inferred opening hook (first 1-2 sentences, or null if unclear)",
  "hook_topic": "one of: ${HOOK_TOPICS.join(", ")}",
  "emotional_trigger": ["array of 1-3 values from: ${EMOTIONAL_TRIGGERS.join(", ")}"],
  "content_structure": ["array of 1-2 values from: ${CONTENT_STRUCTURES.join(", ")}"],
  "content_format": "one of: ${CONTENT_FORMATS.join(", ")}",
  "content_goal": "one of: ${CONTENT_GOALS.join(", ")}",
  "visual_style": ["array of 1-2 values from: ${VISUAL_STYLES.join(", ")}"],
  "storytelling_presence": "one of: ${STORYTELLING_PRESENCES.join(", ")}",
  "content_pace": "one of: ${CONTENT_PACES.join(", ")}",
  "creator_archetype": "one of: ${CREATOR_ARCHETYPES.join(", ")}",
  "topic_category": "one of: ${TOPIC_CATEGORIES.join(", ")}",
  "call_to_action": "one of: ${CTA_TYPES.join(", ")}",
  "controversy_level": "one of: ${CONTROVERSY_LEVELS.join(", ")}",
  "information_density": "one of: ${INFORMATION_DENSITIES.join(", ")}",
  "pattern_notes": "brief analysis note (1-2 sentences max, or null)"
}`;

export interface VideoInput {
  platform?: string;
  videoUrl?: string;
  caption?: string;
  transcript?: string;
  hashtags?: string[];
  durationSeconds?: number;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  creatorName?: string;
  creatorNiche?: string;
}

export async function classifyVideoV1(input: VideoInput): Promise<Record<string, unknown>> {
  const context = [
    input.platform && `Platform: ${input.platform}`,
    input.caption && `Caption: ${input.caption}`,
    input.transcript && `Transcript: ${input.transcript}`,
    input.hashtags?.length && `Hashtags: ${input.hashtags.join(", ")}`,
    input.durationSeconds && `Duration: ${input.durationSeconds}s`,
    input.views !== undefined && `Views: ${input.views}`,
    input.likes !== undefined && `Likes: ${input.likes}`,
    input.comments !== undefined && `Comments: ${input.comments}`,
    input.shares !== undefined && `Shares: ${input.shares}`,
    input.creatorName && `Creator: ${input.creatorName}`,
    input.creatorNiche && `Niche: ${input.creatorNiche}`,
  ].filter(Boolean).join("\n");

  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      { role: "system", content: CLASSIFICATION_PROMPT },
      { role: "user", content: context || "No data provided" },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error("Empty AI classification response");
  return JSON.parse(content);
}

export function normalizeClassification(raw: Record<string, unknown>, input: VideoInput): InsertVideo {
  return {
    platform: input.platform || null,
    videoUrl: input.videoUrl || null,
    caption: input.caption || null,
    transcript: input.transcript || null,
    hashtags: input.hashtags || null,
    durationSeconds: input.durationSeconds || null,
    durationBucket: getDurationBucket(input.durationSeconds || null),
    views: input.views ?? null,
    likes: input.likes ?? null,
    comments: input.comments ?? null,
    shares: input.shares ?? null,
    creatorName: input.creatorName || null,
    creatorNiche: input.creatorNiche || null,
    hookMechanism: validateEnumArray(raw.hook_mechanism, HOOK_MECHANISMS, "direct_statement"),
    hookFormat: validateEnum(raw.hook_format, HOOK_FORMATS, "bold_statement"),
    hookText: typeof raw.hook_text === "string" ? raw.hook_text : null,
    hookTopic: validateEnum(raw.hook_topic, HOOK_TOPICS, "strategy"),
    emotionalTrigger: validateEnumArray(raw.emotional_trigger, EMOTIONAL_TRIGGERS, "curiosity"),
    contentStructure: validateEnumArray(raw.content_structure, CONTENT_STRUCTURES, "hook_value_cta"),
    contentFormat: validateEnum(raw.content_format, CONTENT_FORMATS, "talking_head"),
    contentGoal: validateEnum(raw.content_goal, CONTENT_GOALS, "education"),
    visualStyle: validateEnumArray(raw.visual_style, VISUAL_STYLES, "raw_authentic"),
    storytellingPresence: validateEnum(raw.storytelling_presence, STORYTELLING_PRESENCES, "moderate"),
    contentPace: validateEnum(raw.content_pace, CONTENT_PACES, "moderate"),
    creatorArchetype: validateEnum(raw.creator_archetype, CREATOR_ARCHETYPES, "educator"),
    topicCategory: validateEnum(raw.topic_category, TOPIC_CATEGORIES, "education"),
    callToAction: validateEnum(raw.call_to_action, CTA_TYPES, "none"),
    controversyLevel: validateEnum(raw.controversy_level, CONTROVERSY_LEVELS, "none"),
    informationDensity: validateEnum(raw.information_density, INFORMATION_DENSITIES, "moderate"),
    patternNotes: typeof raw.pattern_notes === "string" ? raw.pattern_notes : null,
    classifiedAt: new Date(),
    classifiedBy: "gpt-4.1-mini",
  };
}

export async function classifyAndStoreVideo(input: VideoInput) {
  const raw = await classifyVideoV1(input);
  const normalized = normalizeClassification(raw, input);
  const video = await storage.createVideo(normalized);
  return { video, rawClassification: raw };
}
