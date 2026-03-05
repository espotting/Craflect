import { db } from "../db";
import { videos, patterns } from "@shared/schema";
import { eq, sql, desc, isNotNull, and } from "drizzle-orm";

const MIN_VIDEOS_PER_PATTERN = parseInt(process.env.PATTERN_MIN_VIDEOS || "10");
const MIN_DATASET_SIZE = parseInt(process.env.PATTERN_ENGINE_MIN_DATASET || "1000");
const IDEAL_DATASET_SIZE = 3000;

type DimensionKey = "hookType" | "structureType" | "emotionPrimary" | "topicCluster" | "topicCategory" | "facecam" | "cutFrequency" | "textOverlayDensity" | "platform";

const DIMENSION_DB_MAP: Record<DimensionKey, string> = {
  hookType: "hook_type_v2",
  structureType: "structure_type",
  emotionPrimary: "emotion_primary",
  topicCluster: "topic_cluster",
  topicCategory: "topic_category",
  facecam: "facecam",
  cutFrequency: "cut_frequency",
  textOverlayDensity: "text_overlay_density",
  platform: "platform",
};

const DIMENSION_COMBINATIONS: DimensionKey[][] = [
  ["hookType", "topicCluster"],
  ["hookType", "structureType"],
  ["structureType", "emotionPrimary"],
  ["hookType", "emotionPrimary"],
  ["hookType", "platform"],
  ["structureType", "topicCluster"],
  ["hookType", "cutFrequency"],
  ["hookType", "structureType", "topicCluster"],
];

interface VideoRow {
  hookType: string | null;
  structureType: string | null;
  emotionPrimary: string | null;
  topicCluster: string | null;
  topicCategory: string | null;
  facecam: boolean | null;
  cutFrequency: string | null;
  textOverlayDensity: string | null;
  platform: string | null;
  viralityScore: number | null;
  engagementRate: number | null;
}

