import { storage } from "../storage";

export type IntelligenceStatus = "Building" | "Active" | "Mature";

export function computeIntelligenceStatus(totalVideos: number, confidence: number): IntelligenceStatus {
  if (totalVideos >= 500 && confidence >= 0.7) return "Mature";
  if (totalVideos >= 100 && confidence >= 0.5) return "Active";
  return "Building";
}

function getDominantPercentage(distribution: Record<string, number> | null): number {
  if (!distribution) return 0;
  const values = Object.values(distribution);
  if (values.length === 0) return 0;
  return Math.max(...values);
}

export async function computeNicheScoring(nicheId: string) {
  const patterns = await storage.getNichePatterns(nicheId);
  const totalVideos = await storage.getVideoPrimitiveCount(nicheId);

  const hookDist = (patterns?.hookDistribution as Record<string, number>) || null;
  const structDist = (patterns?.structureDistribution as Record<string, number>) || null;
  const formatDist = (patterns?.formatDistribution as Record<string, number>) || null;
  const angleDist = (patterns?.angleDistribution as Record<string, number>) || null;

  const dominantHookPct = getDominantPercentage(hookDist);
  const dominantStructPct = getDominantPercentage(structDist);
  const dominantFormatPct = getDominantPercentage(formatDist);

  const volumeScore = Math.min(totalVideos / 500, 1);

  const consistencyScore = (dominantHookPct + dominantStructPct + dominantFormatPct) / 3 / 100;

  const topValues = [dominantHookPct, dominantStructPct, dominantFormatPct].sort((a, b) => b - a);
  const mean = topValues.reduce((a, b) => a + b, 0) / topValues.length;
  const variance = topValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / topValues.length;
  const maxVariance = 10000;
  const normalizedVariance = Math.min(variance / maxVariance, 1);
  const stabilityScore = totalVideos > 0 ? 1 - normalizedVariance : 0;

  const confidenceRaw = (0.4 * volumeScore) + (0.4 * consistencyScore) + (0.2 * stabilityScore);
  const confidence = Math.round(confidenceRaw * 100) / 100;

  const signalStrengthRaw = (dominantHookPct + dominantStructPct + dominantFormatPct) / 3;
  const signalStrength = Math.round(signalStrengthRaw * 100) / 100;

  const intelligenceStatus = computeIntelligenceStatus(totalVideos, confidence);

  const dominantHook = hookDist ? Object.entries(hookDist).sort((a, b) => b[1] - a[1])[0]?.[0] || null : null;
  const dominantStructure = structDist ? Object.entries(structDist).sort((a, b) => b[1] - a[1])[0]?.[0] || null : null;
  const dominantFormat = formatDist ? Object.entries(formatDist).sort((a, b) => b[1] - a[1])[0]?.[0] || null : null;
  const dominantAngle = angleDist ? Object.entries(angleDist).sort((a, b) => b[1] - a[1])[0]?.[0] || null : null;

  function getTopN(dist: Record<string, number> | null, n: number) {
    if (!dist) return [];
    return Object.entries(dist)
      .sort((a, b) => b[1] - a[1])
      .filter(([, v]) => v > 0)
      .slice(0, n)
      .map(([name, pct]) => ({ name, pct }));
  }

  return {
    totalVideos,
    confidence,
    confidencePercent: Math.round(confidence * 100),
    signalStrength,
    signalStrengthPercent: Math.round(signalStrength),
    intelligenceStatus,
    dominantHook,
    dominantStructure,
    dominantFormat,
    dominantAngle,
    topHooks: getTopN(hookDist, 3),
    topStructures: getTopN(structDist, 3),
    topFormats: getTopN(formatDist, 3),
    topAngles: getTopN(angleDist, 3),
    avgDuration: patterns?.avgDuration || null,
    medianDuration: patterns?.medianDuration || null,
  };
}
