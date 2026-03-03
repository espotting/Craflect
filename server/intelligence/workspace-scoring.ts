import { storage } from "../storage";
import { HOOK_TYPES, STRUCTURE_MODELS, ANGLE_CATEGORIES, FORMAT_TYPES } from "@shared/schema";

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

function dominant(dist: Record<string, number>): string | null {
  let max = 0;
  let key: string | null = null;
  for (const [k, v] of Object.entries(dist)) {
    if (v > max) { max = v; key = k; }
  }
  return key;
}

function topEntries(dist: Record<string, number>, n: number = 3): Array<{ name: string; percent: number }> {
  return Object.entries(dist)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .filter(([, v]) => v > 0)
    .map(([name, percent]) => ({ name, percent }));
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
      intelligenceStatus: "building" as const,
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

  const volumeScore = Math.min(totalVideos / 500, 1);

  const domHookPct = Math.max(...Object.values(hookDist)) / 100;
  const domStructPct = Math.max(...Object.values(structDist)) / 100;
  const domFormatPct = Math.max(...Object.values(formatDist)) / 100;
  const consistencyScore = (domHookPct + domStructPct + domFormatPct) / 3;

  const mean = (domHookPct + domStructPct + domFormatPct) / 3;
  const variance = ((domHookPct - mean) ** 2 + (domStructPct - mean) ** 2 + (domFormatPct - mean) ** 2) / 3;
  const stabilityScore = Math.max(0, 1 - Math.sqrt(variance));

  const confidence = 0.4 * volumeScore + 0.4 * consistencyScore + 0.2 * stabilityScore;
  const signalStrength = (domHookPct + domStructPct + domFormatPct) / 3;

  let intelligenceStatus: "building" | "active" | "mature" = "building";
  if (totalVideos >= 500 && confidence >= 0.7) intelligenceStatus = "mature";
  else if (totalVideos >= 100 && confidence >= 0.5) intelligenceStatus = "active";

  return {
    totalVideos,
    confidence: Math.round(confidence * 1000) / 1000,
    confidencePercent: Math.round(confidence * 100),
    signalStrength: Math.round(signalStrength * 1000) / 1000,
    signalStrengthPercent: Math.round(signalStrength * 100),
    intelligenceStatus,
    topHooks: topEntries(hookDist),
    topFormats: topEntries(formatDist),
    topAngles: topEntries(angleDist),
    dominantHook: dominant(hookDist),
    dominantStructure: dominant(structDist),
    dominantFormat: dominant(formatDist),
    dominantAngle: dominant(angleDist),
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
