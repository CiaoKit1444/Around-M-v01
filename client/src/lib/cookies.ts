/**
 * Client-side cookie helpers for role persistence.
 *
 * Active role and "remember role" are stored in cookies (not just localStorage)
 * so they survive incognito sessions and cross-browser scenarios where
 * localStorage is partitioned or unavailable.
 *
 * Cookies are set with path=/ and a 30-day max-age.
 */

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/**
 * Set a cookie with the given name and value.
 * Uses SameSite=Lax for security while allowing same-site navigation.
 */
export function setCookie(name: string, value: string): void {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

/**
 * Read a cookie by name. Returns null if not found.
 */
export function getCookie(name: string): string | null {
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Delete a cookie by setting max-age to 0.
 */
export function deleteCookie(name: string): void {
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}
