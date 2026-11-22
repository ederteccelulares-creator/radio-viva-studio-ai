import { supabase } from "@/integrations/supabase/client";

// Buckets are private: files are served through short-lived signed URLs.
// Stored references are either full http(s) URLs or "bucket:path".
const cache = new Map<string, { url: string; exp: number }>();
const TTL = 60 * 60 * 6;

export function storageRef(bucket: "audio" | "images", path: string) {
  return `${bucket}:${path}`;
}

export async function resolveMedia(ref: string | null | undefined): Promise<string | null> {
  if (!ref) return null;
  if (/^https?:\/\//i.test(ref)) return ref;
  const idx = ref.indexOf(":");
  if (idx < 0) return null;
  const bucket = ref.slice(0, idx);
  const path = ref.slice(idx + 1);
  const hit = cache.get(ref);
  if (hit && hit.exp > Date.now()) return hit.url;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, TTL);
  if (error || !data) return null;
  cache.set(ref, { url: data.signedUrl, exp: Date.now() + (TTL - 300) * 1000 });
  return data.signedUrl;
}

export function isSafeHttpUrl(v: string) {
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function parseYoutubeId(input: string): string | null {
  const s = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtu.be") return u.pathname.slice(1, 12) || null;
    if (host === "youtube.com" || host === "music.youtube.com") {
      const v = u.searchParams.get("v");
      if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;
      const m = u.pathname.match(/\/(embed|shorts|live)\/([A-Za-z0-9_-]{11})/);
      if (m?.[2]) return m[2];
    }
  } catch {
    return null;
  }
  return null;
}