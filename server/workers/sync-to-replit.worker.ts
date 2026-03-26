import { Pool } from "pg";

const REPLIT_SYNC_URL = process.env.REPLIT_SYNC_URL || "https://craflect.com";
const SYNC_API_KEY = process.env.SYNC_API_KEY;
const SYNC_BATCH_SIZE = parseInt(process.env.SYNC_BATCH_SIZE || "20");
const SYNC_INTERVAL_MS = parseInt(process.env.SYNC_INTERVAL_MS || "900000");

const localPool = new Pool({ connectionString: process.env.DATABASE_URL });

interface SyncCursors {
  videos: string | null;
  classifications: string | null;
  patterns: string | null;
  videoPatterns: string | null;
  opportunities: string | null;
}

async function syncEndpoint(path: string, body: Record<string, unknown>): Promise<any> {
  const url = `${REPLIT_SYNC_URL}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SYNC_API_KEY}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sync ${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}

async function getCursors(): Promise<SyncCursors> {
  try {
    const url = `${REPLIT_SYNC_URL}/api/sync/status`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${SYNC_API_KEY}` },
    });
    if (res.ok) {
      const data = await res.json();
      return data.cursors || {
        videos: null,
        classifications: null,
        patterns: null,
        videoPatterns: null,
        opportunities: null,
      };
    }
  } catch {}
  return { videos: null, classifications: null, patterns: null, videoPatterns: null, opportunities: null };
}

async function syncTablePaginated(
  tableName: string,
  endpointPath: string,
  bodyKey: string,
  query: string,
  params: any[]
): Promise<number> {
  let totalSynced = 0;
  let hasMore = true;
  let currentCursor = params[0];

  while (hasMore) {
    const queryParams = currentCursor ? [currentCursor, SYNC_BATCH_SIZE] : [SYNC_BATCH_SIZE];
    const finalQuery = currentCursor ? query : query.replace(/WHERE .+ > \$1 ORDER/, "ORDER").replace("$2", "$1");

    const { rows } = await localPool.query(
      currentCursor ? query : query.replace(/WHERE .+ > \$1 /g, "").replace("$2", "$1"),
      currentCursor ? [currentCursor, SYNC_BATCH_SIZE] : [SYNC_BATCH_SIZE]
    );

    if (rows.length === 0) {
      hasMore = false;
      break;
    }

    const result = await syncEndpoint(endpointPath, { [bodyKey]: rows });
    totalSynced += result.upserted || 0;

    if (result.errors > 0) {
      console.warn(`[Sync] ${tableName}: ${result.errors} errors in batch`);
    }

    if (rows.length < SYNC_BATCH_SIZE) {
      hasMore = false;
    } else {
      const lastRow = rows[rows.length - 1];
      const cursorCol = query.match(/ORDER BY (\w+)/)?.[1];
      if (cursorCol && lastRow[cursorCol]) {
        currentCursor = lastRow[cursorCol];
      } else {
        hasMore = false;
      }
    }
  }

  return totalSynced;
}

async function syncVideos(since: string | null): Promise<number> {
  const query = since
    ? `SELECT * FROM videos WHERE collected_at > $1 ORDER BY collected_at ASC LIMIT $2`
    : `SELECT * FROM videos ORDER BY collected_at ASC LIMIT $1`;

  let totalSynced = 0;
  let hasMore = true;
  let cursor = since;

  while (hasMore) {
    const params = cursor ? [cursor, SYNC_BATCH_SIZE] : [SYNC_BATCH_SIZE];
    const q = cursor
      ? `SELECT * FROM videos WHERE collected_at > $1 ORDER BY collected_at ASC LIMIT $2`
      : `SELECT * FROM videos ORDER BY collected_at ASC LIMIT $1`;

    const { rows } = await localPool.query(q, params);
    if (rows.length === 0) break;

    const result = await syncEndpoint("/api/sync/videos", { videos: rows });
    totalSynced += result.upserted || 0;
    if (result.errors > 0) console.warn(`[Sync] Videos: ${result.errors} errors`);

    if (rows.length < SYNC_BATCH_SIZE) {
      hasMore = false;
    } else {
      cursor = rows[rows.length - 1].collected_at?.toISOString?.() || rows[rows.length - 1].collected_at;
    }
  }

  return totalSynced;
}

async function syncClassifications(since: string | null): Promise<number> {
  let totalSynced = 0;
  let hasMore = true;
  let cursor = since;

  while (hasMore) {
    const params = cursor ? [cursor, SYNC_BATCH_SIZE] : [SYNC_BATCH_SIZE];
    const q = cursor
      ? `SELECT * FROM video_classification WHERE classified_at > $1 ORDER BY classified_at ASC LIMIT $2`
      : `SELECT * FROM video_classification ORDER BY classified_at ASC LIMIT $1`;

    const { rows } = await localPool.query(q, params);
    if (rows.length === 0) break;

    const result = await syncEndpoint("/api/sync/classifications", { classifications: rows });
    totalSynced += result.upserted || 0;
    if (result.errors > 0) console.warn(`[Sync] Classifications: ${result.errors} errors`);

    if (rows.length < SYNC_BATCH_SIZE) {
      hasMore = false;
    } else {
      cursor = rows[rows.length - 1].classified_at?.toISOString?.() || rows[rows.length - 1].classified_at;
    }
  }

  return totalSynced;
}

