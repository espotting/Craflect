import { db } from "../db";
import { storage } from "../storage";
import {
  videoPrimitives,
  HOOK_TYPES, STRUCTURE_MODELS, ANGLE_CATEGORIES, FORMAT_TYPES,
} from "@shared/schema";
import { eq, and, or, isNull } from "drizzle-orm";

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

function normalizedEntropy(dist: Record<string, number>): number {
  const values = Object.values(dist).filter((v) => v > 0);
  if (values.length <= 1) return 0;
  const total = values.reduce((a, b) => a + b, 0);
  const n = Object.keys(dist).length;
  if (n <= 1 || total === 0) return 0;
  let entropy = 0;
  for (const v of values) {
    const p = v / total;
    if (p > 0) entropy -= p * Math.log2(p);
  }
  return entropy / Math.log2(n);
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function dominant(dist: Record<string, number>): string | null {
  let max = 0;
  let key: string | null = null;
  for (const [k, v] of Object.entries(dist)) {
    if (v > max) { max = v; key = k; }
  }
  return key;
}

export async function updateNichePatterns(nicheId: string) {
  const primitives = await db
    .select()
    .from(videoPrimitives)
    .where(eq(videoPrimitives.nicheId, nicheId));

  if (primitives.length === 0) return;

  const hookDist = calcDistribution(primitives.map((p) => p.hookType), HOOK_TYPES);
  const structDist = calcDistribution(primitives.map((p) => p.structureModel), STRUCTURE_MODELS);
  const angleDist = calcDistribution(primitives.map((p) => p.angleCategory), ANGLE_CATEGORIES);
  const formatDist = calcDistribution(primitives.map((p) => p.formatType), FORMAT_TYPES);

  const durations = primitives.map((p) => p.durationSeconds).filter((d): d is number => d != null);
  const avgDur = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
  const medDur = median(durations);

  const dominantPatterns = {
    hook: dominant(hookDist),
    structure: dominant(structDist),
    angle: dominant(angleDist),
    format: dominant(formatDist),
  };

  await storage.upsertNichePatterns(nicheId, {
    hookDistribution: hookDist,
    structureDistribution: structDist,
    angleDistribution: angleDist,
    formatDistribution: formatDist,
    avgDuration: avgDur,
    medianDuration: medDur,
    dominantPatterns,
  });
}

export async function recomputeNicheIntelligence(nicheId: string) {
  await updateNichePatterns(nicheId);
  await updateNicheStatistics(nicheId);
}

export async function updateNicheStatistics(nicheId: string) {
  const primitives = await db
    .select()
    .from(videoPrimitives)
    .where(eq(videoPrimitives.nicheId, nicheId));

  const totalVideos = primitives.length;
  if (totalVideos === 0) return;

  const hookDist = calcDistribution(primitives.map((p) => p.hookType), HOOK_TYPES);
  const structDist = calcDistribution(primitives.map((p) => p.structureModel), STRUCTURE_MODELS);
  const angleDist = calcDistribution(primitives.map((p) => p.angleCategory), ANGLE_CATEGORIES);
  const formatDist = calcDistribution(primitives.map((p) => p.formatType), FORMAT_TYPES);

  const durations = primitives.map((p) => p.durationSeconds).filter((d): d is number => d != null);
  const medDur = median(durations);

  const stability = 1 - normalizedEntropy(hookDist);
  const confidence = Math.min(1, Math.log(totalVideos) / Math.log(1000)) * stability;

  await storage.upsertNicheStatistics(nicheId, {
    totalVideos,
    sampleSize: totalVideos,
    dominantHook: dominant(hookDist),
    dominantStructure: dominant(structDist),
    dominantAngle: dominant(angleDist),
    dominantFormat: dominant(formatDist),
    medianDuration: medDur,
    patternStabilityScore: Math.round(stability * 1000) / 1000,
    confidenceScore: Math.round(confidence * 1000) / 1000,
  });
}
