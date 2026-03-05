import { storage } from "../storage";
import { scrapePublicMetadata, detectPlatform, extractCreatorHandle } from "../utils/scraper";
import { VP_HOOK_TYPES as HOOK_TYPES, STRUCTURE_MODELS, ANGLE_CATEGORIES, FORMAT_TYPES } from "@shared/schema";
import { updateNichePatterns, updateNicheStatistics } from "./pattern-aggregator";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

function validateEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  if (!value || typeof value !== "string") return fallback;
  if ((allowed as readonly string[]).includes(value)) return value as T;
  const normalized = value.replace(/\s+/g, "_");
  if ((allowed as readonly string[]).includes(normalized)) return normalized as T;
  return fallback;
}

async function classifyContent(title: string, description: string, duration: number | null) {
  const context = `Title: ${title || "Unknown"}\nDescription: ${description || "No description"}\nDuration: ${duration ? duration + "s" : "Unknown"}`;

  const prompt = `You are a short-form video content analyst. Analyze this video and classify it.

${context}

Respond in JSON only with these exact fields:
{
  "hook_type": "Classify the hook into one of: [${HOOK_TYPES.join(", ")}]. Return only one.",
  "structure_model": "Classify the structure into one of: [${STRUCTURE_MODELS.join(", ")}]. Return only one.",
  "angle_category": "Choose only one of: [${ANGLE_CATEGORIES.join(", ")}]. Return only one.",
  "format_type": "Choose one of: [${FORMAT_TYPES.join(", ")}]. Return only one.",
  "cta_present": true or false,
  "pacing_score": 0.0 to 1.0,
  "authority_score": 0.0 to 1.0,
  "emotional_intensity_score": 0.0 to 1.0,
  "hook_text": "The inferred opening hook text (first 1-2 sentences)",
  "topic_cluster": "A short topic label (2-4 words)"
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error("Empty AI classification response");
  return JSON.parse(content);
}

export async function ingestVideoForNiche(url: string, nicheId: string) {
  const niche = await storage.getNicheById(nicheId);
  if (!niche) throw new Error("Niche not found");

  const platform = detectPlatform(url);
  const metadata = await scrapePublicMetadata(url);

  const creatorHandle = extractCreatorHandle(url) || metadata.creatorHandle || "unknown";

  let creator = await storage.getCreatorByUsername(platform, creatorHandle);
  if (!creator) {
    creator = await storage.createCreator({
      nicheId,
      platform,
      username: creatorHandle,
    });
  }

  const classification = await classifyContent(
    metadata.title || "",
    metadata.description || "",
    metadata.duration || null
  );

  const hookType = validateEnum(classification.hook_type, HOOK_TYPES, "Direct_Statement");
  const structureModel = validateEnum(classification.structure_model, STRUCTURE_MODELS, "Quick_Tip");
  const angleCategory = validateEnum(classification.angle_category, ANGLE_CATEGORIES, "Educational");
  const formatType = validateEnum(classification.format_type, FORMAT_TYPES, "Mixed_Format");

  const primitive = await storage.createVideoPrimitive({
    nicheId,
    creatorId: creator.id,
    platform,
    publishDate: metadata.publishedAt ? new Date(metadata.publishedAt) : null,
    durationSeconds: metadata.duration || null,
    engagementRatio: null,
    hookText: classification.hook_text || null,
    hookType,
    hookLengthSeconds: null,
    structureModel,
    formatType,
    angleCategory,
    topicCluster: classification.topic_cluster || null,
    ctaPresent: !!classification.cta_present,
    pacingScore: Math.max(0, Math.min(1, classification.pacing_score || 0)),
    authorityScore: Math.max(0, Math.min(1, classification.authority_score || 0)),
    emotionalIntensityScore: Math.max(0, Math.min(1, classification.emotional_intensity_score || 0)),
  });

  await updateNichePatterns(nicheId);
  await updateNicheStatistics(nicheId);

  return primitive;
}
