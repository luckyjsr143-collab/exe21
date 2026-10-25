export const ORIGIN = import.meta.env.VITE_API_ORIGIN || "http://localhost:5000";
export function imageUrl(url) { return url.startsWith("/") ? `${ORIGIN}${url}` : url; }
export async function api(route, options = {}) {
  const res = await fetch(`${ORIGIN}/api${route}`, { ...options, signal: options.signal || AbortSignal.timeout(20000) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}
export async function downloadWallpaper(wallpaper) {
  const res = await fetch(`${ORIGIN}/api/wallpapers/${wallpaper.id}/download`, { signal: AbortSignal.timeout(60000) });
  if (!res.ok) { const data = await res.json(); throw new Error(data.error || "Download failed"); }
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url; a.download = `wallpaper-${wallpaper.id}.webp`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
