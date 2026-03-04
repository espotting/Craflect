import { db } from "../db";
import { videos, viralPatterns } from "@shared/schema";
import { eq, sql, and, desc, gte } from "drizzle-orm";
import { storage } from "../storage";

const DOMINANT_FREQ = parseFloat(process.env.PATTERN_DOMINANT_THRESHOLD || "0.08");
const DOMINANT_PERF = 1.2;
const EMERGING_FREQ = DOMINANT_FREQ;
const EMERGING_PERF = parseFloat(process.env.PATTERN_EMERGING_THRESHOLD || "1.8");
const TREND_RATIO = parseFloat(process.env.TREND_RATIO_THRESHOLD || "1.3");

const PATTERN_DIMENSIONS = [
  "hookMechanism", "hookTopic", "contentFormat", "contentPace",
  "contentStructure", "contentGoal", "platform", "topicCategory",
] as const;

const DB_COLUMNS: Record<string, string> = {
  hookMechanism: "hook_mechanism",
  hookTopic: "hook_topic",
  contentFormat: "content_format",
  contentPace: "content_pace",
  contentStructure: "content_structure",
  contentGoal: "content_goal",
  platform: "platform",
  topicCategory: "topic_category",
};

interface DimensionStats {
  value: string;
  count: number;
  frequency: number;
  avgPerformance: number;
  performanceRatio: number;
  recentCount: number;
  historicalCount: number;
  trendRatio: number;
  patternType: "dominant" | "emerging" | "growing" | "standard";
}

function computePerformance(v: { views: number | null; likes: number | null; comments: number | null; shares: number | null }): number {
  const views = v.views || 0;
  const likes = v.likes || 0;
  const comments = v.comments || 0;
  const shares = v.shares || 0;
  if (views === 0) return 0;
  return ((likes + comments * 2 + shares * 3) / views) * 100;
}

function classifyPattern(freq: number, perfRatio: number, trendRatio: number): "dominant" | "emerging" | "growing" | "standard" {
  if (freq >= DOMINANT_FREQ && perfRatio >= DOMINANT_PERF) return "dominant";
  if (freq < EMERGING_FREQ && perfRatio >= EMERGING_PERF) return "emerging";
  if (trendRatio >= TREND_RATIO) return "growing";
  return "standard";
}

export async function getClassifiedVideoCount(): Promise<number> {
  const [result] = await db.select({ count: sql<number>`count(*)::int` })
    .from(videos)
    .where(eq(videos.classificationStatus, "completed"));
  return result.count;
}

export async function isPatternEngineReady(): Promise<{ ready: boolean; count: number }> {
  const count = await getClassifiedVideoCount();
  return { ready: count >= 300, count };
}

export async function computePatterns() {
  const { ready, count } = await isPatternEngineReady();
  if (!ready) {
    return { status: "not_ready", videoCount: count, message: `Need at least 300 classified videos (currently ${count})` };
  }

  const allVideos = await db.select().from(videos)
    .where(eq(videos.classificationStatus, "completed"))
    .orderBy(desc(videos.collectedAt));

  const totalCount = allVideos.length;
  const avgPerformance = allVideos.reduce((sum, v) => sum + computePerformance(v), 0) / totalCount;

  const recentCutoff = Math.floor(totalCount * 0.2);
  const recentVideos = allVideos.slice(0, recentCutoff);
  const historicalVideos = allVideos.slice(recentCutoff);

  const results: DimensionStats[] = [];

  for (const dim of PATTERN_DIMENSIONS) {
    const valueCounts = new Map<string, { count: number; perfSum: number; recentCount: number; historicalCount: number }>();

    for (const video of allVideos) {
      const rawVal = (video as any)[dim];
      const values: string[] = Array.isArray(rawVal) ? rawVal : (rawVal ? [rawVal] : []);

      for (const val of values) {
        if (!val) continue;
        const existing = valueCounts.get(val) || { count: 0, perfSum: 0, recentCount: 0, historicalCount: 0 };
        existing.count++;
        existing.perfSum += computePerformance(video);
        valueCounts.set(val, existing);
      }
    }

    for (const video of recentVideos) {
      const rawVal = (video as any)[dim];
      const values: string[] = Array.isArray(rawVal) ? rawVal : (rawVal ? [rawVal] : []);
      for (const val of values) {
        if (!val) continue;
        const existing = valueCounts.get(val);
        if (existing) existing.recentCount++;
      }
    }

    for (const video of historicalVideos) {
      const rawVal = (video as any)[dim];
      const values: string[] = Array.isArray(rawVal) ? rawVal : (rawVal ? [rawVal] : []);
      for (const val of values) {
        if (!val) continue;
        const existing = valueCounts.get(val);
        if (existing) existing.historicalCount++;
      }
    }

    for (const [value, stats] of valueCounts) {
      const frequency = stats.count / totalCount;
      const avgPerf = stats.perfSum / stats.count;
      const performanceRatio = avgPerformance > 0 ? avgPerf / avgPerformance : 0;

      const recentFreq = recentVideos.length > 0 ? stats.recentCount / recentVideos.length : 0;
      const historicalFreq = historicalVideos.length > 0 ? stats.historicalCount / historicalVideos.length : 0;
      const trendRatio = historicalFreq > 0 ? recentFreq / historicalFreq : (recentFreq > 0 ? 2.0 : 0);

      const patternType = classifyPattern(frequency, performanceRatio, trendRatio);

      results.push({
        value,
        count: stats.count,
        frequency,
        avgPerformance: avgPerf,
        performanceRatio,
        recentCount: stats.recentCount,
        historicalCount: stats.historicalCount,
        trendRatio,
        patternType,
      });
    }
  }

  return {
    status: "computed",
    videoCount: totalCount,
    avgPerformance,
    thresholds: { DOMINANT_FREQ, DOMINANT_PERF, EMERGING_FREQ, EMERGING_PERF, TREND_RATIO },
    patterns: {
      dominant: results.filter(r => r.patternType === "dominant"),
      emerging: results.filter(r => r.patternType === "emerging"),
      growing: results.filter(r => r.patternType === "growing"),
    },
    allPatterns: results,
  };
}

export async function computeAndStorePatterns() {
  const result = await computePatterns();
  if (result.status !== "computed") return result;

  const significantPatterns = result.allPatterns.filter(
    p => p.patternType !== "standard" && p.count >= 3
  );

  await db.delete(viralPatterns).execute();

  for (const pattern of significantPatterns) {
    await storage.createViralPattern({
      hookMechanism: null,
      hookFormat: null,
      hookTopic: null,
      contentFormat: null,
      contentPace: null,
      contentStructure: null,
      contentGoal: null,
      topicCategory: null,
      platform: null,
      averagePerformance: pattern.avgPerformance,
      performanceRatio: pattern.performanceRatio,
      frequency: pattern.frequency,
      trendRatio: pattern.trendRatio,
      patternType: pattern.patternType,
      videoCount: pattern.count,
    } as any);
  }

  return result;
}