async function syncPatterns(since: string | null): Promise<number> {
  let totalSynced = 0;
  let hasMore = true;
  let cursor = since;

  while (hasMore) {
    const params = cursor ? [cursor, SYNC_BATCH_SIZE] : [SYNC_BATCH_SIZE];
    const q = cursor
      ? `SELECT * FROM patterns WHERE last_updated > $1 ORDER BY last_updated ASC LIMIT $2`
      : `SELECT * FROM patterns ORDER BY last_updated ASC LIMIT $1`;

    const { rows } = await localPool.query(q, params);
    if (rows.length === 0) break;

    const result = await syncEndpoint("/api/sync/patterns", { patterns: rows });
    totalSynced += result.upserted || 0;
    if (result.errors > 0) console.warn(`[Sync] Patterns: ${result.errors} errors`);

    if (rows.length < SYNC_BATCH_SIZE) {
      hasMore = false;
    } else {
      cursor = rows[rows.length - 1].last_updated?.toISOString?.() || rows[rows.length - 1].last_updated;
    }
  }

  return totalSynced;
}

async function syncVideoPatterns(since: string | null): Promise<number> {
  let totalSynced = 0;
  let hasMore = true;
  let cursor = since;

  while (hasMore) {
    const params = cursor ? [cursor, SYNC_BATCH_SIZE] : [SYNC_BATCH_SIZE];
    const q = cursor
      ? `SELECT * FROM video_patterns WHERE created_at > $1 ORDER BY created_at ASC LIMIT $2`
      : `SELECT * FROM video_patterns ORDER BY created_at ASC LIMIT $1`;

    const { rows } = await localPool.query(q, params);
    if (rows.length === 0) break;

    const result = await syncEndpoint("/api/sync/video-patterns", { videoPatterns: rows });
    totalSynced += result.upserted || 0;
    if (result.errors > 0) console.warn(`[Sync] VideoPatterns: ${result.errors} errors`);

    if (rows.length < SYNC_BATCH_SIZE) {
      hasMore = false;
    } else {
      cursor = rows[rows.length - 1].created_at?.toISOString?.() || rows[rows.length - 1].created_at;
    }
  }

  return totalSynced;
}

async function syncOpportunities(since: string | null): Promise<number> {
  let totalSynced = 0;
  let hasMore = true;
  let cursor = since;

  while (hasMore) {
    const params = cursor ? [cursor, SYNC_BATCH_SIZE] : [SYNC_BATCH_SIZE];
    const q = cursor
      ? `SELECT * FROM opportunities WHERE generated_at > $1 ORDER BY generated_at ASC LIMIT $2`
      : `SELECT * FROM opportunities ORDER BY generated_at ASC LIMIT $1`;

    const { rows } = await localPool.query(q, params);
    if (rows.length === 0) break;

    const result = await syncEndpoint("/api/sync/opportunities", { opportunities: rows });
    totalSynced += result.upserted || 0;
    if (result.errors > 0) console.warn(`[Sync] Opportunities: ${result.errors} errors`);

    if (rows.length < SYNC_BATCH_SIZE) {
      hasMore = false;
    } else {
      cursor = rows[rows.length - 1].generated_at?.toISOString?.() || rows[rows.length - 1].generated_at;
    }
  }

  return totalSynced;
}

async function runSyncCycle() {
  console.log(`[Sync] Starting sync cycle at ${new Date().toISOString()}`);

  try {
    const cursors = await getCursors();
    console.log(`[Sync] Cursors:`, JSON.stringify(cursors));

    const videoCount = await syncVideos(cursors.videos);
    const classCount = await syncClassifications(cursors.classifications);
    const patternCount = await syncPatterns(cursors.patterns);
    const vpCount = await syncVideoPatterns(cursors.videoPatterns);
    const oppCount = await syncOpportunities(cursors.opportunities);

    console.log(`[Sync] Cycle complete: ${videoCount} videos, ${classCount} classifications, ${patternCount} patterns, ${vpCount} video-patterns, ${oppCount} opportunities`);
  } catch (err) {
    console.error("[Sync] Cycle failed:", err);
  }
}

async function main() {
  if (!SYNC_API_KEY) {
    console.error("[Sync] SYNC_API_KEY not set. Exiting.");
    process.exit(1);
  }

  console.log(`[Sync] Worker started. Target: ${REPLIT_SYNC_URL}`);
  console.log(`[Sync] Interval: ${SYNC_INTERVAL_MS / 1000}s, Batch size: ${SYNC_BATCH_SIZE}`);

  await runSyncCycle();

  setInterval(runSyncCycle, SYNC_INTERVAL_MS);
}

main().catch(console.error);