function buildComboKey(row: VideoRow, dims: DimensionKey[]): string | null {
  const parts: string[] = [];
  for (const dim of dims) {
    const val = row[dim];
    if (val === null || val === undefined) return null;
    parts.push(String(val));
  }
  return parts.join("||");
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function buildPatternLabel(dims: DimensionKey[], values: string[]): string {
  return dims.map((d, i) => `${d}=${values[i]}`).join(" + ");
}

export async function getClassifiedVideoCount(): Promise<number> {
  const [result] = await db.select({ count: sql<number>`count(*)::int` })
    .from(videos)
    .where(eq(videos.classificationStatus, "completed"));
  return result.count;
}

export async function isPatternEngineV1Ready(): Promise<{
  ready: boolean;
  count: number;
  minRequired: number;
  idealSize: number;
  datasetQuality: "insufficient" | "minimum" | "good" | "ideal";
}> {
  const count = await getClassifiedVideoCount();
  let datasetQuality: "insufficient" | "minimum" | "good" | "ideal";
  if (count < MIN_DATASET_SIZE) datasetQuality = "insufficient";
  else if (count < IDEAL_DATASET_SIZE * 0.5) datasetQuality = "minimum";
  else if (count < IDEAL_DATASET_SIZE) datasetQuality = "good";
  else datasetQuality = "ideal";

  return {
    ready: count >= MIN_DATASET_SIZE,
    count,
    minRequired: MIN_DATASET_SIZE,
    idealSize: IDEAL_DATASET_SIZE,
    datasetQuality,
  };
}

export async function computePatternsV1() {
  const status = await isPatternEngineV1Ready();
  if (!status.ready) {
    return {
      status: "not_ready",
      videoCount: status.count,
      minRequired: status.minRequired,
      idealSize: status.idealSize,
      datasetQuality: status.datasetQuality,
      message: `Pattern Engine requires at least ${status.minRequired} classified videos (currently ${status.count}). Ideal: ${status.idealSize}.`,
    };
  }

  const allVideos: VideoRow[] = await db.select({
    hookType: videos.hookType,
    structureType: videos.structureType,
    emotionPrimary: videos.emotionPrimary,
    topicCluster: videos.topicCluster,
    topicCategory: videos.topicCategory,
    facecam: videos.facecam,
    cutFrequency: videos.cutFrequency,
    textOverlayDensity: videos.textOverlayDensity,
    platform: videos.platform,
    viralityScore: videos.viralityScore,
    engagementRate: videos.engagementRate,
  })
    .from(videos)
    .where(and(
      eq(videos.classificationStatus, "completed"),
      isNotNull(videos.viralityScore),
    ));

  if (allVideos.length < MIN_DATASET_SIZE) {
    return {
      status: "not_ready",
      videoCount: allVideos.length,
      message: `Not enough videos with virality_score computed (${allVideos.length}). Need ${MIN_DATASET_SIZE}.`,
    };
  }

  interface ComboStats {
    viralityScores: number[];
    engagementRates: number[];
    dimValues: string[];
    topicCategory: string | null;
  }

  const extractedPatterns: Array<{
    dimensionKeys: string[];
    dimValues: Record<string, string | boolean | null>;
    videoCount: number;
    avgViralityScore: number;
    medianViralityScore: number;
    avgEngagementRate: number;
    patternLabel: string;
  }> = [];

  for (const combo of DIMENSION_COMBINATIONS) {
    const buckets = new Map<string, ComboStats>();

    for (const row of allVideos) {
      const key = buildComboKey(row, combo);
      if (!key) continue;

      const existing = buckets.get(key) || {
        viralityScores: [],
        engagementRates: [],
        dimValues: key.split("||"),
        topicCategory: row.topicCategory,
      };

      existing.viralityScores.push(row.viralityScore!);
      if (row.engagementRate !== null) existing.engagementRates.push(row.engagementRate);
      buckets.set(key, existing);
    }

    for (const [, stats] of buckets) {
      if (stats.viralityScores.length < MIN_VIDEOS_PER_PATTERN) continue;

      const avgVirality = stats.viralityScores.reduce((a, b) => a + b, 0) / stats.viralityScores.length;
      const medVirality = median(stats.viralityScores);
      const avgEngagement = stats.engagementRates.length > 0
        ? stats.engagementRates.reduce((a, b) => a + b, 0) / stats.engagementRates.length
        : null;

      const dimValues: Record<string, string | boolean | null> = {};
      combo.forEach((dim, i) => {
        const val = stats.dimValues[i];
        if (dim === "facecam") {
          dimValues[dim] = val === "true";
        } else {
          dimValues[dim] = val;
        }
      });

      if (stats.topicCategory) dimValues.topicCategory = stats.topicCategory;

      extractedPatterns.push({
        dimensionKeys: [...combo],
        dimValues,
        videoCount: stats.viralityScores.length,
        avgViralityScore: avgVirality,
        medianViralityScore: medVirality,
        avgEngagementRate: avgEngagement ?? 0,
        patternLabel: buildPatternLabel(combo, stats.dimValues),
      });
    }
  }

  extractedPatterns.sort((a, b) => b.avgViralityScore - a.avgViralityScore);
  extractedPatterns.forEach((p, i) => (p as any).rank = i + 1);

  return {
    status: "computed",
    videoCount: allVideos.length,
    datasetQuality: status.datasetQuality,
    totalPatterns: extractedPatterns.length,
    combinationsAnalyzed: DIMENSION_COMBINATIONS.length,
    minVideosPerPattern: MIN_VIDEOS_PER_PATTERN,
    patterns: extractedPatterns.map((p, i) => ({
      ...p,
      performanceRank: i + 1,
    })),
  };
}

export async function computeAndStorePatternsV1() {
  const result = await computePatternsV1();
  if (result.status !== "computed") return result;

  await db.delete(patterns).execute();

  const now = new Date();
  for (const p of result.patterns) {
    await db.insert(patterns).values({
      dimensionKeys: p.dimensionKeys,
      hookType: (p.dimValues.hookType as string) || null,
      structureType: (p.dimValues.structureType as string) || null,
      emotionPrimary: (p.dimValues.emotionPrimary as string) || null,
      topicCluster: (p.dimValues.topicCluster as string) || null,
      topicCategory: (p.dimValues.topicCategory as string) || null,
      facecam: p.dimValues.facecam !== undefined ? p.dimValues.facecam as boolean : null,
      cutFrequency: (p.dimValues.cutFrequency as string) || null,
      textOverlayDensity: (p.dimValues.textOverlayDensity as string) || null,
      platform: (p.dimValues.platform as string) || null,
      videoCount: p.videoCount,
      avgViralityScore: p.avgViralityScore,
      medianViralityScore: p.medianViralityScore,
      avgEngagementRate: p.avgEngagementRate,
      performanceRank: p.performanceRank,
      patternLabel: p.patternLabel,
      lastUpdated: now,
    });
  }

  return {
    ...result,
    stored: true,
    patternsStored: result.patterns.length,
  };
}
