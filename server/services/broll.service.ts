const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const PEXELS_BASE_URL = 'https://api.pexels.com/videos';

export interface BrollClip {
  id: number;
  url: string;
  previewUrl: string;
  duration: number;
  width: number;
  height: number;
}

export async function searchBrollClips(keyword: string, maxResults: number = 3): Promise<BrollClip[]> {
  if (!PEXELS_API_KEY) {
    console.warn('[B-Roll] PEXELS_API_KEY not configured');
    return [];
  }

  try {
    const response = await fetch(`${PEXELS_BASE_URL}/search?query=${encodeURIComponent(keyword)}&per_page=${maxResults}&orientation=portrait`, {
      headers: {
        'Authorization': PEXELS_API_KEY,
      },
    });

    if (!response.ok) {
      console.error(`[B-Roll] Pexels API error: ${response.status}`);
      return [];
    }

    const data = await response.json() as any;

    return (data.videos || []).map((video: any) => {
      const hdFile = video.video_files?.find((f: any) => f.quality === 'hd' && f.width <= 1080)
        || video.video_files?.[0];

      return {
        id: video.id,
        url: hdFile?.link || '',
        previewUrl: video.image || '',
        duration: video.duration || 0,
        width: hdFile?.width || 1080,
        height: hdFile?.height || 1920,
      };
    });
  } catch (error: any) {
    console.error('[B-Roll] Pexels search error:', error.message);
    return [];
  }
}
