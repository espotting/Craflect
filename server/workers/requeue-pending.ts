import { Pool } from "pg";
import { Queue } from "bullmq";
import { redisConnection } from "../config/redis";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const transcriptionQueue = new Queue("transcription", { connection: redisConnection });

async function main() {
  console.log("[Requeue] Fetching videos with transcription_status = 'pending'...");

  const { rows } = await pool.query(
    `SELECT id FROM videos WHERE transcription_status = 'pending' OR transcription_status IS NULL ORDER BY collected_at ASC`
  );

  console.log(`[Requeue] Found ${rows.length} videos to requeue`);

  let queued = 0;
  for (const row of rows) {
    await transcriptionQueue.add("transcribe", { videoId: row.id }, { priority: 2 });
    queued++;
    if (queued % 50 === 0) {
      console.log(`[Requeue] Progress: ${queued}/${rows.length}`);
    }
  }

  console.log(`[Requeue] Done. ${queued} jobs added to transcription queue.`);

  await transcriptionQueue.close();
  await pool.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("[Requeue] Failed:", err);
  process.exit(1);
});
