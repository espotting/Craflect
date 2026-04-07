import { Worker } from 'bullmq';
import { db } from '../db';
import { videos } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import { redisConnection } from '../config/redis';
import { classificationQueue } from './scheduler';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const TRANSCRIPT_MAX_LENGTH = 500;

const FILLERS = [
  'ok', 'okay', 'guys', 'so', 'basically', 'you know',
  'um', 'uh', 'like', 'right', 'well'
];

const FILLER_REGEX = new RegExp(
  `\\b(${FILLERS.join('|')})\\b`,
  'gi'
);

function cleanTranscript(raw: string): string {
  let text = raw.toLowerCase();

  text = text.replace(FILLER_REGEX, '');

  text = text.replace(/\b(\w+)(\s+\1)+\b/gi, '$1');

  text = text.replace(/\s{2,}/g, ' ').trim();

  if (text.length > TRANSCRIPT_MAX_LENGTH) {
    text = text.substring(0, TRANSCRIPT_MAX_LENGTH);
    const lastSpace = text.lastIndexOf(' ');
    if (lastSpace > TRANSCRIPT_MAX_LENGTH * 0.8) {
      text = text.substring(0, lastSpace);
    }
  }

  return text;
}

function getTmpPath(videoId: string, ext: string): string {
  const hash = crypto.createHash('md5').update(videoId).digest('hex').substring(0, 8);
  return path.join('/tmp', `craflect_${hash}.${ext}`);
}

async function downloadVideo(
  outputPath: string,
  downloadUrl: string | null,
  videoUrl: string | null
): Promise<string> {
  if (downloadUrl) {
    try {
      execSync(`curl -sL -o "${outputPath}" "${downloadUrl}"`, { timeout: 60000 });
      const stat = fs.statSync(outputPath);
      if (stat.size > 10000) {
        console.log(`[Transcription] ✅ Downloaded via curl (direct URL, ${(stat.size / 1024).toFixed(0)}KB)`);
        return 'curl_direct';
      }
      fs.unlinkSync(outputPath);
    } catch {
      console.log(`[Transcription] curl direct failed, trying yt-dlp...`);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    }
  }

  const targetUrl = videoUrl || downloadUrl;
  if (!targetUrl) {
    throw new Error('No URL available for download');
  }

  try {
    execSync(
      `yt-dlp -f "best[ext=mp4]/best" --no-warnings --no-playlist -o "${outputPath}" "${targetUrl}"`,
      { timeout: 120000, stdio: 'pipe' }
    );
    if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 10000) {
      console.log(`[Transcription] ✅ Downloaded via yt-dlp (${(fs.statSync(outputPath).size / 1024).toFixed(0)}KB)`);
      return 'yt-dlp';
    }
    throw new Error('yt-dlp output too small or missing');
  } catch (err: any) {
    throw new Error(`Download failed for ${targetUrl}: ${err.message}`);
  }
}

async function extractAudio(videoPath: string, audioPath: string): Promise<void> {
  execSync(
    `ffmpeg -i "${videoPath}" -vn -acodec libmp3lame -ar 16000 -ac 1 -q:a 9 "${audioPath}" -y`,
    { timeout: 60000, stdio: 'pipe' }
  );
  if (!fs.existsSync(audioPath)) {
    throw new Error('Audio extraction failed');
  }
}

async function transcribeWithWhisper(audioPath: string): Promise<{ text: string; language: string }> {
  const pythonScript = `
import sys
import json
from faster_whisper import WhisperModel

model = WhisperModel("base", device="cpu", compute_type="int8")
segments, info = model.transcribe("${audioPath}", beam_size=5)

text = " ".join([s.text for s in segments])
print(json.dumps({"text": text.strip(), "language": info.language}))
`;

  const result = execSync(`python3 -c '${pythonScript.replace(/'/g, "'\\''")}'`, {
    timeout: 120000,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe']
  });

  return JSON.parse(result.trim());
}

function cleanupFiles(...paths: string[]): void {
  for (const p of paths) {
    try {
      if (fs.existsSync(p)) {
        fs.unlinkSync(p);
      }
    } catch {
      console.warn(`[Transcription] Cleanup failed: ${p}`);
    }
  }
}

export const transcriptionWorker = new Worker('transcription', async (job) => {
  const { videoId } = job.data;

  console.log(`[Transcription] Processing video ${videoId}`);

  const video = await db.execute(sql`
    SELECT id, video_url, download_url, duration_seconds
    FROM videos WHERE id = ${videoId}
  `);

  if (!video.rows[0]) {
    console.warn(`[Transcription] Video ${videoId} not found`);
    return;
  }

  const row = video.rows[0] as any;

  if (!row.video_url && !row.download_url) {
    console.warn(`[Transcription] No video URL for ${videoId}`);
    await db.update(videos)
      .set({ transcriptGenerated: false, transcriptionStatus: 'skipped' })
      .where(eq(videos.id, videoId));
    await classificationQueue.add('classify', { videoId }, { priority: 2 });
    return;
  }

  if (row.duration_seconds && row.duration_seconds <= 15) {
    console.log(`[Transcription] Video ${videoId} too short (${row.duration_seconds}s), skipping`);
    await db.update(videos)
      .set({ transcriptGenerated: false, transcriptionStatus: 'skipped' })
      .where(eq(videos.id, videoId));
    await classificationQueue.add('classify', { videoId }, { priority: 2 });
    return;
  }

  const videoPath = getTmpPath(videoId, 'mp4');
  const audioPath = getTmpPath(videoId, 'mp3');

  try {
    await db.update(videos)
      .set({ transcriptionStatus: 'downloading' })
      .where(eq(videos.id, videoId));

    const downloadMethod = await downloadVideo(videoPath, row.download_url, row.video_url);
    console.log(`[Transcription] Video ${videoId} downloaded via ${downloadMethod}`);

    await db.update(videos)
      .set({ transcriptionStatus: 'extracting' })
      .where(eq(videos.id, videoId));

    await extractAudio(videoPath, audioPath);

    await db.update(videos)
      .set({ transcriptionStatus: 'transcribing' })
      .where(eq(videos.id, videoId));

    const result = await transcribeWithWhisper(audioPath);
    const cleaned = cleanTranscript(result.text);
  if (result.language && result.language !== "en") {
  await db.update(videos).set({ transcriptionStatus: "skipped", transcriptLanguage: result.language }).where(eq(videos.id, videoId));
  console.log(`[Transcription] ⏭️ Video ${videoId} skipped (non-english: ${result.language})`);
  return;
}
await db.update(videos)
  .set({
    transcript: cleaned || null,
    transcriptLanguage: result.language || null,
    transcriptGenerated: true,
    transcriptionStatus: 'completed',
  })
  .where(eq(videos.id, videoId));

    console.log(`[Transcription] ✅ Video ${videoId} transcribed (${cleaned.length} chars, lang: ${result.language})`);
  } catch (error) {
    console.error(`[Transcription] ❌ Video ${videoId} failed:`, error);
    await db.update(videos)
      .set({ transcriptGenerated: false, transcriptionStatus: 'failed' })
      .where(eq(videos.id, videoId));
  } finally {
    cleanupFiles(videoPath, audioPath);
  }

  await classificationQueue.add('classify', { videoId }, { priority: 2 });

}, {
  connection: redisConnection,
  concurrency: 2,
  limiter: { max: 10, duration: 60000 }
});
