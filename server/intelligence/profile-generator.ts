import { storage } from "../storage";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function generateNicheProfile(nicheId: string) {
  const niche = await storage.getNicheById(nicheId);
  if (!niche) throw new Error("Niche not found");

  const patterns = await storage.getNichePatterns(nicheId);
  const statistics = await storage.getNicheStatistics(nicheId);

  if (!patterns || !statistics) {
    throw new Error("Insufficient data — patterns and statistics required before profile generation");
  }

  const prompt = `You are a content intelligence analyst. Based on the following niche data, generate a strategic intelligence profile.

Niche: ${niche.name}
Description: ${niche.description || "N/A"}

Statistics:
- Total videos analyzed: ${statistics.totalVideos}
- Dominant hook type: ${statistics.dominantHook}
- Dominant structure: ${statistics.dominantStructure}
- Dominant angle: ${statistics.dominantAngle}
- Dominant format: ${statistics.dominantFormat}
- Median duration: ${statistics.medianDuration}s
- Pattern stability: ${statistics.patternStabilityScore}
- Confidence: ${statistics.confidenceScore}

Pattern distributions:
- Hook distribution: ${JSON.stringify(patterns.hookDistribution)}
- Structure distribution: ${JSON.stringify(patterns.structureDistribution)}
- Angle distribution: ${JSON.stringify(patterns.angleDistribution)}
- Format distribution: ${JSON.stringify(patterns.formatDistribution)}

Respond in JSON with these fields:
{
  "intelligence_summary": "A 3-5 sentence strategic summary of what defines this niche's content patterns",
  "strategic_recommendation": "A 2-3 sentence actionable recommendation for content creators entering this niche",
  "niche_shift_signal": "One sentence about any notable pattern that might indicate a shift or opportunity"
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error("Empty AI response");

  const parsed = JSON.parse(content);

  await storage.upsertNicheProfile(nicheId, {
    intelligenceSummary: parsed.intelligence_summary || null,
    strategicRecommendation: parsed.strategic_recommendation || null,
    dominantPatterns: patterns.dominantPatterns,
    nicheShiftSignal: parsed.niche_shift_signal || null,
    confidenceScore: statistics.confidenceScore,
  });

  return await storage.getNicheProfile(nicheId);
}
