import { db } from '../db';
import { videos } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as path from 'path';

const TRANSCRIPT_MAX_LENGTH = 500;

const FILLERS = [
  'ok', 'okay', 'guys', 'so', 'basically', 'you know',
  'um', 'uh', 'like', 'right', 'well'
];

const FILLER_REGEX = new RegExp(
  `\\b(${FILLERS.join('|')})\\b`,
  'gi'
);

export function cleanTranscript(raw: string): string {
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

export async function processTranscriptionBatch(): Promise<number> {
  const pending = await db.execute(sql`
    SELECT id, video_url, duration_seconds
    FROM videos
    WHERE transcription_status = 'pending'
      AND video_url IS NOT NULL
      AND duration_seconds > 15
    LIMIT 50
  `);

  let processed = 0;

  for (const video of pending.rows) {
    const videoId = video.id as string;
    const videoUrl = video.video_url as string;
    const hash = crypto.createHash('md5').update(videoId).digest('hex').substring(0, 8);
    const videoPath = path.join('/tmp', `craflect_${hash}.mp4`);
    const audioPath = path.join('/tmp', `craflect_${hash}.mp3`);

    try {
      await db.update(videos)
        .set({ transcriptionStatus: 'downloading' })
        .where(eq(videos.id, videoId));

      execSync(`curl -sL -o "${videoPath}" "${videoUrl}"`, { timeout: 60000 });

      await db.update(videos)
        .set({ transcriptionStatus: 'extracting' })
        .where(eq(videos.id, videoId));

      execSync(
        `ffmpeg -i "${videoPath}" -vn -acodec libmp3lame -ar 16000 -ac 1 -q:a 9 "${audioPath}" -y`,
        { timeout: 60000, stdio: 'pipe' }
      );

      await db.update(videos)
        .set({ transcriptionStatus: 'transcribing' })
        .where(eq(videos.id, videoId));

      const pythonScript = `
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

      const parsed = JSON.parse(result.trim());
      const cleaned = cleanTranscript(parsed.text);

      await db.update(videos)
        .set({
          transcript: cleaned || null,
          transcriptLanguage: parsed.language || null,
          transcriptGenerated: true,
          transcriptionStatus: 'completed',
        })
        .where(eq(videos.id, videoId));

      processed++;
    } catch (error) {
      console.error(`[Transcription] Erreur vidéo ${videoId}:`, error);
      await db.update(videos)
        .set({ transcriptGenerated: false, transcriptionStatus: 'failed' })
        .where(eq(videos.id, videoId));
    } finally {
      try { if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath); } catch {}
      try { if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath); } catch {}
    }
  }

  console.log(`[Transcription] ${processed} vidéos transcrites`);
  return processed;
}
