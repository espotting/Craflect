import { storage } from "../storage";
import { VP_HOOK_TYPES as HOOK_TYPES, STRUCTURE_MODELS, ANGLE_CATEGORIES, FORMAT_TYPES } from "@shared/schema";
import { computeIntelligenceStatus } from "./scoring";

function calcDistribution(values: string[], taxonomy: readonly string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const t of taxonomy) counts[t] = 0;
  let validCount = 0;
  for (const v of values) {
    if (v && counts[v] !== undefined) {
      counts[v]++;
      validCount++;
    }
  }
  const total = validCount || 1;
  const dist: Record<string, number> = {};
  for (const t of taxonomy) {
    dist[t] = Math.round((counts[t] / total) * 10000) / 100;
  }
  return dist;
}

function getDominantPercentage(dist: Record<string, number>): number {
  const values = Object.values(dist);
  if (values.length === 0) return 0;
  return Math.max(...values);
}

function getTopN(dist: Record<string, number>, n: number) {
  return Object.entries(dist)
    .sort((a, b) => b[1] - a[1])
    .filter(([, v]) => v > 0)
    .slice(0, n)
    .map(([name, pct]) => ({ name, pct }));
}

export async function computeWorkspaceIntelligence(workspaceId: string) {
  const primitives = await storage.getVideoPrimitivesByWorkspace(workspaceId);
  const totalVideos = primitives.length;

  if (totalVideos === 0) {
    return {
      totalVideos: 0,
      confidence: 0,
      confidencePercent: 0,
      signalStrength: 0,
      signalStrengthPercent: 0,
      intelligenceStatus: "Building" as const,
      topHooks: [],
      topFormats: [],
      topAngles: [],
      dominantHook: null,
      dominantStructure: null,
      dominantFormat: null,
      dominantAngle: null,
      hookDistribution: {},
      structureDistribution: {},
      formatDistribution: {},
      angleDistribution: {},
    };
  }

  const hookDist = calcDistribution(primitives.map(p => p.hookType), HOOK_TYPES);
  const structDist = calcDistribution(primitives.map(p => p.structureModel), STRUCTURE_MODELS);
  const angleDist = calcDistribution(primitives.map(p => p.angleCategory), ANGLE_CATEGORIES);
  const formatDist = calcDistribution(primitives.map(p => p.formatType), FORMAT_TYPES);

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

  const dominantHook = Object.entries(hookDist).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  const dominantStructure = Object.entries(structDist).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  const dominantFormat = Object.entries(formatDist).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  const dominantAngle = Object.entries(angleDist).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  return {
    totalVideos,
    confidence,
    confidencePercent: Math.round(confidence * 100),
    signalStrength,
    signalStrengthPercent: Math.round(signalStrength),
    intelligenceStatus,
    topHooks: getTopN(hookDist, 3),
    topFormats: getTopN(formatDist, 3),
    topAngles: getTopN(angleDist, 3),
    dominantHook,
    dominantStructure,
    dominantFormat,
    dominantAngle,
    hookDistribution: hookDist,
    structureDistribution: structDist,
    formatDistribution: formatDist,
    angleDistribution: angleDist,
  };
}

export async function updateWorkspaceIntelligence(workspaceId: string) {
  const ws = await storage.getWorkspaceById(workspaceId);
  if (!ws) return;

  const result = await computeWorkspaceIntelligence(workspaceId);

  await storage.upsertWorkspaceIntelligence(workspaceId, {
    nicheId: ws.nicheId || "",
    totalVideos: result.totalVideos,
    dominantHook: result.dominantHook,
    dominantStructure: result.dominantStructure,
    dominantFormat: result.dominantFormat,
    dominantAngle: result.dominantAngle,
    hookDistribution: result.hookDistribution,
    structureDistribution: result.structureDistribution,
    formatDistribution: result.formatDistribution,
    angleDistribution: result.angleDistribution,
    confidenceScore: result.confidence,
    signalStrength: result.signalStrength,
  });

  return result;
}
