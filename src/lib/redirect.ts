/**
 * Only same-origin redirects are allowed after sign-in or sign-out. Relative
 * paths are resolved against the base URL; protocol-relative ("//evil.com")
 * and look-alike hosts ("https://app.com.evil.com") fall back to the base URL.
 */
export function safeRedirect(url: string, baseUrl: string): string {
  if (url.startsWith("/") && !url.startsWith("//") && !url.startsWith("/\\")) {
    return `${baseUrl}${url}`;
  }
  try {
    if (new URL(url).origin === new URL(baseUrl).origin) return url;
  } catch {
    // Not a valid absolute URL.
  }
  return baseUrl;
}
