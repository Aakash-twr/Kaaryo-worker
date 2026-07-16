/**
 * Backend base URL. All API paths are prefixed with `/api`.
 * Swap this for an env-driven value (EXPO_PUBLIC_API_URL) before shipping.
 */
export const API_BASE_URL = "http://16.112.68.7:4000";

/** Turns a server-relative path (e.g. "/uploads/x.jpg") into an absolute URL. */
export function absoluteUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}
