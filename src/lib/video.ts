import * as WebBrowser from "expo-web-browser";

/**
 * Exercise videos are any http(s) link (`Exercise.videoUrl`, `""` when none — the BFF only accepts
 * http/https, like the web's `videoUrl` schema). Mobile v1 opens them externally and shows a
 * thumbnail when the link is a YouTube video, whose still images are public at a predictable URL.
 */

const YOUTUBE_ID = /^[\w-]{11}$/;

/** The 11-character video id of a YouTube watch/short/embed/youtu.be link, or null. */
export function youtubeVideoId(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  const host = parsed.hostname.replace(/^(www|m)\./, "");
  let id: string | null = null;
  if (host === "youtu.be") {
    id = parsed.pathname.slice(1).split("/")[0] ?? null;
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (parsed.pathname === "/watch") id = parsed.searchParams.get("v");
    else {
      const [, kind, value] = parsed.pathname.split("/");
      if (kind === "shorts" || kind === "embed" || kind === "live") id = value ?? null;
    }
  }
  return id !== null && YOUTUBE_ID.test(id) ? id : null;
}

/** A thumbnail image URL for an exercise video, or null when there's no video or no known still. */
export function videoThumbnailUrl(videoUrl: string): string | null {
  const id = youtubeVideoId(videoUrl);
  return id === null ? null : `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

/** Opens an exercise video in the in-app browser; anything but http(s) is ignored (a shared catalog). */
export async function openVideo(videoUrl: string): Promise<void> {
  if (isOpenableVideoUrl(videoUrl)) await WebBrowser.openBrowserAsync(videoUrl);
}

/** Whether a stored `videoUrl` is something the app may open (http/https only). */
export function isOpenableVideoUrl(videoUrl: string): boolean {
  try {
    const { protocol } = new URL(videoUrl);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}
