/** youtube.com/watch?v=ID ou youtu.be/ID -> ID do video, ou null se o link nao for reconhecido/estiver ausente. */
export function extractYouTubeId(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) return parsed.pathname.slice(1) || null;
    return parsed.searchParams.get('v');
  } catch {
    return null;
  }
}
