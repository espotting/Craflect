import { db } from '../db';
import { videos } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

export async function processTranscriptionBatch(): Promise<number> {
  const pending = await db.execute(sql`
    SELECT id, video_url, audio_url
    FROM videos
    WHERE transcription_status = 'pending'
      AND classification_status = 'pending'
      AND video_url IS NOT NULL
    LIMIT 50
  `);

  let processed = 0;

  for (const video of pending.rows) {
    try {
      await db.update(videos)
        .set({ transcriptionStatus: 'extracting' })
        .where(eq(videos.id, video.id as string));

      const audioPath = await extractAudio(video.video_url as string);

      await db.update(videos)
        .set({
          transcriptionStatus: 'transcribing',
          audioUrl: audioPath
        })
        .where(eq(videos.id, video.id as string));

      const transcript = await transcribeAudio(audioPath);

      await db.update(videos)
        .set({
          transcript,
          transcriptionStatus: 'completed'
        })
        .where(eq(videos.id, video.id as string));

      await cleanupAudio(audioPath);

      await db.update(videos)
        .set({ audioUrl: null })
        .where(eq(videos.id, video.id as string));

      processed++;
    } catch (error) {
      console.error(`[Transcription] Erreur vidéo ${video.id}:`, error);
      await db.update(videos)
        .set({ transcriptionStatus: 'failed' })
        .where(eq(videos.id, video.id as string));
    }
  }

  console.log(`[Transcription] ${processed} vidéos transcrites`);
  return processed;
}

async function extractAudio(_videoUrl: string): Promise<string> {
  // Hetzner: ffmpeg -i video.mp4 -vn -acodec pcm_s16le audio.wav
  throw new Error('Audio extraction not available on Replit — runs on Hetzner only');
}

async function transcribeAudio(_audioPath: string): Promise<string> {
  // Hetzner: faster-whisper model=large-v3
  throw new Error('Transcription not available on Replit — runs on Hetzner (faster-whisper)');
}

async function cleanupAudio(audioPath: string): Promise<void> {
  // Hetzner: fs.unlinkSync(audioPath)
  console.log(`[Transcription] Cleanup: ${audioPath}`);
}
