import { db } from '../db';
import { sql } from 'drizzle-orm';

export interface VideoGenerationConfig {
  scriptId: string;
  patternTemplateId?: string;
  avatarType?: 'placeholder' | 'heygen';
  brollKeywords?: string[];
  outputFormat?: 'mp4' | 'webm';
}

export interface VideoGenerationResult {
  status: 'pending' | 'rendering' | 'ready' | 'failed';
  previewUrl?: string;
  videoUrl?: string;
  error?: string;
}

export async function getPatternTemplateForStudio(patternTemplateId: string) {
  const result = await db.execute(sql`
    SELECT * FROM pattern_templates WHERE id = ${patternTemplateId}
  `);
  return result.rows[0] || null;
}

export async function getScriptForStudio(projectId: string) {
  const result = await db.execute(sql`
    SELECT script, blueprint, hook, format, topic
    FROM content_projects WHERE project_id = ${projectId}
  `);
  return result.rows[0] || null;
}

export async function generateVideo(_config: VideoGenerationConfig): Promise<VideoGenerationResult> {
  // Placeholder — HeyGen integration future
  // Sur Hetzner : appel API HeyGen pour avatar + composition vidéo
  console.log('[VideoGeneration] Placeholder — HeyGen not yet integrated');

  return {
    status: 'pending',
    error: 'Video generation not yet available — HeyGen integration coming soon'
  };
}

export async function generateAvatar(_text: string, _voiceId?: string): Promise<string | null> {
  // Placeholder — HeyGen avatar generation
  // API: POST https://api.heygen.com/v2/video/generate
  console.log('[Avatar] Placeholder — HeyGen avatar not yet integrated');
  return null;
}
