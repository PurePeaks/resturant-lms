import type { NextRequest } from "next/server";

type HeaderSource = { get(name: string): string | null };

/** Best-effort client IP for rate limiting. Vercel and most proxies set x-forwarded-for. */
export function clientIp(headers: HeaderSource): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip")?.trim() || "unknown";
}

export function requestIp(req: NextRequest): string {
  return clientIp(req.headers);
}

/**
 * Public base URL for links that leave the app (QR codes, emails). Uses the
 * configured URL, otherwise the request's own host. Never a hardcoded domain.
 */
export function baseUrlFrom(headers: HeaderSource): string {
  const configured = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
  if (configured) return configured.replace(/\/+$/, "");

  const host = headers.get("x-forwarded-host") ?? headers.get("host") ?? "localhost:3000";
  const proto = headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
