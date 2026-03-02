function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
}

function isPrivateUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    const hostname = parsed.hostname.toLowerCase();
    if (["localhost", "127.0.0.1", "0.0.0.0", "[::1]", "[::]"].includes(hostname)) return true;
    if (hostname.endsWith(".local") || hostname.endsWith(".internal")) return true;
    const parts = hostname.split(".");
    if (parts[0] === "10") return true;
    if (parts[0] === "172" && parseInt(parts[1]) >= 16 && parseInt(parts[1]) <= 31) return true;
    if (parts[0] === "192" && parts[1] === "168") return true;
    if (parts[0] === "169" && parts[1] === "254") return true;
    if (!["http:", "https:"].includes(parsed.protocol)) return true;
    return false;
  } catch {
    return true;
  }
}

export async function scrapePublicMetadata(url: string): Promise<{
  title?: string;
  description?: string;
  duration?: number;
  views?: number;
  likes?: number;
  commentsCount?: number;
  creatorHandle?: string;
  publishedAt?: string;
  thumbnailUrl?: string;
}> {
  if (isPrivateUrl(url)) {
    console.log("Blocked private/internal URL:", url);
    return {};
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (!res.ok) return {};

    const html = await res.text();
    const metadata: any = {};

    const ogTitle = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]*)"/) ||
                    html.match(/<meta[^>]*content="([^"]*)"[^>]*property="og:title"/);
    if (ogTitle) metadata.title = decodeHTMLEntities(ogTitle[1]);

    const ogDesc = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"/) ||
                   html.match(/<meta[^>]*content="([^"]*)"[^>]*property="og:description"/) ||
                   html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"/) ||
                   html.match(/<meta[^>]*content="([^"]*)"[^>]*name="description"/);
    if (ogDesc) metadata.description = decodeHTMLEntities(ogDesc[1]);

    const ogImage = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]*)"/) ||
                    html.match(/<meta[^>]*content="([^"]*)"[^>]*property="og:image"/);
    if (ogImage) metadata.thumbnailUrl = ogImage[1];

    const durationMatch = html.match(/"duration"[:\s]*"?(\d+)"?/) ||
                          html.match(/"video_duration"[:\s]*(\d+)/) ||
                          html.match(/"duration"[:\s]*(\d+)/);
    if (durationMatch) metadata.duration = parseInt(durationMatch[1], 10);

    const viewsMatch = html.match(/"playCount"[:\s]*(\d+)/) ||
                       html.match(/"view_count"[:\s]*(\d+)/) ||
                       html.match(/"viewCount"[:\s]*(\d+)/) ||
                       html.match(/"interactionCount"[:\s]*"?(\d+)"?/);
    if (viewsMatch) metadata.views = parseInt(viewsMatch[1], 10);

    const likesMatch = html.match(/"diggCount"[:\s]*(\d+)/) ||
                       html.match(/"like_count"[:\s]*(\d+)/) ||
                       html.match(/"likeCount"[:\s]*(\d+)/);
    if (likesMatch) metadata.likes = parseInt(likesMatch[1], 10);

    const commentsMatch = html.match(/"commentCount"[:\s]*(\d+)/) ||
                          html.match(/"comment_count"[:\s]*(\d+)/);
    if (commentsMatch) metadata.commentsCount = parseInt(commentsMatch[1], 10);

    const authorMatch = html.match(/"author"[:\s]*\{[^}]*"name"[:\s]*"([^"]+)"/) ||
                        html.match(/"creator"[:\s]*"@?([^"]+)"/) ||
                        html.match(/"uniqueId"[:\s]*"([^"]+)"/);
    if (authorMatch) metadata.creatorHandle = authorMatch[1];

    const dateMatch = html.match(/"uploadDate"[:\s]*"([^"]+)"/) ||
                      html.match(/"datePublished"[:\s]*"([^"]+)"/) ||
                      html.match(/"createTime"[:\s]*"?(\d+)"?/);
    if (dateMatch) metadata.publishedAt = dateMatch[1];

    return metadata;
  } catch (err) {
    console.log("Metadata scrape failed (non-blocking):", (err as Error).message);
    return {};
  }
}

export function detectPlatform(url: string): string {
  if (/tiktok\.com/i.test(url)) return "tiktok";
  if (/instagram\.com|instagr\.am/i.test(url)) return "instagram";
  if (/youtube\.com|youtu\.be/i.test(url)) return "youtube";
  if (/twitter\.com|x\.com/i.test(url)) return "twitter";
  return "other";
}

export function extractCreatorHandle(url: string): string | null {
  const tiktok = url.match(/tiktok\.com\/@([^/?]+)/i);
  if (tiktok) return tiktok[1];
  const insta = url.match(/instagram\.com\/(?:reel\/|p\/)?([^/?]+)/i);
  if (insta && !["reel", "p", "reels", "stories"].includes(insta[1])) return insta[1];
  const yt = url.match(/youtube\.com\/@([^/?]+)/i);
  if (yt) return yt[1];
  const twitter = url.match(/(?:twitter|x)\.com\/([^/?]+)/i);
  if (twitter && !["i", "search", "explore", "home"].includes(twitter[1])) return twitter[1];
  return null;
}
